import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { DrinkCard } from "@/components/drink-card";
import { EntityGrid } from "@/components/entity-grid";
import { FilterBar } from "@/components/filter-bar";
import type { DrinkCategory } from "@/generated/prisma/enums";
import { type Locale, routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { loadTaxonomyLabels, taxonomyLabel } from "@/lib/taxonomy";

type SearchParams = { [k: string]: string | string[] | undefined };

const CATEGORIES: DrinkCategory[] = [
  "MILK_TEA",
  "FRUIT_TEA",
  "PURE_TEA",
  "CHEESE_TEA",
  "COFFEE_TEA",
  "SMOOTHIE",
  "OTHER",
];

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
    path: "/drinks",
    title: `${t("drinkList.title")} — ${t("site.name")}`,
    description: t("site.description"),
  });
}

function parse(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function DrinksPage({
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
  const cat = parse(sp, "category")?.toUpperCase() as DrinkCategory | undefined;
  const teaBase = parse(sp, "tea");
  const caffeine = parse(sp, "caffeine"); // 'with' | 'without'

  const validCategory = cat && CATEGORIES.includes(cat) ? cat : undefined;

  const where = {
    status: "PUBLISHED" as const,
    ...(validCategory ? { category: validCategory } : {}),
    ...(teaBase ? { teaBase: { has: teaBase } } : {}),
    ...(caffeine === "without" ? { caffeineMgMax: 0 } : {}),
    ...(caffeine === "with" ? { caffeineMgMax: { gt: 0 } } : {}),
  };

  const [allDrinks, drinks, taxonomyLabels, t] = await Promise.all([
    prisma.drink.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true },
    }),
    prisma.drink.findMany({
      where,
      orderBy: { slug: "asc" },
      include: { _count: { select: { brandDrinks: true } } },
    }),
    loadTaxonomyLabels(),
    getTranslations({ locale }),
  ]);

  // tea_base 篩選的選項：從 taxonomies 取所有 TEA_BASE 的 code
  const teaBaseOptions: Array<{ value: string; label: string }> = [];
  for (const [key] of taxonomyLabels) {
    if (key.startsWith("TEA_BASE:")) {
      const code = key.split(":")[1];
      teaBaseOptions.push({
        value: code,
        label: taxonomyLabel(taxonomyLabels, "TEA_BASE", code, locale as Locale),
      });
    }
  }
  teaBaseOptions.sort((a, b) => a.label.localeCompare(b.label));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${t("drinkList.title")} — ${t("site.name")}`,
    numberOfItems: drinks.length,
    itemListElement: drinks.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${locale}/drinks/${d.slug}`,
      name: pickI18n(d.nameI18n, locale as Locale),
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
          {t("drinkList.title")}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("drinkList.subtitle", { count: allDrinks.length })}
        </p>
      </header>

      <div className="mb-6">
        <FilterBar
          allLabel={t("drinkList.filter.all")}
          clearLabel={t("drinkList.filter.clear")}
          fields={[
            {
              key: "category",
              label: t("drinkList.filter.category"),
              options: CATEGORIES.map((c) => ({
                value: c.toLowerCase(),
                label: t(`drinkList.category.${c.toLowerCase()}`),
              })),
            },
            {
              key: "tea",
              label: t("drinkList.filter.teaBase"),
              options: teaBaseOptions,
            },
            {
              key: "caffeine",
              label: t("drinkList.filter.caffeine"),
              options: [
                { value: "with", label: t("drinkList.caffeine.with") },
                { value: "without", label: t("drinkList.caffeine.without") },
              ],
            },
          ]}
        />
      </div>

      {drinks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          {t("drinkList.empty")}
        </p>
      ) : (
        <EntityGrid>
          {drinks.map((drink) => (
            <DrinkCard key={drink.id} drink={drink} locale={locale as Locale} />
          ))}
        </EntityGrid>
      )}
    </main>
  );
}
