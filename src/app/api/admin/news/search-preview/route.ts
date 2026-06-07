/**
 * POST /api/admin/news/search-preview
 *
 * 預覽 Google News 搜尋會回什麼新聞 — 純讀取，不寫 DB。
 * 給編輯在儲存 NewsSearchQuery 前先試 query 是否合用。
 *
 * Body: { query, locale, countryCode? }
 * Response: { ok: true, feedUrl, items: [{ title, publisher, publisherUrl, publishedAt, link }] }
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { buildGoogleNewsRssUrl } from "@/lib/google-news";
import { routing } from "@/i18n/routing";
import { fetchRssFeed } from "@/lib/rss-parser";

const BodySchema = z.object({
  query: z.string().min(1).max(500),
  locale: z.enum(routing.locales as unknown as [string, ...string[]]),
  countryCode: z.string().length(2).optional().nullable(),
});

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 422 },
    );
  }
  const { query, locale, countryCode } = parsed.data;

  const feedUrl = buildGoogleNewsRssUrl({ query, locale, countryCode });

  try {
    const items = await fetchRssFeed(feedUrl);
    return Response.json({
      ok: true,
      feedUrl,
      itemCount: items.length,
      items: items.slice(0, 30).map((item) => ({
        title: item.title ?? "",
        publisher: item.publisherName ?? null,
        publisherUrl: item.publisherUrl ?? null,
        publishedAt: item.publishedAt ?? null,
        link: item.link,
      })),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Preview failed",
        feedUrl,
      },
      { status: 500 },
    );
  }
}
