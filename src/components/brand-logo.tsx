import Image from "next/image";

import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";

interface BrandLogoProps {
  /** 品牌 slug，作為決定 monogram 顏色的 stable seed */
  slug: string;
  /** brand.nameI18n — 用來取 monogram 字符（locale 友善：英文首字、中文首字、日文首字） */
  nameI18n: unknown;
  /** brand.logoUrl — 有值就用真實圖檔，否則 fallback monogram */
  logoUrl?: string | null;
  /** 當前 locale，用來決定 monogram 字符 */
  locale: Locale;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { box: "size-8", text: "text-xs", px: 32 },
  md: { box: "size-12", text: "text-base", px: 48 },
  lg: { box: "size-20", text: "text-2xl", px: 80 },
} as const;

/**
 * 8 色 palette — 暖色 + 飽滿，呼應珍奶調性，避開過於鮮豔的螢光色
 * （HSL 統一 saturation 55-65%、lightness 45-55% 確保 dark mode 也清楚）
 */
const PALETTE = [
  { bg: "bg-amber-600 dark:bg-amber-700", text: "text-white" },
  { bg: "bg-rose-600 dark:bg-rose-700", text: "text-white" },
  { bg: "bg-emerald-700 dark:bg-emerald-800", text: "text-white" },
  { bg: "bg-sky-700 dark:bg-sky-800", text: "text-white" },
  { bg: "bg-indigo-700 dark:bg-indigo-800", text: "text-white" },
  { bg: "bg-fuchsia-700 dark:bg-fuchsia-800", text: "text-white" },
  { bg: "bg-stone-700 dark:bg-stone-800", text: "text-amber-100" },
  { bg: "bg-orange-700 dark:bg-orange-800", text: "text-white" },
];

function hashSlug(slug: string): number {
  // FNV-1a 32bit — 同一 slug 一定得到同一色，跨 SSR/CSR 一致
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function pickMonogramChar(name: string, locale: Locale): string {
  if (!name) return "?";
  // 拉丁：取首字大寫；CJK / 其他：取第一個字符（Array.from 處理 surrogate pair）
  if (locale === "en") {
    // 英文取首字母
    const m = name.match(/[A-Za-z]/);
    return (m?.[0] ?? name[0]).toUpperCase();
  }
  // 中文 / 日文 / 其他：取第一個字符
  const chars = Array.from(name);
  return chars[0] ?? "?";
}

/**
 * Brand logo component — 有 logoUrl 用真圖，沒有 fallback 到 deterministic monogram。
 * 用 <span> 而非 <img> 包裹，當 host context 已有 <Link> 時 a11y 不會出狀況。
 */
export function BrandLogo({
  slug,
  nameI18n,
  logoUrl,
  locale,
  size = "md",
  className = "",
}: BrandLogoProps) {
  const sz = SIZES[size];
  const altName = pickI18n(nameI18n, locale, { fallback: slug });

  if (logoUrl) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 ${sz.box} ${className}`}
        aria-hidden="true"
      >
        <Image
          src={logoUrl}
          alt=""
          width={sz.px}
          height={sz.px}
          className="size-full object-contain"
        />
      </span>
    );
  }

  // monogram fallback
  const palette = PALETTE[hashSlug(slug) % PALETTE.length];
  const char = pickMonogramChar(altName, locale);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase ${palette.bg} ${palette.text} ${sz.box} ${sz.text} ${className}`}
      aria-hidden="true"
      title={altName}
    >
      {char}
    </span>
  );
}
