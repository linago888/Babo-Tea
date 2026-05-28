/**
 * RSS 2.0 feed — Phase 3
 *
 * 設計：
 * - 預設 locale (en) 為 feed 主要語言；多語 feed 留給日後 /feed.<locale>.xml
 * - 最近 30 篇 published news
 * - 含 enclosure（如果 heroImageUrl 有）
 */
import { routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-static";
export const revalidate = 600;

const SITE_NAME = "Global Boba Graph";
const SITE_DESCRIPTION =
  "Bubble tea brands, cities, drinks and industry news from around the world.";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const locale = routing.defaultLocale;
  const news = await prisma.news.findMany({
    where: { status: "PUBLISHED" },
    include: { source: true },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  const items = news
    .map((n) => {
      const title = pickI18n(n.titleI18n, locale);
      const summary = pickI18n(n.summaryI18n, locale);
      const url = `${SITE_URL}/${locale}/news/${n.slug}`;
      const sourceName = pickI18n(n.source.nameI18n, locale);
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${n.publishedAt.toUTCString()}</pubDate>
      <description>${escapeXml(summary)}</description>
      <source url="${SITE_URL}/${locale}/news">${escapeXml(sourceName)}</source>
${n.heroImageUrl ? `      <enclosure url="${escapeXml(n.heroImageUrl)}" type="image/jpeg"/>\n` : ""}    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}/${locale}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>${locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
