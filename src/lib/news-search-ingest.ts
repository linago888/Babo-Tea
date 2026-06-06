/**
 * Phase 5H — Google News 搜尋爬取 ingest service
 *
 * 對一筆 NewsSearchQuery：
 *   1. 用 query / locale / countryCode 組 Google News RSS URL
 *   2. fetchRssFeed 拿 items（含 <source url> 標籤 = 原始發布者）
 *   3. 對每個 item:
 *      a. 用 publisherUrl 的 domain 找 / 自動建 Source（auto-create stub source）
 *      b. dedupe by news.source_url（Google News redirect URL 永遠唯一）
 *      c. 嘗試 crawlUrl(item.link) — 會 follow Google News redirect 拿到原文 HTML
 *         若失敗（被擋、SPA、需 JS），降級用 RSS title/description 建 stub News
 *      d. 建 News 為 status=DRAFT
 *   4. 更新 query.last_crawled_at
 *
 * 自動建 source 規則：
 *   - 找：prisma.source.findUnique by domain
 *   - 沒有就建：slug 由 domain 推；nameI18n 從 RSS publisherName；
 *     status=DRAFT；primaryLanguage=query.locale；countryCode=query.countryCode
 *   - 編輯之後可手動補 credibilityScore / kind / 翻譯
 */
import { scoreNews } from "@/lib/content-quality/completeness";
import { buildGoogleNewsRssUrl, normalizeDomain, slugFromDomain } from "@/lib/google-news";
import { crawlUrl } from "@/lib/news-crawler";
import { prisma } from "@/lib/prisma";
import { fetchRssFeed, type RssItem } from "@/lib/rss-parser";
import { routing } from "@/i18n/routing";

export interface SearchIngestSummary {
  queryId: string;
  queryLabel: string;
  itemsInFeed: number;
  created: number;
  skipped: number;
  sourcesAutoCreated: number;
  errors: Array<{ url: string; message: string }>;
}

/** 找或自動建 source — 回傳 sourceId */
async function findOrCreateSource(
  publisherUrl: string,
  publisherName: string | undefined,
  primaryLanguage: string,
  countryCode: string | null,
): Promise<{ id: string; autoCreated: boolean }> {
  const domain = normalizeDomain(publisherUrl);
  if (!domain) throw new Error(`Could not derive domain from ${publisherUrl}`);

  const existing = await prisma.source.findUnique({
    where: { domain },
    select: { id: true },
  });
  if (existing) return { id: existing.id, autoCreated: false };

  // 自動建 stub source
  const baseSlug = slugFromDomain(domain) || "auto-source";
  let slug = baseSlug;
  let suffix = 1;
  // ensure unique slug
  while (suffix < 50) {
    const slugTaken = await prisma.source.findUnique({ where: { slug } });
    if (!slugTaken) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const nameI18n: Record<string, string> = {};
  const displayName = publisherName?.trim() || domain;
  // 把名字塞到查詢的 locale，編輯之後可補其他 locale
  const supportedLocales = routing.locales as readonly string[];
  const lc = supportedLocales.includes(primaryLanguage)
    ? primaryLanguage
    : routing.defaultLocale;
  nameI18n[lc] = displayName;

  const created = await prisma.source.create({
    data: {
      slug,
      domain,
      nameI18n: nameI18n as never,
      primaryLanguage: lc,
      countryCode: countryCode || null,
      kind: "MAINSTREAM_MEDIA", // 預設；編輯可改
      status: "DRAFT", // 編輯審稿後改 PUBLISHED
      notes: `Auto-created by Google News search ingest at ${new Date().toISOString()}`,
    },
    select: { id: true },
  });

  return { id: created.id, autoCreated: true };
}

function slugifyForNews(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function ensureUniqueNewsSlug(base: string): Promise<string> {
  let slug = base || `article-${Date.now().toString(36)}`;
  let suffix = 1;
  while (suffix < 50) {
    const exists = await prisma.news.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function bodyTextToMarkdown(text: string): string {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n\n");
}

/**
 * Google News title 通常是 "Article title - Publisher Name"。去掉尾巴。
 */
function cleanGoogleNewsTitle(raw: string, publisherName?: string): string {
  if (!raw) return raw;
  let title = raw.trim();
  if (publisherName) {
    const escaped = publisherName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 結尾常見格式：" - Publisher Name" / " | Publisher"
    title = title.replace(new RegExp(`\\s+[-|]\\s+${escaped}\\s*$`, "i"), "");
  }
  return title.trim();
}

async function processItem(
  item: RssItem,
  query: { id: string; locale: string; countryCode: string | null },
  summary: SearchIngestSummary,
): Promise<void> {
  // Google News item 一定有 link（redirect URL）；publisherUrl 在 <source url>
  if (!item.publisherUrl) {
    summary.errors.push({
      url: item.link,
      message: "RSS item missing <source url> — non-Google-News feed?",
    });
    return;
  }

  // dedupe by sourceUrl (= Google News redirect URL — 對同一查詢每篇文章唯一)
  const existing = await prisma.news.findFirst({
    where: { sourceUrl: item.link },
    select: { id: true },
  });
  if (existing) {
    summary.skipped += 1;
    return;
  }

  // 找/建 source
  const { id: sourceId, autoCreated } = await findOrCreateSource(
    item.publisherUrl,
    item.publisherName,
    query.locale,
    query.countryCode,
  );
  if (autoCreated) summary.sourcesAutoCreated += 1;

  // 嘗試爬內文 — Google News URL 會 redirect 到 publisher 原文
  let titleText = cleanGoogleNewsTitle(item.title ?? "", item.publisherName);
  let summaryText = "";
  let bodyMd = "";
  let heroImageUrl: string | null = null;
  let finalUrl = item.link;
  try {
    const crawl = await crawlUrl(item.link);
    finalUrl = crawl.finalUrl;
    if (crawl.title) titleText = cleanGoogleNewsTitle(crawl.title, item.publisherName);
    summaryText = crawl.description || "";
    bodyMd = bodyTextToMarkdown(crawl.bodyText);
    heroImageUrl = crawl.imageUrl;
  } catch (err) {
    // 爬不到 — 用 RSS 本身的資訊建 stub。不算錯誤，編輯可手動補。
    summaryText = item.title ?? "";
    bodyMd = ""; // 留空
    void err;
  }

  if (!titleText) titleText = item.publisherName ?? "Untitled";

  // i18n：丟到 query.locale；其他 locale 用 ✨ AI 補完按鈕填
  const supportedLocales = routing.locales as readonly string[];
  const lc = supportedLocales.includes(query.locale) ? query.locale : routing.defaultLocale;
  const titleI18n: Record<string, string> = { [lc]: titleText.slice(0, 200) };
  const summaryI18n: Record<string, string> = { [lc]: summaryText.slice(0, 500) };
  const bodyI18n: Record<string, string> = bodyMd ? { [lc]: bodyMd } : {};

  const publishedAt = item.publishedAt ? new Date(item.publishedAt) : new Date();
  const slugBase = slugifyForNews(titleText);
  const slug = await ensureUniqueNewsSlug(slugBase);

  const { score } = scoreNews({
    titleI18n,
    summaryI18n,
    bodyI18n,
    seoI18n: null,
    heroImageUrl,
    editorTags: ["google-news-ingest"],
    sourceUrl: finalUrl,
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
      category: "TREND",
      sourceId,
      // 故意存 Google News redirect URL（item.link）— 比 finalUrl 對 dedupe 友善
      sourceUrl: item.link,
      publishedAt,
      heroImageUrl,
      editorTags: ["google-news-ingest"],
      status: "DRAFT",
      completenessScore: score,
    },
  });

  summary.created += 1;
}

export async function ingestSearchQuery(queryId: string): Promise<SearchIngestSummary> {
  const q = await prisma.newsSearchQuery.findUnique({ where: { id: queryId } });
  if (!q) throw new Error("Query not found");

  const summary: SearchIngestSummary = {
    queryId: q.id,
    queryLabel: q.label,
    itemsInFeed: 0,
    created: 0,
    skipped: 0,
    sourcesAutoCreated: 0,
    errors: [],
  };

  const url = buildGoogleNewsRssUrl({
    query: q.query,
    locale: q.locale,
    countryCode: q.countryCode,
  });

  let items;
  try {
    items = await fetchRssFeed(url);
  } catch (err) {
    throw new Error(`Failed to fetch Google News feed: ${err instanceof Error ? err.message : "unknown"}`);
  }
  summary.itemsInFeed = items.length;

  for (const item of items) {
    try {
      await processItem(item, q, summary);
    } catch (err) {
      summary.errors.push({
        url: item.link,
        message: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  await prisma.newsSearchQuery.update({
    where: { id: q.id },
    data: { lastCrawledAt: new Date() },
  });

  return summary;
}

export async function ingestAllEnabledQueries(): Promise<SearchIngestSummary[]> {
  const queries = await prisma.newsSearchQuery.findMany({
    where: { enabled: true },
    select: { id: true, label: true },
  });
  const out: SearchIngestSummary[] = [];
  for (const q of queries) {
    try {
      out.push(await ingestSearchQuery(q.id));
    } catch (err) {
      out.push({
        queryId: q.id,
        queryLabel: q.label,
        itemsInFeed: 0,
        created: 0,
        skipped: 0,
        sourcesAutoCreated: 0,
        errors: [{ url: "(feed)", message: err instanceof Error ? err.message : "Unknown" }],
      });
    }
  }
  return out;
}
