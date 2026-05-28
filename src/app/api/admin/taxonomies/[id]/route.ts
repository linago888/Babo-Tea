/**
 * PUT    /api/admin/taxonomies/[id]  — 更新詞彙
 * DELETE /api/admin/taxonomies/[id]  — 封存（status=ARCHIVED）
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const KINDS = ["TEA_BASE", "MILK_TYPE", "TOPPING", "SWEETENER", "FLAVOR_TAG", "POSITIONING_TAG"] as const;

const UpdateSchema = z.object({
  kind: z.enum(KINDS),
  code: z.string().min(1).regex(/^[a-z0-9-]+$/),
  labelI18n: z.record(z.string(), z.string()),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.taxonomy.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ ok: false, error: "Taxonomy not found" }, { status: 404 });
  }

  // 防止 parent 指向自己 / 形成循環（簡單版：只擋自己）
  if (data.parentId && data.parentId === id) {
    return Response.json(
      { ok: false, errors: [{ path: "parentId", message: "cannot self-reference" }] },
      { status: 422 },
    );
  }

  // 改 kind+code 時檢查衝突
  if (data.kind !== existing.kind || data.code !== existing.code) {
    const dup = await prisma.taxonomy.findUnique({
      where: { kind_code: { kind: data.kind, code: data.code } },
    });
    if (dup && dup.id !== id) {
      return Response.json(
        { ok: false, errors: [{ path: "code", message: "code already in use for this kind" }] },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.taxonomy.update({
    where: { id },
    data: {
      kind: data.kind,
      code: data.code,
      labelI18n: data.labelI18n as never,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder,
      status: data.status,
    },
    select: { id: true, code: true, kind: true },
  });

  return Response.json({ ok: true, taxonomy: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.taxonomy.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ ok: false, error: "Taxonomy not found" }, { status: 404 });
  }

  await prisma.taxonomy.update({ where: { id }, data: { status: "ARCHIVED" } });

  return Response.json({ ok: true });
}
