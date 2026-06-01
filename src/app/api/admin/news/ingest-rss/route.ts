/**
 * POST /api/admin/news/ingest-rss
 *
 * 觸發 RSS 自動匯入。
 * - body `{ sourceId: "uuid" }` → 只跑該 source
 * - body `{}` 或不帶 body → 跑所有 rss_feed_url 不為 null 且非 ARCHIVED 的 source
 *
 * 也支援由 Vercel Cron 觸發：header `Authorization: Bearer <CRON_SECRET>` 通過即跳過 admin auth。
 *
 * 回傳：
 *   { ok: true, summaries: IngestSummary[] }
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { ingestAllSources, ingestSource } from "@/lib/rss-ingest";

const BodySchema = z.object({
  sourceId: z.string().uuid().optional(),
});

// Vercel Cron 可用 maxDuration（serverless function 上限）
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
  const { sourceId } = parsed.data;

  try {
    const summaries = sourceId ? [await ingestSource(sourceId)] : await ingestAllSources();
    const totalCreated = summaries.reduce((sum, s) => sum + s.created, 0);
    if (totalCreated > 0) {
      // 至少建了一筆 DRAFT — 觸發 admin /admin/news list 重新整理
      revalidatePath("/admin/news");
    }
    return Response.json({ ok: true, summaries });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Ingest failed" },
      { status: 500 },
    );
  }
}

// GET 同樣允許（讓 Vercel Cron 用 GET 也能觸發 — 預設就是 GET）
export async function GET(req: Request) {
  return POST(req);
}
