import { entryWithAlternates, sitemapHeaders, wrapUrlset } from "@/lib/sitemap";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-static";
export const revalidate = 600; // 新聞變動快

export async function GET() {
  const news = await prisma.news.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const urls = news
    .map((n) =>
      entryWithAlternates({
        slug: n.slug,
        basePath: "/news",
        lastmod: n.updatedAt ?? n.publishedAt,
        changefreq: "monthly", // 新聞少改，monthly 反而對 Google 友善
        priority: 0.6,
      }),
    )
    .join("\n");

  return new Response(wrapUrlset(urls), { headers: sitemapHeaders });
}
