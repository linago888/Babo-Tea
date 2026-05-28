import { type Locale, routing } from "@/i18n/routing";

/**
 * 從 jsonb i18n 欄位（{ "zh-TW": "...", "en": "...", ... }）取對應 locale 的字串。
 *
 * Fallback chain：
 *   1. 請求的 locale
 *   2. zh-TW（內容母語，當英文翻譯尚未補上時是最完整的版本）
 *   3. defaultLocale（en）
 *   4. 任一非空值
 *   5. 空字串
 *
 * shape 不正確時不 throw，回空字串 — 避免單筆髒資料整頁炸掉。
 */
export function pickI18n(
  field: unknown,
  locale: Locale,
  options: { fallback?: string } = {},
): string {
  if (!field || typeof field !== "object") return options.fallback ?? "";

  const map = field as Record<string, unknown>;

  // 1. 請求 locale
  const direct = map[locale];
  if (typeof direct === "string" && direct.length > 0) return direct;

  // 2. zh-TW 母語版（多半最完整）
  const native = map["zh-TW"];
  if (typeof native === "string" && native.length > 0) return native;

  // 3. defaultLocale
  if (locale !== routing.defaultLocale) {
    const def = map[routing.defaultLocale];
    if (typeof def === "string" && def.length > 0) return def;
  }

  // 4. 任一可用值
  for (const v of Object.values(map)) {
    if (typeof v === "string" && v.length > 0) return v;
  }

  // 5. 全空
  return options.fallback ?? "";
}

/**
 * 依 locale 取 ISO 3166-1 alpha-2 國家代碼的本地化名稱
 * 使用瀏覽器內建 Intl.DisplayNames
 */
export function localizeCountry(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
