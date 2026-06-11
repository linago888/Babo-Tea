/**
 * Phase 5H — Google News RSS URL builder
 *
 * Google News 提供官方的 RSS 搜尋端點：
 *   https://news.google.com/rss/search?q=<query>&hl=<locale>&gl=<country>&ceid=<country>:<langCode>
 *
 * 參數：
 *   q     — 搜尋字串（URL-encoded）
 *   hl    — UI 語系 (BCP-47)，例 'en'、'zh-TW'、'ja'
 *   gl    — 地理位置 (ISO 3166-1 alpha-2)，例 'US'、'TW'、'JP'
 *   ceid  — 結果語言上下文，格式 'CC:lang'，例 'US:en'、'TW:zh-Hant'
 *
 * 不需 API key，免費；查詢結果是 RSS XML（每個 item 帶 <source url> 標出原 publisher）。
 */
import { GoogleDecoder } from "google-news-url-decoder";

export interface GoogleNewsParams {
  query: string;
  locale: string; // BCP-47 e.g. 'en' / 'zh-TW' / 'ja'
  countryCode?: string | null; // ISO 3166-1 alpha-2 e.g. 'US' / 'TW' / 'JP'
}

/**
 * 把 BCP-47 locale 轉成 Google News ceid 用的 lang code。
 *   zh-TW → zh-Hant
 *   zh-CN → zh-Hans
 *   en    → en
 *   ja    → ja
 */
function toCeidLang(locale: string): string {
  const lc = locale.toLowerCase();
  if (lc === "zh-tw" || lc === "zh-hk") return "zh-Hant";
  if (lc === "zh-cn" || lc === "zh-hans") return "zh-Hans";
  return locale.split("-")[0];
}

/**
 * Locale → 預設國家（沒明確指定 countryCode 時 fallback 用）
 */
function defaultCountry(locale: string): string {
  const lc = locale.toLowerCase();
  if (lc.startsWith("zh-tw") || lc === "zh") return "TW";
  if (lc.startsWith("zh-cn") || lc.startsWith("zh-hans")) return "CN";
  if (lc.startsWith("ja")) return "JP";
  return "US";
}

export function buildGoogleNewsRssUrl({ query, locale, countryCode }: GoogleNewsParams): string {
  const country = (countryCode || defaultCountry(locale)).toUpperCase();
  const ceidLang = toCeidLang(locale);
  const params = new URLSearchParams({
    q: query,
    hl: locale,
    gl: country,
    ceid: `${country}:${ceidLang}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

/**
 * 解碼 Google News 的 obfuscated article URL，拿出真實的 publisher 文章網址。
 *
 * 兩種已知格式：
 *   舊：https://news.google.com/news/url?url=<encoded-real-url>
 *   新：https://news.google.com/rss/articles/CBMi<base64url>...?oc=5
 *
 * 新格式的 base64url payload 是 protobuf 結構，內含 publisher URL。
 * 我們不正規 parse protobuf — 直接 decode bytes 後 grep `https?://`。
 * 已知 prefix bytes：0x08 0x13 0x22 <length> <url>。
 *
 * 對其他 host 直接回傳原 URL 不變。
 *
 * 回傳：解碼後的真實 publisher 文章 URL；若失敗或不是 Google News URL，
 *      回 null。
 */
export function decodeGoogleNewsUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(?:^|\.)news\.google\.com$/.test(parsed.hostname)) return null;

  // 舊格式：/news/url?url=<encoded>
  if (parsed.pathname.endsWith("/url")) {
    const inner = parsed.searchParams.get("url");
    if (inner) {
      try {
        const u = new URL(inner);
        return u.toString();
      } catch {
        return null;
      }
    }
  }

  // 新格式：/rss/articles/CBMi... 或 /articles/CBMi...
  const segments = parsed.pathname.split("/").filter(Boolean);
  const encoded = segments[segments.length - 1];
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  try {
    // base64url（- _ 而非 + /；無 padding）→ base64 with padding
    const b64 = encoded
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const bytes = Buffer.from(b64, "base64");

    // 在 decode 後的 bytes 裡找出 URL：先轉成 latin1 字串再 regex
    // （UTF-8 也可，但 latin1 一字節一字符比較不會切到多 byte 字元中間）
    const text = bytes.toString("latin1");
    const m = text.match(/https?:\/\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%\-]+/);
    if (!m) return null;

    let url = m[0];
    // 修掉常見的尾部噪音字元（protobuf 結構偶會接非 URL 字節後混入）
    url = url.replace(/[<>"`{}|\\^].*$/, "");

    // 驗證可解析
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) return null;
      return u.toString();
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/** 真實瀏覽器 UA — Google 對 bot UA 會回不同（簡化）的中介頁，較難 parse */
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isGoogleHost(hostname: string): boolean {
  return /(?:^|\.)google\.com$/i.test(hostname) || /(?:^|\.)goo\.gl$/i.test(hostname);
}

function safeUrl(value: string, base?: string): string | null {
  try {
    const u = base ? new URL(value, base) : new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * 解碼失敗時的降級方案：實際 fetch Google News URL，從回傳 HTML 抓真實文章 URL。
 *
 * 注意：現代 Google News URL（CBMi 開頭）的 batchexecute 解碼交給
 *      google-news-url-decoder 套件處理（見 resolveGoogleNewsArticleUrl）。
 *      這個 function 只做最後的 HTML scrape 嘗試：
 *        1. server-side redirect 帶我們離開 google.com
 *        2. <link rel="canonical"> / <meta og:url>
 *        3. meta refresh / window.location / <a data-n-au>
 *      實務上這幾條對新格式很少命中（canonical/og:url 多半還是 google），
 *      但對舊格式或某些 article 類型偶爾有用，保留當保險。
 */
async function resolveViaHttp(googleNewsUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(googleNewsUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;

    // 1. server-side redirect 帶我們離開 google
    try {
      if (!isGoogleHost(new URL(res.url).hostname)) return res.url;
    } catch { /* noop */ }

    const html = (await res.text()).slice(0, 300_000);

    // 2. <link rel="canonical" href="..."> 或 <meta property="og:url" content="...">
    const canonical = html.match(
      /<link[^>]*rel=["']canonical["'][^>]*href=["'](https?:\/\/[^"']+)["']/i,
    );
    if (canonical) {
      const u = safeUrl(canonical[1]);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }
    const ogUrl = html.match(
      /<meta[^>]*property=["']og:url["'][^>]*content=["'](https?:\/\/[^"']+)["']/i,
    );
    if (ogUrl) {
      const u = safeUrl(ogUrl[1]);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }

    // 3. meta refresh
    const meta = html.match(
      /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[^"';]*?url=([^"';\s]+)/i,
    );
    if (meta) {
      const u = safeUrl(meta[1], res.url);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }

    // 4. JS window.location redirect
    const winLoc = html.match(
      /window\.location(?:\.href|\.replace\(|\.assign\(|\s*=\s*)["']([^"']+)["']/,
    );
    if (winLoc) {
      const u = safeUrl(winLoc[1], res.url);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }

    // 5. <a href data-n-au>（兩種順序）
    const linkA = html.match(/<a\s+[^>]*?href=["'](https?:\/\/[^"']+)["'][^>]*?data-n-au/i);
    if (linkA) {
      const u = safeUrl(linkA[1]);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }
    const linkB = html.match(/<a\s+[^>]*?data-n-au[^>]*?href=["'](https?:\/\/[^"']+)["']/i);
    if (linkB) {
      const u = safeUrl(linkB[1]);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 解析 Google News URL → 真實 publisher 文章 URL。
 *
 * 1. base64 path 解碼（舊格式 /news/url?url= 還在用）
 * 2. google-news-url-decoder 套件 — 抓 data-n-a-sg/ts + 呼叫 batchexecute RPC
 *    （現代 CBMi 格式唯一可靠方式；套件持續維護追蹤 Google 格式變化）
 * 3. HTML scrape fallback（canonical / og:url / redirect）
 * 4. 全失敗回 null
 */
export async function resolveGoogleNewsArticleUrl(
  googleNewsUrl: string,
): Promise<string | null> {
  // 1. 舊格式快速路徑
  const decoded = decodeGoogleNewsUrl(googleNewsUrl);
  if (decoded) return decoded;

  // 2. 套件：batchexecute 解碼新格式
  try {
    const decoder = new GoogleDecoder();
    const result = await decoder.decode(googleNewsUrl);
    if (result.status && result.decoded_url) {
      const u = safeUrl(result.decoded_url);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }
  } catch {
    /* 套件失敗 → 落到 HTML scrape */
  }

  // 3. HTML scrape fallback
  return resolveViaHttp(googleNewsUrl);
}

/**
 * Google News 的 item.link 是長串的跳轉 URL（base64 編碼的 redirect）。
 * 真實 publisher URL 在 RSS item 的 <source url="..."></source> 標籤。
 * 這個 helper 從一個 hostname 拆出 base domain（去掉 www.）。
 */
export function normalizeDomain(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
  }
}

/**
 * 從 publisher domain 推算合理的 source slug。
 *   foodnavigator-asia.com → foodnavigator-asia
 *   www.nikkei.com         → nikkei
 */
export function slugFromDomain(domain: string): string {
  const clean = normalizeDomain(domain);
  // 去掉 TLD（粗略取最後一個點之前的部分）
  const parts = clean.split(".");
  if (parts.length > 1) parts.pop(); // remove tld
  return parts
    .join("-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
