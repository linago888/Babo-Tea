/**
 * POST /api/admin/brands — 建立新品牌
 * GET  /api/admin/brands  — 列出（admin 列表頁用）
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { scoreBrand } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: z.record(z.string(), z.string()),
  descriptionI18n: z.record(z.string(), z.string()).optional(),
  seoI18n: z.unknown().optional(),
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

  const parsed = CreateSchema.safeParse(body);
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

  // slug 唯一性
  const dup = await prisma.brand.findUnique({ where: { slug: data.slug } });
  if (dup) {
    return Response.json(
      { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
      { status: 409 },
    );
  }

  // 算 completeness
  const { score } = scoreBrand({
    nameI18n: data.nameI18n,
    descriptionI18n: data.descriptionI18n,
    seoI18n: data.seoI18n,
    foundedYear: data.foundedYear ?? null,
    headquartersCityId: data.headquartersCityId ?? null,
    positioningTags: data.positioningTags,
    socialHandles: data.socialHandles ?? null,
    officialWebsite: (data.officialWebsite || null) as string | null,
    logoUrl: (data.logoUrl || null) as string | null,
    brandDrinks: [],
    brandCities: [],
    newsBrands: [],
    brandCompanies: [],
  });

  const brand = await prisma.brand.create({
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
    select: { id: true, slug: true },
  });

  // SSG 路徑 revalidate
  revalidatePath("/[locale]/brands", "layout");
  revalidatePath(`/[locale]/brands/${brand.slug}`, "layout");

  return Response.json({ ok: true, brand });
}
