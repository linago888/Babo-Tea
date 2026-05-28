import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Breadcrumb } from "@/components/breadcrumb";
import { FlavorRadar } from "@/components/flavor-radar";
import { InfoList, InfoRow } from "@/components/info-row";
import { NewsListItem } from "@/components/news-list-item";
import { type Locale, localeMetadata, routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { formatCurrency } from "@/lib/intl";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { loadTaxonomyLabels, taxonomyLabel } from "@/lib/taxonomy";

interface PageParams {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const drinks = await prisma.drink.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return routing.locales.flatMap((locale) =>
    drinks.map((d) => ({ locale, slug: d.slug })),
  );
}

async function getDrinkPage(slug: string) {
  return prisma.drink.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      brandDrinks: {
        include: { brand: true },
        orderBy: [{ isSignature: "desc" }, { priceLocal: "asc" }],
      },
      drinkCities: {
        include: { city: true },
        orderBy: { popularityScore: "desc" },
        take: 6,
      },
      newsDrinks: {
        include: { news: { include: { source: true } } },
        orderBy: { news: { publishedAt: "desc" } },
        take: 6,
      },
    },
  });
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const drink = await prisma.drink.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { nameI18n: true, descriptionI18n: true },
  });
  if (!drink) return {};
  const name = pickI18n(drink.nameI18n, locale as Locale);
  const description = pickI18n(drink.descriptionI18n, locale as Locale);
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/drinks/${slug}`,
    title: name,
    description: description || undefined,
    og: { kind: "drink", slug },
  });
}

export default async function DrinkDetailPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [drink, taxonomyLabels, t] = await Promise.all([
    getDrinkPage(slug),
    loadTaxonomyLabels(),
    getTranslations({ locale }),
  ]);
  if (!drink) notFound();
  const lc = locale as Locale;

  const name = pickI18n(drink.nameI18n, lc);
  const description = pickI18n(drink.descriptionI18n, lc);

  // 配方 — 把 taxonomy code 轉成 locale 化標籤
  const teaBaseLabels = drink.teaBase.map((c) => taxonomyLabel(taxonomyLabels, "TEA_BASE", c, lc));
  const milkLabel = drink.milkType
    ? taxonomyLabel(taxonomyLabels, "MILK_TYPE", drink.milkType, lc)
    : null;
  const toppingLabels = drink.toppings.map((c) => taxonomyLabel(taxonomyLabels, "TOPPING", c, lc));
  const sweetenerLabel = drink.sweetener
    ? taxonomyLabel(taxonomyLabels, "SWEETENER", drink.sweetener, lc)
    : null;

  const flavorProfile = (drink.flavorProfile as Record<string, number> | null) ?? null;
  const hasFlavor =
    flavorProfile && Object.values(flavorProfile).some((v) => typeof v === "number" && v > 0);

  // 卡路里 / 咖啡因區間
  const calRange =
    drink.caloriesKcalMin !== null && drink.caloriesKcalMax !== null
      ? `${drink.caloriesKcalMin}–${drink.caloriesKcalMax} kcal`
      : null;
  const caffeineRange =
    drink.caffeineMgMin !== null && drink.caffeineMgMax !== null
      ? drink.caffeineMgMax === 0
        ? t("drinkCard.caffeineFree")
        : `${drink.caffeineMgMin}–${drink.caffeineMgMax} mg`
      : null;

  // SEO JSON-LD：Article 用於百科內容
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: name,
    ...(description ? { description } : {}),
    inLanguage: localeMetadata[lc].bcp47,
    url: `${SITE_URL}/${locale}/drinks/${slug}`,
    about: {
      "@type": "Thing",
      name,
      category: drink.category.toLowerCase().replace("_", " "),
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        locale={lc}
        items={[
          { label: t("nav.drinks"), path: "/drinks" },
          { label: name },
        ]}
      />

      {/* ── Hero ── */}
      <header className="mt-4 mb-8 flex flex-col gap-3 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <span className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
          {t(`drinkList.category.${drink.category.toLowerCase()}`)}
        </span>
        <h1
          className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
          lang={localeMetadata[lc].bcp47}
        >
          {name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          {calRange ? <span>{calRange}</span> : null}
          {caffeineRange ? <span>· {caffeineRange}</span> : null}
          {drink.temperature.length > 0 ? (
            <span>
              ·{" "}
              {drink.temperature
                .map((tmp) => t(`drinkList.temperature.${tmp.toLowerCase()}`))
                .join(" / ")}
            </span>
          ) : null}
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-10 lg:col-span-2">
          {description ? (
            <Section title={t("drinkDetail.sections.story")}>
              <p className="whitespace-pre-line text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                {description}
              </p>
            </Section>
          ) : null}

          {hasFlavor && flavorProfile ? (
            <Section title={t("drinkDetail.sections.flavorProfile")}>
              <FlavorRadar profile={flavorProfile} locale={lc} />
            </Section>
          ) : null}

          <Section title={t("drinkDetail.sections.brandPrices")}>
            {drink.brandDrinks.length === 0 ? (
              <EmptyHint>{t("drinkDetail.emptyState.brands")}</EmptyHint>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {drink.brandDrinks.map((bd) => (
                  <li key={bd.brandId}>
                    <Link
                      href={`/${lc}/brands/${bd.brand.slug}`}
                      prefetch={false}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
                    >
                      <BrandLogo
                        slug={bd.brand.slug}
                        nameI18n={bd.brand.nameI18n}
                        logoUrl={bd.brand.logoUrl}
                        locale={lc}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                          {pickI18n(bd.brand.nameI18n, lc)}
                          {bd.isSignature ? (
                            <span className="ml-2 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              ★ {t("drinkDetail.signature")}
                            </span>
                          ) : null}
                        </p>
                        {bd.localNameI18n ? (
                          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {pickI18n(bd.localNameI18n, lc)}
                          </p>
                        ) : null}
                      </div>
                      {bd.priceLocal && bd.priceCurrency ? (
                        <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
                          {formatCurrency(Number(bd.priceLocal), bd.priceCurrency, lc, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("drinkDetail.sections.recentNews")}>
            {drink.newsDrinks.length === 0 ? (
              <EmptyHint>{t("drinkDetail.emptyState.news")}</EmptyHint>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {drink.newsDrinks.map((nd) => (
                  <NewsListItem
                    key={nd.newsId}
                    news={nd.news}
                    locale={lc}
                    relevance={nd.relevance}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-8">
          <Section title={t("drinkDetail.sections.recipe")}>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <InfoList>
                {teaBaseLabels.length > 0 ? (
                  <InfoRow label={t("drinkDetail.recipe.teaBase")}>
                    {teaBaseLabels.join(" + ")}
                  </InfoRow>
                ) : null}
                {milkLabel ? (
                  <InfoRow label={t("drinkDetail.recipe.milkType")}>{milkLabel}</InfoRow>
                ) : null}
                {toppingLabels.length > 0 ? (
                  <InfoRow label={t("drinkDetail.recipe.toppings")}>
                    {toppingLabels.join(" · ")}
                  </InfoRow>
                ) : null}
                {sweetenerLabel ? (
                  <InfoRow label={t("drinkDetail.recipe.sweetener")}>{sweetenerLabel}</InfoRow>
                ) : null}
                {drink.temperature.length > 0 ? (
                  <InfoRow label={t("drinkDetail.recipe.temperature")}>
                    {drink.temperature
                      .map((tmp) => t(`drinkList.temperature.${tmp.toLowerCase()}`))
                      .join(" / ")}
                  </InfoRow>
                ) : null}
                {drink.typicalSugarLevels.length > 0 ? (
                  <InfoRow label={t("drinkDetail.recipe.sugar")}>
                    {drink.typicalSugarLevels.map((s) => `${s}%`).join(" · ")}
                  </InfoRow>
                ) : null}
              </InfoList>
            </div>
          </Section>

          <Section title={t("drinkDetail.sections.topCities")}>
            {drink.drinkCities.length === 0 ? (
              <EmptyHint>{t("drinkDetail.emptyState.cities")}</EmptyHint>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {drink.drinkCities.map((dc) => (
                  <li key={dc.cityId}>
                    <Link
                      href={`/${lc}/cities/${dc.city.slug}`}
                      prefetch={false}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {pickI18n(dc.city.nameI18n, lc)}
                      </span>
                      <PopularityScore score={Number(dc.popularityScore ?? 0)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
      {children}
    </p>
  );
}

function PopularityScore({ score }: { score: number }) {
  const rounded = Math.round(score);
  const intensity =
    rounded >= 80
      ? "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
      : rounded >= 60
        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
        : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${intensity}`}
    >
      {rounded}
    </span>
  );
}
