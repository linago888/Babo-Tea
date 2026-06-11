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
 * 從 Google News URL 路徑抽出 article ID（CBMi... 那段 base64url token）。
 * 這個 ID 是 batchexecute 呼叫需要的參數。
 */
function extractArticleIdFromUrl(googleNewsUrl: string): string | null {
  try {
    const u = new URL(googleNewsUrl);
    const segments = u.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last || !/^[A-Za-z0-9_-]+$/.test(last)) return null;
    if (last.length < 20) return null; // 太短不像合法 article id
    return last;
  } catch {
    return null;
  }
}

/**
 * 從 Google News intermediate page HTML 抽出 batchexecute 用的 signature。
 * 屬性名為 data-n-a-sg，配對 data-n-a-id；少了任一邊都不能呼叫 batchexecute。
 */
function extractSignatureFromHtml(html: string): { signature: string; articleId: string } | null {
  const sig = html.match(/data-n-a-sg=["']([^"']+)["']/);
  const id = html.match(/data-n-a-id=["']([^"']+)["']/);
  if (!sig || !id) return null;
  return { signature: sig[1], articleId: id[1] };
}

/**
 * 呼叫 Google News 內部 batchexecute RPC，把 article id + signature 換成真實 URL。
 *
 * Endpoint: https://news.google.com/_/DotsSplashUi/data/batchexecute
 * RPC ID: Fbv4je
 * 輸入：[[["Fbv4je","[\"garturlreq\", config, signature, articleId, ts]", null, "generic"]]]
 * 回應：)]}'\n + JSON 陣列，第一個 https URL 通常就是真實 publisher URL
 *
 * 這是現代 Google News URL（CBMi 開頭）唯一可靠的解碼方式。
 */
async function callBatchExecute(
  signature: string,
  articleId: string,
): Promise<string | null> {
  const ts = Math.floor(Date.now() / 1000);
  const innerArr = [
    "garturlreq",
    [
      ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    signature,
    articleId,
    ts,
  ];
  const fReq = JSON.stringify([[["Fbv4je", JSON.stringify(innerArr), null, "generic"]]]);
  const body = `f.req=${encodeURIComponent(fReq)}`;

  const reqId = Math.floor(100000 + Math.random() * 900000);
  const url =
    "https://news.google.com/_/DotsSplashUi/data/batchexecute" +
    `?rpcids=Fbv4je&source-path=%2F&f.sid=-1&bl=boq_dotssplashuiserver&hl=en-US&gl=US&soc-app=139&soc-platform=1&soc-device=1&_reqid=${reqId}&rt=c`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        Origin: "https://news.google.com",
        Referer: "https://news.google.com/",
      },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    // 回應前綴是 )]}'\n 然後是 JSON-like 陣列；裡面的真實 URL 用引號跳脫
    // 直接 regex 抓第一個非 google 的 https URL
    const candidates = text.match(/"(https?:[^"\\]+)"/g);
    if (!candidates) return null;
    for (const raw of candidates) {
      const url = raw.slice(1, -1).replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
      try {
        const u = new URL(url);
        if (!isGoogleHost(u.hostname)) return url;
      } catch { /* noop */ }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 解碼失敗時的降級方案：實際 fetch Google News URL，從回傳 HTML 抓真實文章 URL。
 *
 * 流程：
 *   1. fetch intermediate page（真實瀏覽器 UA）
 *   2. 若 server-side redirect 已經帶我們離開 google.com → 直接回傳
 *   3. 從 HTML 抽 data-n-a-sg + data-n-a-id → 呼叫 batchexecute RPC
 *   4. batchexecute 失敗 → fallback 用 HTML scrape（meta refresh / JS redirect / data 屬性）
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

    // 2. 主路：batchexecute RPC（現代 Google News URL 唯一可靠方式）
    const sigData = extractSignatureFromHtml(html);
    if (sigData) {
      const articleId = extractArticleIdFromUrl(googleNewsUrl) ?? sigData.articleId;
      const decoded = await callBatchExecute(sigData.signature, articleId);
      if (decoded) return decoded;
    }

    // 3. fallback：HTML scrape
    // 3a. <link rel="canonical" href="..."> 或 <meta property="og:url" content="...">
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

    // 3b. meta refresh
    const meta = html.match(
      /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[^"';]*?url=([^"';\s]+)/i,
    );
    if (meta) {
      const u = safeUrl(meta[1], res.url);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }

    // 3c. JS window.location redirect
    const winLoc = html.match(
      /window\.location(?:\.href|\.replace\(|\.assign\(|\s*=\s*)["']([^"']+)["']/,
    );
    if (winLoc) {
      const u = safeUrl(winLoc[1], res.url);
      if (u && !isGoogleHost(new URL(u).hostname)) return u;
    }

    // 3d. <a href data-n-au>（兩種順序）
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
 * 1. 先試 base64 path 解碼（舊格式 /news/url?url= 還在用）
 * 2. 失敗就走 HTTP intermediate page → batchexecute RPC（新格式 CBMi...）
 * 3. batchexecute 也敗 → HTML scrape fallback
 * 4. 全失敗回 null
 */
export async function resolveGoogleNewsArticleUrl(
  googleNewsUrl: string,
): Promise<string | null> {
  const decoded = decodeGoogleNewsUrl(googleNewsUrl);
  if (decoded) return decoded;
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
