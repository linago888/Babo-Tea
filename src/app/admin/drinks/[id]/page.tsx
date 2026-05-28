import { notFound } from "next/navigation";

import DrinkForm, { type DrinkFormInitial } from "@/components/admin/drink-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDrinkEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drink = await prisma.drink.findUnique({ where: { id } });
  if (!drink) notFound();

  const initial: DrinkFormInitial = {
    id: drink.id,
    slug: drink.slug,
    nameI18n: (drink.nameI18n ?? {}) as Record<string, string>,
    descriptionI18n: (drink.descriptionI18n ?? {}) as Record<string, string>,
    seoI18n: (drink.seoI18n ?? {}) as Record<string, { title?: string; description?: string }>,
    category: drink.category,
    teaBase: drink.teaBase.join(", "),
    milkType: drink.milkType ?? "",
    toppings: drink.toppings.join(", "),
    sweetener: drink.sweetener ?? "",
    temperature: drink.temperature,
    typicalSugarLevels: drink.typicalSugarLevels.join(", "),
    caloriesKcalMin: drink.caloriesKcalMin !== null ? String(drink.caloriesKcalMin) : "",
    caloriesKcalMax: drink.caloriesKcalMax !== null ? String(drink.caloriesKcalMax) : "",
    caffeineMgMin: drink.caffeineMgMin !== null ? String(drink.caffeineMgMin) : "",
    caffeineMgMax: drink.caffeineMgMax !== null ? String(drink.caffeineMgMax) : "",
    flavorProfileText: drink.flavorProfile !== null ? JSON.stringify(drink.flavorProfile, null, 2) : "",
    status: drink.status,
  };

  return <DrinkForm mode="edit" drinkId={drink.id} initial={initial} />;
}
