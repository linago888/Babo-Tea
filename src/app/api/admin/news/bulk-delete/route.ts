/**
 * POST /api/admin/news/bulk-delete
 *
 * Body: { ids: string[]; hard?: boolean }
 * 預設硬刪除（hard=true）— 收件匣那批反正都是 DRAFT 沒人審過。
 * 一次最多 200 筆，避免單個 request 太大。
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  hard: z.boolean().optional().default(true),
});

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

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }

  const { ids, hard } = parsed.data;

  let affected = 0;
  if (hard) {
    const res = await prisma.news.deleteMany({ where: { id: { in: ids } } });
    affected = res.count;
  } else {
    const res = await prisma.news.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED" },
    });
    affected = res.count;
  }

  revalidatePath("/[locale]/news", "layout");
  revalidatePath("/admin/news-inbox");

  return Response.json({ ok: true, affected, mode: hard ? "hard" : "archive" });
}
