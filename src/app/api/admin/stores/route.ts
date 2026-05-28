/**
 * POST /api/admin/stores — 建立門市
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
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

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const [brand, city] = await Promise.all([
    prisma.brand.findUnique({ where: { id: data.brandId }, select: { id: true } }),
    prisma.city.findUnique({ where: { id: data.cityId }, select: { id: true } }),
  ]);
  if (!brand) return Response.json({ ok: false, errors: [{ path: "brandId", message: "brand not found" }] }, { status: 422 });
  if (!city) return Response.json({ ok: false, errors: [{ path: "cityId", message: "city not found" }] }, { status: 422 });

  const store = await prisma.store.create({
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

  return Response.json({ ok: true, store });
}
