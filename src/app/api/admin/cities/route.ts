/**
 * POST /api/admin/cities — 建立城市
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { scoreCity } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: z.record(z.string(), z.string()),
  descriptionI18n: z.record(z.string(), z.string()).optional().nullable(),
  seoI18n: z.unknown().optional().nullable(),
  countryCode: z.string().length(2),
  adminRegion: z.string().optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timezone: z.string().min(3),
  population: z.number().int().min(0).optional().nullable(),
  avgPriceLocal: z.number().min(0).optional().nullable(),
  avgPriceCurrency: z.string().length(3).optional().nullable(),
  marketMaturity: z.enum(["EMERGING", "GROWING", "MATURE", "SATURATED"]).optional().nullable(),
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

  const dup = await prisma.city.findUnique({ where: { slug: data.slug } });
  if (dup) {
    return Response.json(
      { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
      { status: 409 },
    );
  }

  const { score } = scoreCity({
    nameI18n: data.nameI18n,
    descriptionI18n: data.descriptionI18n ?? null,
    seoI18n: data.seoI18n ?? null,
    adminRegion: data.adminRegion ?? null,
    population: data.population ?? null,
    avgPriceLocal: data.avgPriceLocal ?? null,
    avgPriceCurrency: data.avgPriceCurrency ?? null,
    marketMaturity: data.marketMaturity ?? null,
    brandCities: [],
    drinkCities: [],
    newsCities: [],
  });

  const city = await prisma.city.create({
    data: {
      slug: data.slug,
      nameI18n: data.nameI18n as never,
      descriptionI18n: (data.descriptionI18n ?? null) as never,
      seoI18n: (data.seoI18n ?? null) as never,
      countryCode: data.countryCode.toUpperCase(),
      adminRegion: data.adminRegion || null,
      lat: data.lat,
      lng: data.lng,
      timezone: data.timezone,
      population: data.population ?? null,
      avgPriceLocal: data.avgPriceLocal ?? null,
      avgPriceCurrency: data.avgPriceCurrency ? data.avgPriceCurrency.toUpperCase() : null,
      marketMaturity: data.marketMaturity ?? null,
      status: data.status,
      completenessScore: score,
      lastHumanEditAt: new Date(),
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/[locale]/cities", "layout");
  revalidatePath(`/[locale]/cities/${city.slug}`, "layout");

  return Response.json({ ok: true, city });
}
