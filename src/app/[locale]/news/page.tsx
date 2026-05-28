import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityGrid } from "@/components/entity-grid";
import { FilterBar } from "@/components/filter-bar";
import { NewsCard } from "@/components/news-card";
import type { NewsCategory } from "@/generated/prisma/enums";
import { type Locale, routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

type SearchParams = { [k: string]: string | string[] | undefined };

const CATEGORIES: NewsCategory[] = [
  "EXPANSION",
  "LAUNCH",
  "FRANCHISE_INVESTMENT",
  "CITY_MARKET",
  "TREND",
  "SUPPLY_CHAIN",
  "CULTURE",
];

export const revalidate = 600; // news 變動較快，10 分鐘 ISR

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
    path: "/news",
    title: `${t("newsList.title")} — ${t("site.name")}`,
    description: t("site.description"),
  });
}

function parse(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function NewsListPage({
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
  const cat = parse(sp, "category")?.toUpperCase() as NewsCategory | undefined;
  const brandSlug = parse(sp, "brand");
  const citySlug = parse(sp, "city");
  const drinkSlug = parse(sp, "drink");

  const validCategory = cat && CATEGORIES.includes(cat) ? cat : undefined;

  // scope filters: 用 some + slug 對應到關聯表
  const where = {
    status: "PUBLISHED" as const,
    ...(validCategory ? { category: validCategory } : {}),
    ...(brandSlug ? { newsBrands: { some: { brand: { slug: brandSlug } } } } : {}),
    ...(citySlug ? { newsCities: { some: { city: { slug: citySlug } } } } : {}),
    ...(drinkSlug ? { newsDrinks: { some: { drink: { slug: drinkSlug } } } } : {}),
  };

  const [totalCount, news, scope, t] = await Promise.all([
    prisma.news.count({ where: { status: "PUBLISHED" } }),
    prisma.news.findMany({
      where,
      include: { source: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
    // 取 scope 名稱以顯示「now showing news about Brand X」chip
    (async () => {
      if (brandSlug) {
        const b = await prisma.brand.findUnique({
          where: { slug: brandSlug },
          select: { nameI18n: true, slug: true },
        });
        return b ? { kind: "brand" as const, ...b } : null;
      }
      if (citySlug) {
        const c = await prisma.city.findUnique({
          where: { slug: citySlug },
          select: { nameI18n: true, slug: true },
        });
        return c ? { kind: "city" as const, ...c } : null;
      }
      if (drinkSlug) {
        const d = await prisma.drink.findUnique({
          where: { slug: drinkSlug },
          select: { nameI18n: true, slug: true },
        });
        return d ? { kind: "drink" as const, ...d } : null;
      }
      return null;
    })(),
    getTranslations({ locale }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${t("newsList.title")} — ${t("site.name")}`,
    numberOfItems: news.length,
    itemListElement: news.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${locale}/news/${n.slug}`,
      name: pickI18n(n.titleI18n, locale as Locale),
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
          {t("newsList.title")}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t("newsList.subtitle", { count: totalCount })}
        </p>
      </header>

      {scope ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {t(`newsList.scope.${scope.kind}`, {
              name: pickI18n(scope.nameI18n, locale as Locale),
            })}
          </span>
          <Link
            href={`/${locale}/news`}
            className="text-xs text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-400"
          >
            {t("newsList.scope.clear")}
          </Link>
        </div>
      ) : null}

      <div className="mb-6">
        <FilterBar
          allLabel={t("newsList.filter.all")}
          clearLabel={t("newsList.filter.clear")}
          fields={[
            {
              key: "category",
              label: t("newsList.filter.category"),
              options: CATEGORIES.map((c) => ({
                value: c.toLowerCase(),
                label: t(`newsList.category.${c.toLowerCase()}`),
              })),
            },
          ]}
        />
      </div>

      {news.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          {t("newsList.empty")}
        </p>
      ) : (
        <EntityGrid>
          {news.map((n) => (
            <NewsCard key={n.id} news={n} locale={locale as Locale} />
          ))}
        </EntityGrid>
      )}
    </main>
  );
}
