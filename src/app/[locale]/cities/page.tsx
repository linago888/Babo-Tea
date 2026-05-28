import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CityCard } from "@/components/city-card";
import { EntityGrid } from "@/components/entity-grid";
import { FilterBar } from "@/components/filter-bar";
import type { MarketMaturity } from "@/generated/prisma/enums";
import { type Locale, routing } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

type SearchParams = { [k: string]: string | string[] | undefined };
const MATURITY: MarketMaturity[] = ["EMERGING", "GROWING", "MATURE", "SATURATED"];

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/cities",
    title: `${t("cityList.title")} — ${t("site.name")}`,
    description: t("site.description"),
  });
}

function parse(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function CitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const country = parse(sp, "country");
  const rawMaturity = parse(sp, "maturity")?.toUpperCase() as MarketMaturity | undefined;
  const maturity = rawMaturity && MATURITY.includes(rawMaturity) ? rawMaturity : undefined;

  const where = {
    status: "PUBLISHED" as const,
    ...(country ? { countryCode: country.toUpperCase() } : {}),
    ...(maturity ? { marketMaturity: maturity } : {}),
  };

  const [allCities, cities, t] = await Promise.all([
    prisma.city.findMany({
      where: { status: "PUBLISHED" },
      select: { countryCode: true },
    }),
    prisma.city.findMany({
      where,
      orderBy: { slug: "asc" },
      include: {
        _count: { select: { brandCities: { where: { status: "ACTIVE" } } } },
      },
    }),
    getTranslations({ locale }),
  ]);

  const countryCodes = Array.from(new Set(allCities.map((c) => c.countryCode))).sort();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${t("cityList.title")} — ${t("site.name")}`,
    numberOfItems: cities.length,
    itemListElement: cities.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${locale}/cities/${c.slug}`,
      name: pickI18n(c.nameI18n, locale as Locale),
    })),
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {t("cityList.title")}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("cityList.subtitle", { count: allCities.length })}
        </p>
      </header>

      <div className="mb-6">
        <FilterBar
          allLabel={t("cityList.filter.all")}
          clearLabel={t("cityList.filter.clear")}
          fields={[
            {
              key: "country",
              label: t("cityList.filter.country"),
              options: countryCodes.map((c) => ({
                value: c,
                label: localizeCountry(c, locale as Locale),
              })),
            },
            {
              key: "maturity",
              label: t("cityList.filter.maturity"),
              options: MATURITY.map((m) => ({
                value: m.toLowerCase(),
                label: t(`cityList.maturity.${m.toLowerCase()}`),
              })),
            },
          ]}
        />
      </div>

      {cities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          {t("cityList.empty")}
        </p>
      ) : (
        <EntityGrid>
          {cities.map((city) => (
            <CityCard key={city.id} city={city} locale={locale as Locale} />
          ))}
        </EntityGrid>
      )}
    </main>
  );
}
