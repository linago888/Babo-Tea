/**
 * Admin 介面 i18n — 沿用網站既有 next-intl 機制
 *
 * 設計：
 * - admin 路徑（/admin/*）沒有 locale 前綴
 * - 從 NEXT_LOCALE cookie 取編輯偏好的 locale；未設則 fallback 到 zh-TW
 *   （編輯團隊本地化的 default，不同於對外網站 default=en）
 * - admin.* messages namespace 與其他 namespace 平行
 */
import { cookies } from "next/headers";

import { routing, type Locale } from "@/i18n/routing";

const ADMIN_DEFAULT_LOCALE: Locale = "zh-TW";
const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * 從 cookie 解析 admin 應顯示的 locale。
 * 若 cookie 值不在支援清單，回 admin default (zh-TW)。
 */
export async function getAdminLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  if (value && (routing.locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return ADMIN_DEFAULT_LOCALE;
}
