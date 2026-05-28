/**
 * PUT    /api/admin/companies/[id]  — 更新母公司
 * DELETE /api/admin/companies/[id]  — 封存
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { scoreCompany } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: z.record(z.string(), z.string()),
  descriptionI18n: z.record(z.string(), z.string()).optional().nullable(),
  countryCode: z.string().length(2),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  stockTicker: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
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

  const existing = await prisma.company.findUnique({
    where: { id },
    include: { brandCompanies: { select: { brandId: true } } },
  });
  if (!existing) {
    return Response.json({ ok: false, error: "Company not found" }, { status: 404 });
  }

  if (data.slug !== existing.slug) {
    const dup = await prisma.company.findUnique({ where: { slug: data.slug } });
    if (dup) {
      return Response.json(
        { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
        { status: 409 },
      );
    }
  }

  const { score } = scoreCompany({
    nameI18n: data.nameI18n,
    descriptionI18n: data.descriptionI18n ?? null,
    countryCode: data.countryCode,
    foundedYear: data.foundedYear ?? null,
    stockTicker: data.stockTicker ?? null,
    website: (data.website || null) as string | null,
    brandCompanies: existing.brandCompanies,
  });

  const updated = await prisma.company.update({
    where: { id },
    data: {
      slug: data.slug,
      nameI18n: data.nameI18n as never,
      descriptionI18n: (data.descriptionI18n ?? null) as never,
      countryCode: data.countryCode.toUpperCase(),
      foundedYear: data.foundedYear ?? null,
      stockTicker: data.stockTicker || null,
      website: data.website || null,
      status: data.status,
      completenessScore: score,
      lastHumanEditAt: new Date(),
    },
    select: { id: true, slug: true },
  });

  return Response.json({ ok: true, company: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ ok: false, error: "Company not found" }, { status: 404 });
  }
  await prisma.company.update({ where: { id }, data: { status: "ARCHIVED" } });
  return Response.json({ ok: true });
}
