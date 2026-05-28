import { entryWithAlternates, sitemapHeaders, wrapUrlset } from "@/lib/sitemap";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const brands = await prisma.brand.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });

  const urls = brands
    .map((b) =>
      entryWithAlternates({
        slug: b.slug,
        basePath: "/brands",
        lastmod: b.updatedAt,
        changefreq: "weekly",
        priority: 0.8,
      }),
    )
    .join("\n");

  return new Response(wrapUrlset(urls), { headers: sitemapHeaders });
}
