/**
 * PATCH /api/admin/news/[id]/status
 *
 * 輕量端點：只改 status 欄位。給 /admin/news-inbox 列表頁的快速「發布 / 退回草稿」按鈕用。
 *
 * Body: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
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

  const existing = await prisma.news.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!existing) {
    return Response.json({ ok: false, error: "News not found" }, { status: 404 });
  }

  await prisma.news.update({
    where: { id },
    data: { status: parsed.data.status, lastHumanEditAt: new Date() },
  });

  revalidatePath("/[locale]/news", "layout");
  revalidatePath(`/[locale]/news/${existing.slug}`, "layout");
  return Response.json({ ok: true });
}
