/**
 * Google News sitemap — 對應 https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 *
 * 規則：
 * - 只列過去 2 天內發布的新聞
 * - 包含 news:publication_date / news:title / news:language
 * - publication_name 用我們站名
 */
import { routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-static";
export const revalidate = 600;

const SITE_NAME = "Global Boba Graph";

export async function GET() {
  const twoDaysAgo = new Date();
  twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

  const news = await prisma.news.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: twoDaysAgo },
    },
    select: {
      slug: true,
      titleI18n: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  const urls = news
    .map((n) => {
      // 對每個 locale 各列一筆（Google News 接受 multi-locale）
      return routing.locales
        .map((loc) => {
          const title = pickI18n(n.titleI18n, loc);
          if (!title) return "";
          const escaped = title
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
          return `  <url>
    <loc>${SITE_URL}/${loc}/news/${n.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
        <news:language>${loc}</news:language>
      </news:publication>
      <news:publication_date>${n.publishedAt.toISOString()}</news:publication_date>
      <news:title>${escaped}</news:title>
    </news:news>
  </url>`;
        })
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
