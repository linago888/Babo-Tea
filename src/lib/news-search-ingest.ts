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
import {
  buildGoogleNewsRssUrl,
  normalizeDomain,
  resolveGoogleNewsArticleUrl,
  slugFromDomain,
} from "@/lib/google-news";
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
  truncated?: boolean; // 達到 per-query 上限提前停
}

/** 每個 query 最多處理幾篇 — 避免單個 query 就吃光 function 時間 */
const MAX_ITEMS_PER_QUERY = 15;
/** 整個 ingest 用的全域 budget（秒）— 接近 Vercel maxDuration 時提前收手 */
const GLOBAL_BUDGET_MS = 50_000;

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
 * Google News title 常見有兩種尾綴要去掉：
 *   1. " - Publisher Name"（從 RSS <source> 抽到的 publisher）
 *   2. " - Google News" / "- Google ニュース" / 各語系變體
 * 分隔符可能是 - – — | · 任一種。
 */
const GOOGLE_NEWS_ALIASES = [
  "Google News",
  "Google ニュース",
  "Google 新聞",
  "Google 新闻",
  "谷歌新闻",
];

function cleanGoogleNewsTitle(raw: string, publisherName?: string): string {
  if (!raw) return raw;
  let title = raw.trim();

  const tryStrip = (name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\s+[-–—|·]+\\s*${escaped}\\s*$`, "i");
    title = title.replace(re, "").trim();
  };

  // 先去 publisher
  if (publisherName) tryStrip(publisherName);
  // 再去 Google News 各語系變體（即使 publisher 設成 Google News 也會被擋下）
  for (const alias of GOOGLE_NEWS_ALIASES) tryStrip(alias);

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

  // 解析 Google News obfuscated URL → 真實 publisher 文章 URL
  // 1. base64 path 解碼（舊格式）
  // 2. HTTP fetch + parse HTML（新格式）
  // 3. 全失敗 → 不爬文（避免抓到 Google News 中介頁拿到 "Google News" 當 title）
  const articleUrl = await resolveGoogleNewsArticleUrl(item.link);

  // dedupe — 同時檢查解析後 URL 與原 Google News URL
  const dedupeUrls = [item.link, ...(articleUrl && articleUrl !== item.link ? [articleUrl] : [])];
  const existing = await prisma.news.findFirst({
    where: { sourceUrl: { in: dedupeUrls } },
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

  let titleText = cleanGoogleNewsTitle(item.title ?? "", item.publisherName);
  let summaryText = "";
  let bodyMd = "";
  let heroImageUrl: string | null = null;
  // sourceUrl 優先順序：解析後的真實文章 URL > Google News URL（瀏覽器點下去會 redirect）
  // 不再 fallback 到 publisher domain root — 那個對使用者沒意義
  let finalUrl = articleUrl ?? item.link;

  if (articleUrl) {
    // 解析成功 → 爬真實文章
    try {
      const crawl = await crawlUrl(articleUrl);
      finalUrl = crawl.finalUrl;
      if (crawl.title) titleText = cleanGoogleNewsTitle(crawl.title, item.publisherName);
      summaryText = crawl.description || "";
      bodyMd = bodyTextToMarkdown(crawl.bodyText);
      heroImageUrl = crawl.imageUrl;
    } catch {
      // 爬不到（站方擋 / SPA / timeout）— 用 RSS 的 title 建 stub
      summaryText = "";
    }
  }
  // else: 解析失敗 → sourceUrl 用 Google News URL 保留可點擊性，body 留空編輯手動補

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
      // 存解碼後的真實 publisher URL — 對外顯示「原文連結」會跳直接的 publisher 文章
      sourceUrl: finalUrl,
      publishedAt,
      heroImageUrl,
      editorTags: ["google-news-ingest"],
      status: "DRAFT",
      completenessScore: score,
    },
  });

  summary.created += 1;
}

export async function ingestSearchQuery(
  queryId: string,
  options: { startedAt?: number; maxItems?: number } = {},
): Promise<SearchIngestSummary> {
  const startedAt = options.startedAt ?? Date.now();
  const maxItems = options.maxItems ?? MAX_ITEMS_PER_QUERY;
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

  let processed = 0;
  for (const item of items) {
    if (processed >= maxItems) {
      summary.truncated = true;
      break;
    }
    if (Date.now() - startedAt > GLOBAL_BUDGET_MS) {
      summary.truncated = true;
      break;
    }
    try {
      await processItem(item, q, summary);
    } catch (err) {
      summary.errors.push({
        url: item.link,
        message: err instanceof Error ? err.message : "Unknown",
      });
    }
    processed += 1;
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
  const startedAt = Date.now();
  const out: SearchIngestSummary[] = [];
  for (const q of queries) {
    if (Date.now() - startedAt > GLOBAL_BUDGET_MS) {
      // 超過全域預算，剩下的查詢標 truncated 跳過
      out.push({
        queryId: q.id,
        queryLabel: q.label,
        itemsInFeed: 0,
        created: 0,
        skipped: 0,
        sourcesAutoCreated: 0,
        errors: [],
        truncated: true,
      });
      continue;
    }
    try {
      out.push(await ingestSearchQuery(q.id, { startedAt }));
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
