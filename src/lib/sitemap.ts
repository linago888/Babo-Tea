/**
 * Sitemap helpers — Phase 3
 *
 * 設計：
 * - 每個 entity URL 同時列 4 個 locale alternate（xhtml:link rel="alternate" hreflang）
 *   讓 Google 知道每個 URL 都有對應其它語言版本
 * - x-default 指向預設 locale（en）
 * - sitemap entry 用 zh-TW 那個 URL 當 canonical（或可改成 defaultLocale 那個）
 */
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/metadata";

export interface SitemapEntry {
  slug: string;
  /** Last modification time (ISO 8601). 影響 Google 重抓頻率 */
  lastmod?: string | Date;
  /** changefreq: daily / weekly / monthly */
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** priority 0.0–1.0 */
  priority?: number;
}

/**
 * 為單一實體（指定 slug + 基底 path）產一個 <url> 區塊，
 * 含 4 個 locale 的 hreflang alternates 與 x-default
 */
export function entryWithAlternates({
  slug,
  basePath,
  lastmod,
  changefreq = "weekly",
  priority = 0.7,
}: SitemapEntry & { basePath: string }) {
  const canonical = `${SITE_URL}/${routing.defaultLocale}${basePath}/${slug}`;
  const alternates = routing.locales
    .map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l}${basePath}/${slug}"/>`,
    )
    .join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${routing.defaultLocale}${basePath}/${slug}"/>`;

  const lastmodIso =
    lastmod instanceof Date ? lastmod.toISOString() : lastmod ?? new Date().toISOString();

  return `  <url>
    <loc>${canonical}</loc>
    <lastmod>${lastmodIso}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
${alternates}
${xDefault}
  </url>`;
}

export function wrapUrlset(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;
}

export const sitemapHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
};
