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
