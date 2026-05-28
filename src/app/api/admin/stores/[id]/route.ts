/**
 * PUT    /api/admin/stores/[id]  — 更新門市
 * DELETE /api/admin/stores/[id]  — 封存
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  brandId: z.string().uuid(),
  cityId: z.string().uuid(),
  nameI18n: z.record(z.string(), z.string()).optional().nullable(),
  addressI18n: z.record(z.string(), z.string()),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().optional().nullable(),
  openingHours: z.unknown().optional().nullable(),
  isFlagship: z.boolean().default(false),
  franchise: z.boolean().default(false),
  openedAt: z.string().optional().nullable(),
  closedAt: z.string().optional().nullable(),
  externalIds: z.unknown().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
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

  const existing = await prisma.store.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ ok: false, error: "Store not found" }, { status: 404 });

  const updated = await prisma.store.update({
    where: { id },
    data: {
      brandId: data.brandId,
      cityId: data.cityId,
      nameI18n: (data.nameI18n && Object.keys(data.nameI18n).length ? data.nameI18n : null) as never,
      addressI18n: data.addressI18n as never,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone || null,
      openingHours: (data.openingHours ?? null) as never,
      isFlagship: data.isFlagship,
      franchise: data.franchise,
      openedAt: data.openedAt ? new Date(data.openedAt) : null,
      closedAt: data.closedAt ? new Date(data.closedAt) : null,
      externalIds: (data.externalIds ?? null) as never,
      status: data.status,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, store: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.store.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return Response.json({ ok: false, error: "Store not found" }, { status: 404 });
  await prisma.store.update({ where: { id }, data: { status: "ARCHIVED" } });
  return Response.json({ ok: true });
}
