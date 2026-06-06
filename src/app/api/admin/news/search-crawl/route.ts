/**
 * POST /api/admin/news/search-crawl
 *
 * 觸發 Google News 搜尋爬取。
 *   - body { queryId: "uuid" } → 只跑該 query
 *   - body 空 → 跑所有 enabled 的 queries
 *
 * 也支援 Vercel Cron（Bearer <CRON_SECRET>）。
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { ingestAllEnabledQueries, ingestSearchQuery } from "@/lib/news-search-ingest";

const BodySchema = z.object({
  queryId: z.string().uuid().optional(),
});

export const maxDuration = 60;

function isCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  const isCron = isCronAuthorized(req);
  if (!isCron && !(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const { queryId } = parsed.data;

  try {
    const summaries = queryId
      ? [await ingestSearchQuery(queryId)]
      : await ingestAllEnabledQueries();
    const totalCreated = summaries.reduce((s, x) => s + x.created, 0);
    if (totalCreated > 0) revalidatePath("/admin/news-inbox");
    return Response.json({ ok: true, summaries });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Ingest failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
