/**
 * Phase 5F — RSS ingest service
 *
 * 對一個 Source（必須有 rss_feed_url）：
 *   1. fetch + 解析 RSS / Atom
 *   2. 對每個 item.link：
 *      - dedupe：已存在於 news.source_url 就跳過
 *      - 否則跑 crawlUrl（Phase 5E 既有 crawler）抽 OG + 純文字
 *      - 建一筆 News（status=DRAFT），把抽到的內容塞到 source 的 primary_language 那個 locale
 *      - completeness_score 重算
 *   3. 更新 source.last_crawled_at
 *   4. 回 summary：{ created, skipped, errors[] }
 *
 * 重要：不在 ingest 階段呼叫 AI 翻譯。原因：
 *   - RSS 一次可能拉 20-50 篇，全部丟 GPT-4o-mini 成本就上來
 *   - 編輯本來就要逐篇審稿，到時候在編輯頁按 ✨ AI 補完 4 個 locale 比較合理
 *   - 也避免 AI 服務暫時掛了卡住整個 ingest
 *
 * 失敗策略：個別 item 失敗（crawl error / DB write fail）紀錄到 errors[]，不終止整批。
 */
import { scoreNews } from "@/lib/content-quality/completeness";
import { crawlUrl } from "@/lib/news-crawler";
import { prisma } from "@/lib/prisma";
import { fetchRssFeed } from "@/lib/rss-parser";
import { routing } from "@/i18n/routing";

export interface IngestSummary {
  sourceId: string;
  sourceSlug: string;
  itemsInFeed: number;
  created: number;
  skipped: number;
  errors: Array<{ url: string; message: string }>;
}

function slugFromTitleOrUrl(title: string | undefined, url: string): string {
  // 優先用標題；不行用 url path 最後一段
  const base = title?.trim() || new URL(url).pathname.split("/").filter(Boolean).pop() || "article";
  return base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `article-${Date.now()}`;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 1;
  // 最多嘗試 50 次（極端情況）
  while (suffix < 50) {
    const exists = await prisma.news.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  // 還衝突就加 timestamp suffix（一定唯一）
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * 把抽到的純文字 body 套成 Markdown：每段中間留空行
 */
function bodyTextToMarkdown(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n\n");
}

export async function ingestSource(sourceId: string): Promise<IngestSummary> {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      slug: true,
      rssFeedUrl: true,
      primaryLanguage: true,
      domain: true,
    },
  });
  if (!source) throw new Error("Source not found");
  if (!source.rssFeedUrl) throw new Error("Source has no rss_feed_url set");

  const summary: IngestSummary = {
    sourceId: source.id,
    sourceSlug: source.slug,
    itemsInFeed: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };

  let items;
  try {
    items = await fetchRssFeed(source.rssFeedUrl);
  } catch (err) {
    throw new Error(`Failed to fetch RSS: ${err instanceof Error ? err.message : "unknown"}`);
  }
  summary.itemsInFeed = items.length;

  // 把 source.primary_language 正規化到我們支援的 locale 之一
  const supportedLocales = routing.locales as readonly string[];
  const primaryLocale = supportedLocales.includes(source.primaryLanguage)
    ? source.primaryLanguage
    : routing.defaultLocale;

  for (const item of items) {
    try {
      // dedupe：source_url 已存在就跳過
      const existing = await prisma.news.findFirst({
        where: { sourceUrl: item.link, sourceId: source.id },
        select: { id: true },
      });
      if (existing) {
        summary.skipped += 1;
        continue;
      }

      // 走既有 crawler 抽 OG + 內文
      const crawl = await crawlUrl(item.link);

      const titleText = (crawl.title || item.title || "Untitled").slice(0, 200);
      const summaryText = (crawl.description || titleText).slice(0, 500);
      const bodyMd = bodyTextToMarkdown(crawl.bodyText);

      // 建立 i18n 物件：只填 primary locale，其他 locale 留空（編輯之後用 AI 補完按鈕）
      const titleI18n: Record<string, string> = {};
      const summaryI18n: Record<string, string> = {};
      const bodyI18n: Record<string, string> = {};
      titleI18n[primaryLocale] = titleText;
      summaryI18n[primaryLocale] = summaryText;
      bodyI18n[primaryLocale] = bodyMd;

      const publishedAt = item.publishedAt
        ? new Date(item.publishedAt)
        : crawl.publishedAt
          ? new Date(crawl.publishedAt)
          : new Date();

      const slugBase = slugFromTitleOrUrl(titleText, item.link);
      const slug = await ensureUniqueSlug(slugBase);

      const { score } = scoreNews({
        titleI18n,
        summaryI18n,
        bodyI18n,
        seoI18n: null,
        heroImageUrl: crawl.imageUrl,
        editorTags: [],
        sourceUrl: item.link,
        newsBrands: [],
        newsCities: [],
        newsDrinks: [],
      });

      await prisma.news.create({
        data: {
          slug,
          titleI18n: titleI18n as never,
          summaryI18n: summaryI18n as never,
          bodyI18n: bodyI18n as never,
          category: "TREND", // 預設；編輯審稿時改正
          sourceId: source.id,
          sourceUrl: item.link,
          publishedAt,
          heroImageUrl: crawl.imageUrl,
          editorTags: [],
          status: "DRAFT", // 進編輯審稿隊列
          completenessScore: score,
        },
      });

      summary.created += 1;
    } catch (err) {
      summary.errors.push({
        url: item.link,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { lastCrawledAt: new Date() },
  });

  return summary;
}

export async function ingestAllSources(): Promise<IngestSummary[]> {
  const sources = await prisma.source.findMany({
    where: {
      rssFeedUrl: { not: null },
      status: { not: "ARCHIVED" },
    },
    select: { id: true },
  });
  const summaries: IngestSummary[] = [];
  for (const s of sources) {
    try {
      const summary = await ingestSource(s.id);
      summaries.push(summary);
    } catch (err) {
      summaries.push({
        sourceId: s.id,
        sourceSlug: "(load failed)",
        itemsInFeed: 0,
        created: 0,
        skipped: 0,
        errors: [{ url: "(feed)", message: err instanceof Error ? err.message : "Unknown" }],
      });
    }
  }
  return summaries;
}
