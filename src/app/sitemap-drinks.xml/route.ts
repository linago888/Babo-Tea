import { entryWithAlternates, sitemapHeaders, wrapUrlset } from "@/lib/sitemap";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const drinks = await prisma.drink.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });

  const urls = drinks
    .map((d) =>
      entryWithAlternates({
        slug: d.slug,
        basePath: "/drinks",
        lastmod: d.updatedAt,
        changefreq: "monthly",
        priority: 0.7,
      }),
    )
    .join("\n");

  return new Response(wrapUrlset(urls), { headers: sitemapHeaders });
}
