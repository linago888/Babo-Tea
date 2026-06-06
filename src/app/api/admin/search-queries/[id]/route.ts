/**
 * PUT    /api/admin/search-queries/[id] — 更新
 * DELETE /api/admin/search-queries/[id] — 真刪（搜尋查詢可隨意刪）
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  label: z.string().min(1).max(120),
  query: z.string().min(1).max(500),
  locale: z.enum(routing.locales as unknown as [string, ...string[]]),
  countryCode: z.string().length(2).optional().nullable(),
  enabled: z.boolean().default(true),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  const data = parsed.data;
  const existing = await prisma.newsSearchQuery.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ ok: false, error: "Query not found" }, { status: 404 });

  await prisma.newsSearchQuery.update({
    where: { id },
    data: {
      label: data.label,
      query: data.query,
      locale: data.locale,
      countryCode: data.countryCode ? data.countryCode.toUpperCase() : null,
      enabled: data.enabled,
    },
  });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.newsSearchQuery.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ ok: false, error: "Query not found" }, { status: 404 });
  await prisma.newsSearchQuery.delete({ where: { id } });
  return Response.json({ ok: true });
}
