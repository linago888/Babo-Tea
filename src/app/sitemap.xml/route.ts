/**
 * Sitemap index — 對外暴露 4 個分群 sitemap + news sitemap
 * Google 推薦：每個分群限 50,000 URL；MVP 還很遠，但結構先做好
 */
import { SITE_URL } from "@/lib/metadata";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const sitemaps = [
    `${SITE_URL}/sitemap-brands.xml`,
    `${SITE_URL}/sitemap-cities.xml`,
    `${SITE_URL}/sitemap-drinks.xml`,
    `${SITE_URL}/sitemap-news.xml`,
    `${SITE_URL}/news-sitemap.xml`, // Google News 專用
  ];

  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (loc) => `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
