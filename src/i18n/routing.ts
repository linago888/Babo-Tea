import { defineRouting } from "next-intl/routing";

/**
 * 站台支援的 locale 與路由策略。對應 data-model.md §6。
 *
 * 設計原則（國際市場優先）：
 * - defaultLocale = 'en'：未指定 locale 時的對外預設語言；SEO 流量入口
 * - localePrefix = 'always'：每個 URL 都帶 locale 前綴（如 /en/brands, /zh-TW/brands）
 *   1. SEO 清楚分流，不會因為 Accept-Language 而對同一 URL 出兩種內容
 *   2. 分享連結不會因接收者瀏覽器設定而看到不同語言
 *   3. 對 hreflang / canonical 友善
 * - 真正的「自動偵測」交給 proxy.ts：對沒 locale 前綴的 URL 做 redirect，
 *   依 geo + Accept-Language + cookie 挑最適 locale
 *
 * 新增 locale 流程：
 *   1. 在 locales[] 加入 BCP-47 code
 *   2. messages/ 加對應 JSON
 *   3. localeMetadata 加 native name
 *   4. （可選）countryToLocale 加國家對應
 *   5. data-model.md §6.2 同步更新
 */
export const routing = defineRouting({
  locales: ["en", "zh-TW", "zh-CN", "ja"] as const,
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/**
 * 每個 locale 的人類可讀資料：
 * - nativeName：給 UI 切換器顯示（原文）
 * - englishName：給 SEO / hreflang 說明
 * - bcp47：完整 BCP-47 標籤（hreflang 與 <html lang="..."> 用同一個）
 * - direction：之後支援阿拉伯 / 希伯來時改 'rtl'
 */
export const localeMetadata: Record<
  Locale,
  {
    nativeName: string;
    englishName: string;
    bcp47: string;
    direction: "ltr" | "rtl";
  }
> = {
  en: { nativeName: "English", englishName: "English", bcp47: "en", direction: "ltr" },
  "zh-TW": { nativeName: "繁體中文", englishName: "Traditional Chinese", bcp47: "zh-TW", direction: "ltr" },
  "zh-CN": { nativeName: "简体中文", englishName: "Simplified Chinese", bcp47: "zh-CN", direction: "ltr" },
  ja: { nativeName: "日本語", englishName: "Japanese", bcp47: "ja", direction: "ltr" },
};

/**
 * 國家 → 偏好 locale 映射（IP geo 偵測用，Vercel x-vercel-ip-country header）。
 * 對應不到時走 Accept-Language → defaultLocale 的 fallback chain（見 proxy.ts）。
 *
 * 設計考量：
 * - 新加坡、馬來西亞華人圈廣泛使用簡體 → zh-CN
 * - 香港、澳門使用繁體 → zh-TW
 * - 中國大陸用簡體 → zh-CN
 * - 韓國、東南亞非華語區、歐美 → 先 fallback 到 en，之後加 ko / vi / th / ... 再補
 */
export const countryToLocale: Record<string, Locale> = {
  TW: "zh-TW",
  HK: "zh-TW",
  MO: "zh-TW",
  CN: "zh-CN",
  SG: "zh-CN",
  MY: "zh-CN",
  JP: "ja",
};
