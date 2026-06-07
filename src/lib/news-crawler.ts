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
  bodyText: string; // plain text, max 8000 chars
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

/** 抽 <meta property="og:xxx"> 或 <meta name="xxx"> 或 <meta itemprop="xxx"> */
function extractMeta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta\\s+[^>]*property=["']${escapeRegex(key)}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${escapeRegex(key)}["']`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*name=["']${escapeRegex(key)}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${escapeRegex(key)}["']`,
      "i",
    ),
    new RegExp(
      `<meta\\s+[^>]*itemprop=["']${escapeRegex(key)}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeHtmlEntities(m[1]);
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

function stripHtmlToText(html: string, maxChars: number): string {
  // 抓主體（盡量），優先順序：<article>、<main>、<body>
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const region = article?.[1] ?? main?.[1] ?? body?.[1] ?? html;

  // 移除 script / style / svg / nav / footer / aside
  const cleaned = region
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  // 段落保留換行
  const text = cleaned
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
  const imageUrl = extractImage(html, finalUrlObj);
  const publishedAt = extractPublishedAt(html);
  const detectedLang = extractLang(html);
  const siteName = extractSiteName(html);
  const bodyText = stripHtmlToText(html, 8000);

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
    siteName,
  };
}
