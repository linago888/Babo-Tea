import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandCard } from "@/components/brand-card";
import { BrandLogo } from "@/components/brand-logo";
import { Breadcrumb } from "@/components/breadcrumb";
import { InfoList, InfoRow } from "@/components/info-row";
import { NewsListItem } from "@/components/news-list-item";
import { type Locale, localeMetadata, routing } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { formatCurrency, formatNumber } from "@/lib/intl";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

interface PageParams {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  const cities = await prisma.city.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return routing.locales.flatMap((locale) =>
    cities.map((c) => ({ locale, slug: c.slug })),
  );
}

async function getCityPage(slug: string) {
  return prisma.city.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      brandCities: {
        where: { status: "ACTIVE" },
        include: {
          brand: {
            include: {
              brandDrinks: { where: { isSignature: true }, include: { drink: true } },
            },
          },
        },
        orderBy: { storeCountCached: "desc" },
      },
      drinkCities: {
        include: { drink: true },
        orderBy: { popularityScore: "desc" },
        take: 10,
      },
      newsCities: {
        include: { news: { include: { source: true } } },
        orderBy: { news: { publishedAt: "desc" } },
        take: 8,
      },
      brandsHeadquartered: {
        where: { status: "PUBLISHED" },
        include: {
          brandDrinks: { where: { isSignature: true }, include: { drink: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const city = await prisma.city.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { nameI18n: true, descriptionI18n: true },
  });
  if (!city) return {};
  const name = pickI18n(city.nameI18n, locale as Locale);
  const description = pickI18n(city.descriptionI18n, locale as Locale);
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/cities/${slug}`,
    title: name,
    description: description || undefined,
  });
}

export default async function CityDetailPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const city = await getCityPage(slug);
  if (!city) notFound();

  const t = await getTranslations({ locale });
  const lc = locale as Locale;

  const name = pickI18n(city.nameI18n, lc);
  const description = pickI18n(city.descriptionI18n, lc);
  const country = localizeCountry(city.countryCode, lc);
  const avgPrice =
    city.avgPriceLocal && city.avgPriceCurrency
      ? formatCurrency(Number(city.avgPriceLocal), city.avgPriceCurrency, lc, {
          maximumFractionDigits: 0,
        })
      : null;

  const totalStores = city.brandCities.reduce(
    (sum, bc) => sum + (bc.storeCountCached ?? 0),
    0,
  );

  // SEO JSON-LD: Place + geo
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    ...(description ? { description } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: city.countryCode,
      ...(city.adminRegion ? { addressRegion: city.adminRegion } : {}),
      addressLocality: name,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: Number(city.lat),
      longitude: Number(city.lng),
    },
    url: `${SITE_URL}/${locale}/cities/${slug}`,
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />

      <Breadcrumb
        locale={lc}
        items={[
          { label: t("nav.cities"), path: "/cities" },
          { label: name },
        ]}
      />

      {/* ── Hero ── */}
      <header className="mt-4 mb-8 flex flex-col gap-3 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1
          className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
          lang={localeMetadata[lc].bcp47}
        >
          {name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <span>{country}</span>
          {city.adminRegion ? <span>· {city.adminRegion}</span> : null}
          {city.brandCities.length > 0 ? (
            <span>· {t("cityCard.brands", { count: city.brandCities.length })}</span>
          ) : null}
          {totalStores > 0 ? (
            <span>· {t("brandDetail.headerStats.totalStores", { count: totalStores })}</span>
          ) : null}
        </div>
        {city.marketMaturity ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${maturityTone(city.marketMaturity)}`}
            >
              {t(`cityList.maturity.${city.marketMaturity.toLowerCase()}`)}
            </span>
          </div>
        ) : null}
      </header>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-10 lg:col-span-2">
          {description ? (
            <Section title={t("cityDetail.sections.overview")}>
              <p className="whitespace-pre-line text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                {description}
              </p>
            </Section>
          ) : null}

          <Section title={t("cityDetail.sections.topDrinks")}>
            {city.drinkCities.length === 0 ? (
              <EmptyHint>{t("cityDetail.emptyState.drinks")}</EmptyHint>
            ) : (
              <ul className="flex flex-col gap-2">
                {city.drinkCities.map((dc) => (
                  <li key={dc.drinkId}>
                    <Link
                      href={`/${lc}/drinks/${dc.drink.slug}`}
                      prefetch={false}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
                    >
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                        {pickI18n(dc.drink.nameI18n, lc)}
                      </span>
                      <PopularityScore score={Number(dc.popularityScore ?? 0)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title={t("cityDetail.sections.recentNews")}
            action={
              city.newsCities.length > 0 ? (
                <Link
                  href={`/${lc}/news?city=${slug}`}
                  className="text-xs font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-400"
                >
                  {t("brandDetail.viewAllNews")}
                </Link>
              ) : null
            }
          >
            {city.newsCities.length === 0 ? (
              <EmptyHint>{t("cityDetail.emptyState.news")}</EmptyHint>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {city.newsCities.map((nc) => (
                  <NewsListItem
                    key={nc.newsId}
                    news={nc.news}
                    locale={lc}
                    relevance={nc.relevance}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-8">
          <Section title={t("cityDetail.sections.basicInfo")}>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <InfoList>
                <InfoRow label={t("cityDetail.headerStats.country")}>{country}</InfoRow>
                {city.adminRegion ? (
                  <InfoRow label="Region">{city.adminRegion}</InfoRow>
                ) : null}
                <InfoRow label={t("cityDetail.headerStats.timezone")}>
                  {city.timezone}
                </InfoRow>
                {city.population ? (
                  <InfoRow label="Population">
                    {formatNumber(city.population, lc)}
                  </InfoRow>
                ) : null}
                {avgPrice ? <InfoRow label="Avg. cup">{avgPrice}</InfoRow> : null}
                <InfoRow label="Coordinates">
                  <span className="font-mono text-xs">
                    {Number(city.lat).toFixed(3)}, {Number(city.lng).toFixed(3)}
                  </span>
                </InfoRow>
              </InfoList>
            </div>
          </Section>

          <Section
            title={t("cityDetail.sections.activeBrands")}
            action={
              <Link
                href={`/${lc}/brands?country=${city.countryCode}`}
                className="text-xs font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-400"
              >
                {t("cityDetail.viewAllBrands")}
              </Link>
            }
          >
            {city.brandCities.length === 0 ? (
              <EmptyHint>{t("cityDetail.emptyState.brands")}</EmptyHint>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {city.brandCities.map((bc) => (
                  <li key={bc.brandId}>
                    <Link
                      href={`/${lc}/brands/${bc.brand.slug}`}
                      prefetch={false}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                      <BrandLogo
                        slug={bc.brand.slug}
                        nameI18n={bc.brand.nameI18n}
                        logoUrl={bc.brand.logoUrl}
                        locale={lc}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-neutral-800 dark:text-neutral-200">
                        {pickI18n(bc.brand.nameI18n, lc)}
                      </span>
                      {bc.storeCountCached ? (
                        <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                          {t("brandDetail.headerStats.totalStores", { count: bc.storeCountCached })}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>

      {/* ── Brands headquartered ── */}
      {city.brandsHeadquartered.length > 0 ? (
        <section className="mt-12 border-t border-neutral-200 pt-10 dark:border-neutral-800">
          <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {t("cityDetail.sections.headquartered")}
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {city.brandsHeadquartered.map((b) => (
              <BrandCard key={b.id} brand={b} locale={lc} />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </h2>
        {action}
      </div>
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
      title="Popularity score"
    >
      {rounded}
    </span>
  );
}

function maturityTone(level: string): string {
  switch (level) {
    case "SATURATED":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
    case "MATURE":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "GROWING":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
    case "EMERGING":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}
