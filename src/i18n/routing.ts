import { defineRouting } from "next-intl/routing";

/**
 * 站台支援的 locale。對應 data-model.md §6.2。
 * - 預設 zh-TW（中文繁體）
 * - 新增 locale 不需 schema 改動，但需要：
 *   1. 在這裡加入 locales[]
 *   2. 在 messages/ 加對應 JSON
 *   3. 在 data-model.md §6.2 同步更新文件
 */
export const routing = defineRouting({
  locales: ["zh-TW", "zh-CN", "en", "ja"] as const,
  defaultLocale: "zh-TW",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
