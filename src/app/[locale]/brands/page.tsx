import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { BrandCard } from "@/components/brand-card";
import { EntityGrid } from "@/components/entity-grid";
import { FilterBar } from "@/components/filter-bar";
import type { BusinessModel, PriceTier } from "@/generated/prisma/enums";
import { type Locale, routing } from "@/i18n/routing";
import { pickI18n, localizeCountry } from "@/lib/i18n-text";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

type SearchParams = { [k: string]: string | string[] | undefined };

const PRICE_TIERS: PriceTier[] = ["VALUE", "MID", "PREMIUM", "LUXURY"];
const BUSINESS_MODELS: BusinessModel[] = ["DIRECT", "FRANCHISE", "HYBRID", "LICENSED"];

export const revalidate = 3600; // 1h ISR；CMS 發布後另外手動 revalidatePath

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
    path: "/brands",
    title: `${t("brandList.title")} — ${t("site.name")}`,
    description: t("site.description"),
  });
}

function parse(searchParams: SearchParams, key: string): string | undefined {
  const v = searchParams[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function BrandsPage({
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
  const tier = parse(sp, "tier")?.toUpperCase() as PriceTier | undefined;
  const model = parse(sp, "model")?.toUpperCase() as BusinessModel | undefined;

  const validTier = tier && PRICE_TIERS.includes(tier) ? tier : undefined;
  const validModel = model && BUSINESS_MODELS.includes(model) ? model : undefined;

  const where = {
    status: "PUBLISHED" as const,
    ...(country ? { countryCode: country.toUpperCase() } : {}),
    ...(validTier ? { priceTier: validTier } : {}),
    ...(validModel ? { businessModel: validModel } : {}),
  };

  // 全部品牌（給篩選 dropdown 抓國家清單）+ 符合 where 的品牌（顯示）
  const [allBrands, brands, t] = await Promise.all([
    prisma.brand.findMany({
      where: { status: "PUBLISHED" },
      select: { countryCode: true },
    }),
    prisma.brand.findMany({
      where,
      orderBy: { slug: "asc" },
      include: {
        brandDrinks: {
          where: { isSignature: true },
          include: { drink: true },
        },
      },
    }),
    getTranslations({ locale }),
  ]);

  const countryCodes = Array.from(new Set(allBrands.map((b) => b.countryCode))).sort();

  // JSON-LD ItemList for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${t("brandList.title")} — ${t("site.name")}`,
    numberOfItems: brands.length,
    itemListElement: brands.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${locale}/brands/${b.slug}`,
      name: pickI18n(b.nameI18n, locale as Locale),
    })),
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <script
        type="application/ld+json"
        // 我們生成的是純資料、不含使用者輸入，dangerouslySetInnerHTML 安全
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {t("brandList.title")}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("brandList.subtitle", { count: allBrands.length })}
        </p>
      </header>

      <div className="mb-6">
        <FilterBar
          allLabel={t("brandList.filter.all")}
          clearLabel={t("brandList.filter.clear")}
          fields={[
            {
              key: "country",
              label: t("brandList.filter.country"),
              options: countryCodes.map((c) => ({
                value: c,
                label: localizeCountry(c, locale as Locale),
              })),
            },
            {
              key: "tier",
              label: t("brandList.filter.tier"),
              options: PRICE_TIERS.map((p) => ({
                value: p.toLowerCase(),
                label: t(`brandList.tier.${p.toLowerCase()}`),
              })),
            },
            {
              key: "model",
              label: t("brandList.filter.model"),
              options: BUSINESS_MODELS.map((m) => ({
                value: m.toLowerCase(),
                label: t(`brandList.model.${m.toLowerCase()}`),
              })),
            },
          ]}
        />
      </div>

      {brands.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          {t("brandList.empty")}
        </p>
      ) : (
        <EntityGrid>
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} locale={locale as Locale} />
          ))}
        </EntityGrid>
      )}
    </main>
  );
}
