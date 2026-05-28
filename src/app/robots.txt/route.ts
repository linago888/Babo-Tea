import { SITE_URL } from "@/lib/metadata";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const body = `# Global Boba Graph
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

# Crawl politeness
Crawl-delay: 1

Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
