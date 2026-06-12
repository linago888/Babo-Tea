/**
 * Phase 5E — 新聞爬文 helper
 *
 * 設計目的：給定一個外部新聞文章 URL，後端 fetch + 抽取 OG metadata + 主要內文，
 * 給編輯的 NewsForm 一鍵填好欄位。
 *
 * 不依賴 jsdom / cheerio / readability —— 只用 regex 抽 OG meta、用簡單正則去 HTML
 * tag 取純文字，主要 article body 解析交給 LLM（既然我們已經有 OpenAI 整合）。
 *
 * 安全：
 *   - 只接受 http(s) URL；拒絕 file:// 等
 *   - 拒絕私有 IP（避免 SSRF 攻 internal 服務）
 *   - 10s timeout、5 MB 上限
 *   - 自訂 User-Agent 標明自己是誰
 */

const USER_AGENT =
  "Global Boba Graph Bot/1.0 (+https://babo-tea.vercel.app/about/bot)";
const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 5 * 1024 * 1024;

export interface CrawlResult {
  url: string;
  finalUrl: string;
  domain: string;
  title: string;
  description: string;
  imageUrl: string | null;
  publishedAt: string | null; // ISO if available
  detectedLang: string | null; // BCP-47, e.g. "ja", "zh-TW"
  bodyText: string; // 內文（markdown），含內嵌的 ![](圖片) ，max 8000 chars
  bodyImages: string[]; // 文章內文中的圖片（絕對 URL，已過濾 logo/icon）
  siteName: string | null;
}

function isPrivateIp(hostname: string): boolean {
  // 簡易 SSRF 防護：擋 localhost / private IP ranges
  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
  ];
  if (blocked.includes(hostname.toLowerCase())) return true;
  // 10.x.x.x / 192.168.x.x / 172.16-31.x.x
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;
  // IPv6 link-local
  if (/^fe80:/i.test(hostname)) return true;
  return false;
}

export function validateUrl(raw: string): URL | { error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "Invalid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: `Unsupported protocol: ${url.protocol}` };
  }
  if (isPrivateIp(url.hostname)) {
    return { error: "Private / localhost URLs are blocked" };
  }
  return url;
}

/**
 * 從單一 HTML tag 抽出某屬性的值，相容三種寫法：
 *   attr="v"  /  attr='v'  /  attr=v （無引號，值到空白或 > 為止）
 * 例：Gannett / USA Today 系統會輸出 <meta property=og:image content="...">
 *     （property 的值沒有引號），舊版寫死引號的 regex 完全抓不到。
 */
function attrValue(tag: string, attr: string): string | null {
  const m = tag.match(
    new RegExp(`\\b${escapeRegex(attr)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"),
  );
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

/**
 * 抽 <meta property="og:xxx"> / <meta name="xxx"> / <meta itemprop="xxx"> 的 content。
 * 逐一掃過所有 <meta> tag，用 attrValue 解析 — 屬性順序、引號有無都不影響。
 */
function extractMeta(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const lowerKey = key.toLowerCase();
  for (const tag of tags) {
    const prop =
      attrValue(tag, "property") ?? attrValue(tag, "name") ?? attrValue(tag, "itemprop");
    if (prop && prop.toLowerCase() === lowerKey) {
      const content = attrValue(tag, "content");
      if (content) return decodeHtmlEntities(content);
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractTitle(html: string): string | null {
  const og = extractMeta(html, "og:title");
  if (og) return og;
  const twitter = extractMeta(html, "twitter:title");
  if (twitter) return twitter;
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return t ? decodeHtmlEntities(t[1].trim()) : null;
}

function extractDescription(html: string): string {
  return (
    extractMeta(html, "og:description") ??
    extractMeta(html, "twitter:description") ??
    extractMeta(html, "description") ??
    ""
  );
}

function extractImage(html: string, base: URL): string | null {
  const url =
    extractMeta(html, "og:image:secure_url") ??
    extractMeta(html, "og:image") ??
    extractMeta(html, "twitter:image") ??
    extractMeta(html, "twitter:image:src");
  if (!url) return null;
  // resolve relative URL
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

function extractPublishedAt(html: string): string | null {
  const candidates = [
    extractMeta(html, "article:published_time"),
    extractMeta(html, "og:article:published_time"),
    extractMeta(html, "datePublished"),
    extractMeta(html, "publishdate"),
    extractMeta(html, "pubdate"),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  // 第二選擇：抓 <time datetime="...">
  const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
  if (timeMatch) {
    const d = new Date(timeMatch[1]);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function extractLang(html: string): string | null {
  // <html lang="ja"> / <html lang="zh-TW">
  const m = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  if (m) {
    const lang = m[1].trim();
    // 正規化
    if (/^zh.?HK/i.test(lang) || /^zh.?TW/i.test(lang)) return "zh-TW";
    if (/^zh.?CN/i.test(lang) || /^zh.?Hans/i.test(lang)) return "zh-CN";
    if (/^zh/i.test(lang)) return "zh-TW"; // 預設繁體
    if (/^ja/i.test(lang)) return "ja";
    if (/^en/i.test(lang)) return "en";
    return lang;
  }
  return null;
}

function extractSiteName(html: string): string | null {
  return extractMeta(html, "og:site_name") ?? extractMeta(html, "application-name");
}

/** 抓主體（盡量），優先順序：<article>、<main>、<body> */
function selectArticleRegion(html: string): string {
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return article?.[1] ?? main?.[1] ?? body?.[1] ?? html;
}

/** 移除 script / style / svg / nav / footer / aside / header / form 雜訊 */
function cleanRegion(region: string): string {
  return region
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");
}

/**
 * 圖片 URL 檔名雜訊關鍵字 — logo / icon / 社群分享 / 介面元素等不是文章內容圖。
 * 注意：廣告比對用 \bads?[-_/] 加 word boundary，否則會誤殺 WordPress
 *       最常見的內容圖路徑 /wp-content/uploads/（"upl-ads/" 含 "ads/"）。
 */
const IMG_NOISE =
  /(logo|icon|ico_|avatar|sprite|spacer|blank|pixel|1x1|placeholder|loading|emoji|favicon|hamburger|menu|btn|button|badge|share|sns[_-]|gravatar|\bads?[-_/]|banner_)/i;

/**
 * 圖片 URL 路徑雜訊 — 在 theme / assets / common / static 等樣板目錄下的圖
 * 幾乎都是站台 UI 素材（社群 icon、按鈕…），不是文章內容圖。
 * 例：lmaga 的分享 icon 在 /wp-content/themes/lmaga/img/common/ 下。
 */
const IMG_PATH_NOISE = /\/(themes?|assets?|common|static|plugins?|skin|_next|sprites?|widgets?)\//i;

/**
 * 從單一 <img> tag 抽出最合適的圖片來源。
 * 優先 lazy-load 屬性（data-src 等），其次 src，最後 srcset 取最大張。
 * 跳過 data: URI（base64 placeholder）。
 */
function pickImgSrc(tag: string): string | null {
  for (const attr of ["data-src", "data-original", "data-lazy-src", "data-lazy", "data-echo", "data-img"]) {
    const v = attrValue(tag, attr);
    if (v && !/^data:/i.test(v)) return v;
  }
  const src = attrValue(tag, "src");
  if (src && !/^data:/i.test(src)) return src;
  const ss = attrValue(tag, "srcset");
  if (ss) {
    const cands = ss
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (cands.length) return cands[cands.length - 1];
  }
  return null;
}

/** 把 raw src 轉成絕對 URL，過濾掉 svg / 介面雜訊圖；不合格回 null */
function toContentImageUrl(rawSrc: string, base: URL): string | null {
  let abs: string;
  try {
    abs = new URL(rawSrc, base).toString();
  } catch {
    return null;
  }
  if (!/^https?:/i.test(abs)) return null;
  if (/\.svg(\?|$)/i.test(abs)) return null;
  if (IMG_PATH_NOISE.test(new URL(abs).pathname)) return null;
  if (IMG_NOISE.test(abs)) return null;
  return abs;
}

/** 從清理後的 article 區塊收集內文圖片（絕對 URL、去重、過濾雜訊） */
function extractBodyImages(cleanedRegion: string, base: URL, max = 10): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const tags = cleanedRegion.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const src = pickImgSrc(tag);
    if (!src) continue;
    const abs = toContentImageUrl(src, base);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    out.push(abs);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 把清理後的 article 區塊轉成 markdown 文字，內文圖片就地保留成 ![alt](url)。
 * 先把 <img> 換成 markdown 圖片語法，再把 block tag 換行、剝掉其餘 tag。
 */
function regionToMarkdown(cleanedRegion: string, base: URL, maxChars: number): string {
  const withImages = cleanedRegion.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = pickImgSrc(tag);
    if (!src) return "";
    const abs = toContentImageUrl(src, base);
    if (!abs) return "";
    const alt = (tag.match(/\balt=["']([^"']*)["']/i)?.[1] || "").trim();
    return `\n\n![${alt}](${abs})\n\n`;
  });

  const text = withImages
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => decodeHtmlEntities(line.trim()))
    .filter((line) => line.length > 0)
    .join("\n");

  return text.slice(0, maxChars);
}

export async function crawlUrl(rawUrl: string): Promise<CrawlResult> {
  const validated = validateUrl(rawUrl);
  if ("error" in validated) {
    throw new Error(validated.error);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(validated.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en,zh;q=0.9,ja;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Fetch timeout (10s)");
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Source returned HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("xml")) {
    throw new Error(`Unsupported content-type: ${contentType}`);
  }

  // Read body with size cap
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        try { await reader.cancel(); } catch { /* noop */ }
        throw new Error(`Source too large (> ${MAX_BYTES / 1024 / 1024} MB)`);
      }
      chunks.push(value);
    }
  }
  const buf = Buffer.concat(chunks);
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  const finalUrlObj = new URL(res.url);
  const title = extractTitle(html) ?? "";
  const description = extractDescription(html);
  const publishedAt = extractPublishedAt(html);
  const detectedLang = extractLang(html);
  const siteName = extractSiteName(html);

  // 內文：選 article 區塊 → 清雜訊 → 收集內文圖片 + 轉 markdown（保留內嵌圖片）
  const region = selectArticleRegion(html);
  const cleaned = cleanRegion(region);
  const bodyImages = extractBodyImages(cleaned, finalUrlObj);
  const bodyText = regionToMarkdown(cleaned, finalUrlObj, 8000);

  // 主圖：og:image / twitter:image 優先；沒有就用內文第一張圖（修 lmaga 這種無 og:image 的站）
  let imageUrl = extractImage(html, finalUrlObj);
  if (!imageUrl && bodyImages.length > 0) imageUrl = bodyImages[0];

  return {
    url: validated.toString(),
    finalUrl: res.url,
    domain: finalUrlObj.hostname.replace(/^www\./, ""),
    title,
    description,
    imageUrl,
    publishedAt,
    detectedLang,
    bodyText,
    bodyImages,
    siteName,
  };
}
