import { notFound } from "next/navigation";

import CityForm, { type CityFormInitial } from "@/components/admin/city-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) notFound();

  const initial: CityFormInitial = {
    id: city.id,
    slug: city.slug,
    nameI18n: (city.nameI18n ?? {}) as Record<string, string>,
    descriptionI18n: (city.descriptionI18n ?? {}) as Record<string, string>,
    seoI18n: (city.seoI18n ?? {}) as Record<string, { title?: string; description?: string }>,
    countryCode: city.countryCode,
    adminRegion: city.adminRegion ?? "",
    lat: city.lat.toString(),
    lng: city.lng.toString(),
    timezone: city.timezone,
    population: city.population !== null ? String(city.population) : "",
    avgPriceLocal: city.avgPriceLocal !== null ? city.avgPriceLocal.toString() : "",
    avgPriceCurrency: city.avgPriceCurrency ?? "",
    marketMaturity: city.marketMaturity ?? "",
    status: city.status,
  };

  return <CityForm mode="edit" cityId={city.id} initial={initial} />;
}
