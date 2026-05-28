import { notFound } from "next/navigation";

import BrandForm, { type BrandFormInitial } from "@/components/admin/brand-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBrandEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getAdminLocale()) as Locale;

  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  const cities = await prisma.city.findMany({
    select: { id: true, nameI18n: true, countryCode: true },
    orderBy: { slug: "asc" },
  });

  const cityOptions = cities.map((c) => ({
    id: c.id,
    label: `${pickI18n(c.nameI18n, locale) || c.id} · ${localizeCountry(c.countryCode, locale)}`,
  }));

  const nameI18n = (brand.nameI18n ?? {}) as Record<string, string>;
  const descriptionI18n = (brand.descriptionI18n ?? {}) as Record<string, string>;
  const seoI18n = (brand.seoI18n ?? {}) as Record<string, { title?: string; description?: string; faq?: unknown }>;

  const initial: BrandFormInitial = {
    id: brand.id,
    slug: brand.slug,
    nameI18n,
    descriptionI18n,
    seoI18n,
    countryCode: brand.countryCode,
    foundedYear: brand.foundedYear !== null ? String(brand.foundedYear) : "",
    headquartersCityId: brand.headquartersCityId ?? "",
    businessModel: brand.businessModel,
    priceTier: brand.priceTier,
    positioningTags: brand.positioningTags.join(", "),
    officialWebsite: brand.officialWebsite ?? "",
    logoUrl: brand.logoUrl ?? "",
    socialHandlesText:
      brand.socialHandles !== null ? JSON.stringify(brand.socialHandles, null, 2) : "",
    verified: brand.verified,
    status: brand.status,
  };

  return <BrandForm mode="edit" brandId={brand.id} initial={initial} cities={cityOptions} />;
}
