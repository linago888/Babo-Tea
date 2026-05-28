import type { Locale } from "@/i18n/routing";

/**
 * 統一的 Intl 格式化 helper。所有頁面顯示日期 / 數字 / 貨幣都從這裡取，
 * 避免散落各處用不同 options。
 *
 * 之後若要把 Intl 結果與 react server component 整合得更深，可以再 wrap 成
 * `<FormattedDate value={...} />` 之類元件。
 */

const DEFAULT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
};

const DEFAULT_RELATIVE_OPTS: Intl.RelativeTimeFormatOptions = {
  numeric: "auto",
  style: "long",
};

export function formatDate(
  value: Date | string | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  value: number,
  currency: string,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}

/**
 * 相對時間（如 "3 days ago" / "3 天前" / "3日前"）。
 * 自動找最合適的單位（second / minute / hour / day / week / month / year）。
 */
const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatRelativeTime(
  value: Date | string | number,
  locale: Locale,
  options: Intl.RelativeTimeFormatOptions = DEFAULT_RELATIVE_OPTS,
): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (abs >= ms || unit === "second") {
      const v = Math.round(diff / ms);
      return new Intl.RelativeTimeFormat(locale, options).format(v, unit);
    }
  }
  return "";
}
