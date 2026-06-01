/**
 * POST /api/admin/sources/discover-rss
 *
 * 給定一個網站 URL（首頁或任一頁），自動探查它的 RSS / Atom feed URL。
 * 探查邏輯：
 *   1. fetch HTML，找 <link rel="alternate" type="application/rss+xml" href="..."/>
 *   2. 若 HTML 沒宣告，試常見路徑 /feed、/rss、/feed.xml、/atom.xml...
 *
 * Request:  { url: string }
 * Response: { ok: true, feedUrl: string, via: "html-link" | "guess" }
 *           或 { ok: false, error: "..." }
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { discoverRssUrl } from "@/lib/rss-parser";

const BodySchema = z.object({
  url: z.string().url(),
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

  try {
    const result = await discoverRssUrl(parsed.data.url);
    if (!result) {
      return Response.json(
        {
          ok: false,
          error: "No RSS feed discovered. The site may not publish one, or it might be behind a login.",
        },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Discovery failed" },
      { status: 500 },
    );
  }
}
