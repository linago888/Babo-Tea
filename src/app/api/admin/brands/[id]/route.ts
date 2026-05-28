/**
 * PUT    /api/admin/brands/[id]  — 更新品牌（含 relations）
 * DELETE /api/admin/brands/[id]  — 封存（不真刪，status=ARCHIVED）
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { scoreBrand } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const RelationDrink = z.object({
  drinkId: z.string().uuid(),
  isSignature: z.boolean().default(false),
});
const RelationCity = z.object({
  cityId: z.string().uuid(),
  status: z.enum(["ACTIVE", "EXITED", "RUMORED"]).default("ACTIVE"),
  enteredAt: z.string().optional().nullable(),
});
const RelationCompany = z.object({
  companyId: z.string().uuid(),
  relation: z.enum(["OWNER", "PARENT", "LICENSOR", "FRANCHISOR", "INVESTOR", "FORMER_OWNER"]),
  since: z.string(), // YYYY-MM-DD
  until: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const UpdateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: z.record(z.string(), z.string()),
  descriptionI18n: z.record(z.string(), z.string()).optional().nullable(),
  seoI18n: z.unknown().optional().nullable(),
  countryCode: z.string().length(2),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  headquartersCityId: z.string().uuid().optional().nullable(),
  businessModel: z.enum(["DIRECT", "FRANCHISE", "HYBRID", "LICENSED"]),
  priceTier: z.enum(["VALUE", "MID", "PREMIUM", "LUXURY"]),
  positioningTags: z.array(z.string()).default([]),
  officialWebsite: z.string().url().optional().or(z.literal("")).nullable(),
  logoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  socialHandles: z.unknown().optional().nullable(),
  verified: z.boolean().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  // 關聯（選填 — 沒送代表不動）
  signatureDrinks: z.array(RelationDrink).optional(),
  cities: z.array(RelationCity).optional(),
  companies: z.array(RelationCompany).optional(),
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

  const existing = await prisma.brand.findUnique({
    where: { id },
    include: {
      brandDrinks: { select: { isSignature: true } },
      brandCities: { select: { brandId: true } },
      newsBrands: { select: { newsId: true } },
      brandCompanies: { select: { brandId: true } },
    },
  });
  if (!existing) {
    return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });
  }

  // slug 衝突檢查
  if (data.slug !== existing.slug) {
    const dup = await prisma.brand.findUnique({ where: { slug: data.slug } });
    if (dup) {
      return Response.json(
        { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
        { status: 409 },
      );
    }
  }

  // 預估更新後的 relation 數量供 completeness 用
  const projectedDrinks = data.signatureDrinks ?? existing.brandDrinks;
  const projectedCities = data.cities ?? existing.brandCities;
  const projectedCompanies = data.companies ?? existing.brandCompanies;

  const { score } = scoreBrand({
    nameI18n: data.nameI18n,
    descriptionI18n: data.descriptionI18n ?? null,
    seoI18n: data.seoI18n ?? null,
    foundedYear: data.foundedYear ?? null,
    headquartersCityId: data.headquartersCityId ?? null,
    positioningTags: data.positioningTags,
    socialHandles: data.socialHandles ?? null,
    officialWebsite: (data.officialWebsite || null) as string | null,
    logoUrl: (data.logoUrl || null) as string | null,
    brandDrinks: projectedDrinks.map((d) => ({ isSignature: (d as { isSignature?: boolean }).isSignature ?? false })),
    brandCities: projectedCities,
    newsBrands: existing.newsBrands,
    brandCompanies: projectedCompanies,
  });

  // Transaction: brand update + relation replacements
  await prisma.$transaction(async (tx) => {
    await tx.brand.update({
      where: { id },
      data: {
        slug: data.slug,
        nameI18n: data.nameI18n as never,
        descriptionI18n: (data.descriptionI18n ?? null) as never,
        seoI18n: (data.seoI18n ?? null) as never,
        countryCode: data.countryCode.toUpperCase(),
        foundedYear: data.foundedYear ?? null,
        headquartersCityId: data.headquartersCityId ?? null,
        businessModel: data.businessModel,
        priceTier: data.priceTier,
        positioningTags: data.positioningTags,
        officialWebsite: data.officialWebsite || null,
        logoUrl: data.logoUrl || null,
        socialHandles: (data.socialHandles ?? null) as never,
        verified: data.verified,
        status: data.status,
        completenessScore: score,
        lastHumanEditAt: new Date(),
      },
    });

    // Signature drinks
    if (data.signatureDrinks) {
      await tx.brandDrink.deleteMany({ where: { brandId: id } });
      if (data.signatureDrinks.length > 0) {
        await tx.brandDrink.createMany({
          data: data.signatureDrinks.map((d) => ({
            brandId: id,
            drinkId: d.drinkId,
            isSignature: d.isSignature,
          })),
        });
      }
    }

    // Brand cities
    if (data.cities) {
      await tx.brandCity.deleteMany({ where: { brandId: id } });
      if (data.cities.length > 0) {
        await tx.brandCity.createMany({
          data: data.cities.map((c) => ({
            brandId: id,
            cityId: c.cityId,
            status: c.status,
            enteredAt: c.enteredAt ? new Date(c.enteredAt) : null,
          })),
        });
      }
    }

    // Brand companies
    if (data.companies) {
      await tx.brandCompany.deleteMany({ where: { brandId: id } });
      if (data.companies.length > 0) {
        await tx.brandCompany.createMany({
          data: data.companies.map((c) => ({
            brandId: id,
            companyId: c.companyId,
            relation: c.relation,
            since: new Date(c.since),
            until: c.until ? new Date(c.until) : null,
            notes: c.notes || null,
          })),
        });
      }
    }
  });

  // Revalidate SSG 路徑
  revalidatePath("/[locale]/brands", "layout");
  revalidatePath(`/[locale]/brands/${data.slug}`, "layout");
  if (existing.slug !== data.slug) {
    revalidatePath(`/[locale]/brands/${existing.slug}`, "layout");
  }

  return Response.json({ ok: true, brand: { id, slug: data.slug } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.brand.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) {
    return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });
  }

  await prisma.brand.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/[locale]/brands", "layout");
  revalidatePath(`/[locale]/brands/${existing.slug}`, "layout");

  return Response.json({ ok: true });
}
