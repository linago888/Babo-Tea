import { notFound } from "next/navigation";

import BrandForm, { type BrandFormInitial } from "@/components/admin/brand-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function AdminBrandEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getAdminLocale()) as Locale;

  const brand = await prisma.brand.findUnique({
    where: { id },
    include: {
      brandDrinks: { select: { drinkId: true, isSignature: true } },
      brandCities: { select: { cityId: true, status: true, enteredAt: true } },
      brandCompanies: {
        select: { companyId: true, relation: true, since: true, until: true, notes: true },
        orderBy: { since: "desc" },
      },
    },
  });
  if (!brand) notFound();

  const [cities, drinks, companies] = await Promise.all([
    prisma.city.findMany({
      select: { id: true, slug: true, nameI18n: true, countryCode: true },
      orderBy: { slug: "asc" },
    }),
    prisma.drink.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, slug: true, nameI18n: true },
      orderBy: { slug: "asc" },
    }),
    prisma.company.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, slug: true, nameI18n: true },
      orderBy: { slug: "asc" },
    }),
  ]);

  const cityOptions = cities.map((c) => ({
    id: c.id,
    label: `${pickI18n(c.nameI18n, locale) || c.id} · ${localizeCountry(c.countryCode, locale)}`,
  }));
  const drinkOptions = drinks.map((d) => ({
    id: d.id,
    label: pickI18n(d.nameI18n, locale, { fallback: d.slug }),
  }));
  const companyOptions = companies.map((c) => ({
    id: c.id,
    label: pickI18n(c.nameI18n, locale, { fallback: c.slug }),
  }));

  const initial: BrandFormInitial = {
    id: brand.id,
    slug: brand.slug,
    nameI18n: (brand.nameI18n ?? {}) as Record<string, string>,
    descriptionI18n: (brand.descriptionI18n ?? {}) as Record<string, string>,
    seoI18n: (brand.seoI18n ?? {}) as Record<string, { title?: string; description?: string; faq?: unknown }>,
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
    signatureDrinks: brand.brandDrinks.map((bd) => ({
      drinkId: bd.drinkId,
      isSignature: bd.isSignature,
    })),
    cities: brand.brandCities.map((bc) => ({
      cityId: bc.cityId,
      status: bc.status,
      enteredAt: toDateInput(bc.enteredAt),
    })),
    companies: brand.brandCompanies.map((bc) => ({
      companyId: bc.companyId,
      relation: bc.relation,
      since: toDateInput(bc.since),
      until: toDateInput(bc.until),
      notes: bc.notes ?? "",
    })),
  };

  return (
    <BrandForm
      mode="edit"
      brandId={brand.id}
      initial={initial}
      cities={cityOptions}
      drinks={drinkOptions}
      companies={companyOptions}
    />
  );
}
