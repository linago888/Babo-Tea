/**
 * PUT    /api/admin/drinks/[id]  — 更新飲品
 * DELETE /api/admin/drinks/[id]  — 封存
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { scoreDrink } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: z.record(z.string(), z.string()),
  descriptionI18n: z.record(z.string(), z.string()).optional().nullable(),
  seoI18n: z.unknown().optional().nullable(),
  category: z.enum([
    "MILK_TEA",
    "FRUIT_TEA",
    "PURE_TEA",
    "CHEESE_TEA",
    "COFFEE_TEA",
    "SMOOTHIE",
    "OTHER",
  ]),
  teaBase: z.array(z.string()).default([]),
  milkType: z.string().optional().nullable(),
  toppings: z.array(z.string()).default([]),
  sweetener: z.string().optional().nullable(),
  temperature: z.array(z.enum(["HOT", "ICED", "BLENDED"])).default([]),
  typicalSugarLevels: z.array(z.number().int().min(0).max(100)).default([]),
  caloriesKcalMin: z.number().int().min(0).optional().nullable(),
  caloriesKcalMax: z.number().int().min(0).optional().nullable(),
  caffeineMgMin: z.number().int().min(0).optional().nullable(),
  caffeineMgMax: z.number().int().min(0).optional().nullable(),
  flavorProfile: z.unknown().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
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

  const existing = await prisma.drink.findUnique({
    where: { id },
    include: {
      brandDrinks: { select: { brandId: true } },
      drinkCities: { select: { cityId: true } },
      newsDrinks: { select: { newsId: true } },
    },
  });
  if (!existing) {
    return Response.json({ ok: false, error: "Drink not found" }, { status: 404 });
  }

  if (data.slug !== existing.slug) {
    const dup = await prisma.drink.findUnique({ where: { slug: data.slug } });
    if (dup) {
      return Response.json(
        { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
        { status: 409 },
      );
    }
  }

  const { score } = scoreDrink({
    nameI18n: data.nameI18n,
    descriptionI18n: data.descriptionI18n ?? null,
    seoI18n: data.seoI18n ?? null,
    teaBase: data.teaBase,
    milkType: data.milkType ?? null,
    toppings: data.toppings,
    sweetener: data.sweetener ?? null,
    temperature: data.temperature,
    typicalSugarLevels: data.typicalSugarLevels,
    caloriesKcalMin: data.caloriesKcalMin ?? null,
    caloriesKcalMax: data.caloriesKcalMax ?? null,
    caffeineMgMin: data.caffeineMgMin ?? null,
    caffeineMgMax: data.caffeineMgMax ?? null,
    flavorProfile: data.flavorProfile ?? null,
    brandDrinks: existing.brandDrinks,
    drinkCities: existing.drinkCities,
    newsDrinks: existing.newsDrinks,
  });

  const updated = await prisma.drink.update({
    where: { id },
    data: {
      slug: data.slug,
      nameI18n: data.nameI18n as never,
      descriptionI18n: (data.descriptionI18n ?? null) as never,
      seoI18n: (data.seoI18n ?? null) as never,
      category: data.category,
      teaBase: data.teaBase,
      milkType: data.milkType || null,
      toppings: data.toppings,
      sweetener: data.sweetener || null,
      temperature: data.temperature,
      typicalSugarLevels: data.typicalSugarLevels,
      caloriesKcalMin: data.caloriesKcalMin ?? null,
      caloriesKcalMax: data.caloriesKcalMax ?? null,
      caffeineMgMin: data.caffeineMgMin ?? null,
      caffeineMgMax: data.caffeineMgMax ?? null,
      flavorProfile: (data.flavorProfile ?? null) as never,
      status: data.status,
      completenessScore: score,
      lastHumanEditAt: new Date(),
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/[locale]/drinks", "layout");
  revalidatePath(`/[locale]/drinks/${updated.slug}`, "layout");
  if (existing.slug !== updated.slug) {
    revalidatePath(`/[locale]/drinks/${existing.slug}`, "layout");
  }

  return Response.json({ ok: true, drink: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.drink.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) {
    return Response.json({ ok: false, error: "Drink not found" }, { status: 404 });
  }

  await prisma.drink.update({ where: { id }, data: { status: "ARCHIVED" } });

  revalidatePath("/[locale]/drinks", "layout");
  revalidatePath(`/[locale]/drinks/${existing.slug}`, "layout");

  return Response.json({ ok: true });
}
