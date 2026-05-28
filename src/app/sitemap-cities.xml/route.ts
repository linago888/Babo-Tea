import { entryWithAlternates, sitemapHeaders, wrapUrlset } from "@/lib/sitemap";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const cities = await prisma.city.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });

  const urls = cities
    .map((c) =>
      entryWithAlternates({
        slug: c.slug,
        basePath: "/cities",
        lastmod: c.updatedAt,
        changefreq: "weekly",
        priority: 0.8,
      }),
    )
    .join("\n");

  return new Response(wrapUrlset(urls), { headers: sitemapHeaders });
}
