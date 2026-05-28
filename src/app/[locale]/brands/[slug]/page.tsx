import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandCard } from "@/components/brand-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { DrinkChip } from "@/components/drink-chip";
import { InfoList, InfoRow } from "@/components/info-row";
import { NewsListItem } from "@/components/news-list-item";
import { type Locale, localeMetadata, routing } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { formatDate } from "@/lib/intl";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

interface PageParams {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  // 預先靜態化所有 published 品牌 × 4 locale
  const brands = await prisma.brand.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return routing.locales.flatMap((locale) =>
    brands.map((b) => ({ locale, slug: b.slug })),
  );
}

async function getBrandPage(slug: string) {
  return prisma.brand.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      headquartersCity: true,
      brandDrinks: {
        include: { drink: true },
        orderBy: [{ isSignature: "desc" }, { drinkId: "asc" }],
      },
      brandCities: {
        where: { status: "ACTIVE" },
        include: { city: true },
        orderBy: [{ storeCountCached: "desc" }],
      },
      newsBrands: {
        include: { news: { include: { source: true } } },
        orderBy: { news: { publishedAt: "desc" } },
        take: 8,
      },
      similaritiesAsA: {
        include: {
          brandB: {
            include: {
              brandDrinks: { where: { isSignature: true }, include: { drink: true } },
            },
          },
        },
        orderBy: { score: "desc" },
        take: 4,
      },
      similaritiesAsB: {
        include: {
          brandA: {
            include: {
              brandDrinks: { where: { isSignature: true }, include: { drink: true } },
            },
          },
        },
        orderBy: { score: "desc" },
        take: 4,
      },
      brandCompanies: {
        include: { company: true },
        orderBy: { since: "desc" },
      },
    },
  });
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const brand = await prisma.brand.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { nameI18n: true, descriptionI18n: true },
  });
  if (!brand) return {};
  const name = pickI18n(brand.nameI18n, locale as Locale);
  const description = pickI18n(brand.descriptionI18n, locale as Locale);
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/brands/${slug}`,
    title: name,
    description: description || undefined,
  });
}

export default async function BrandDetailPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const brand = await getBrandPage(slug);
  if (!brand) notFound();

  const t = await getTranslations({ locale });
  const lc = locale as Locale;

  const name = pickI18n(brand.nameI18n, lc);
  const description = pickI18n(brand.descriptionI18n, lc);
  const countryName = localizeCountry(brand.countryCode, lc);

  const signatureDrinks = brand.brandDrinks.filter((bd) => bd.isSignature);
  const otherDrinks = brand.brandDrinks.filter((bd) => !bd.isSignature);
  const activeCities = brand.brandCities;
  const recentNews = brand.newsBrands;

  // 合併雙向 similarity（schema 端 brandAId < brandBId，所以一個品牌可能在 A 或 B）
  const similarBrands = [
    ...brand.similaritiesAsA.map((s) => ({ score: s.score, brand: s.brandB })),
    ...brand.similaritiesAsB.map((s) => ({ score: s.score, brand: s.brandA })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // 母公司：取目前生效（until = null 或未來）
  const today = new Date();
  const currentParent = brand.brandCompanies.find(
    (bc) =>
      ["OWNER", "PARENT"].includes(bc.relation) &&
      (bc.until === null || new Date(bc.until) > today),
  );

  const totalStoreCount = activeCities.reduce(
    (acc, bc) => acc + (bc.storeCountCached ?? 0),
    0,
  );

  // ── SEO JSON-LD ──
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: `${SITE_URL}/${locale}/brands/${slug}`,
    ...(brand.officialWebsite ? { sameAs: [brand.officialWebsite] } : {}),
    ...(description ? { description } : {}),
    ...(brand.foundedYear ? { foundingDate: String(brand.foundedYear) } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: brand.countryCode,
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <Breadcrumb
        locale={lc}
        items={[
          { label: t("nav.brands"), path: "/brands" },
          { label: name },
        ]}
      />

      {/* ── Hero ── */}
      <header className="mt-4 mb-8 flex flex-col gap-3 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50"
            lang={localeMetadata[lc].bcp47}
          >
            {name}
          </h1>
          {brand.verified ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              ✓ verified
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <span>{countryName}</span>
          {brand.foundedYear ? (
            <span>· {t("brandDetail.headerStats.founded", { year: brand.foundedYear })}</span>
          ) : null}
          {totalStoreCount > 0 ? (
            <span>· {t("brandDetail.headerStats.totalStores", { count: totalStoreCount })}</span>
          ) : null}
          {activeCities.length > 0 ? (
            <span>
              · {t("brandDetail.headerStats.activeCities", { count: activeCities.length })}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge>{t(`brandList.tier.${brand.priceTier.toLowerCase()}`)}</Badge>
          <Badge>{t(`brandList.model.${brand.businessModel.toLowerCase()}`)}</Badge>
          {brand.positioningTags.map((tag) => (
            <Badge key={tag} tone="amber">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-10 lg:col-span-2">
          {description ? (
            <Section title={t("brandDetail.sections.story")}>
              <p className="whitespace-pre-line text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
                {description}
              </p>
            </Section>
          ) : null}

          <Section title={t("brandDetail.sections.signatureDrinks")}>
            {signatureDrinks.length === 0 ? (
              <EmptyHint>{t("brandDetail.emptyState.drinks")}</EmptyHint>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {signatureDrinks.map((bd) => (
                  <li key={bd.drinkId}>
                    <DrinkChip drink={bd.drink} brandDrink={bd} locale={lc} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {otherDrinks.length > 0 ? (
            <Section title={t("brandDetail.sections.allDrinks")}>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {otherDrinks.map((bd) => (
                  <li key={bd.drinkId}>
                    <DrinkChip drink={bd.drink} brandDrink={bd} locale={lc} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section
            title={t("brandDetail.sections.recentNews")}
            action={
              recentNews.length > 0 ? (
                <Link
                  href={`/${locale}/news?brand=${slug}`}
                  className="text-xs font-medium text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-400"
                >
                  {t("brandDetail.viewAllNews")}
                </Link>
              ) : null
            }
          >
            {recentNews.length === 0 ? (
              <EmptyHint>{t("brandDetail.emptyState.news")}</EmptyHint>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {recentNews.map((nb) => (
                  <NewsListItem
                    key={nb.newsId}
                    news={nb.news}
                    locale={lc}
                    relevance={nb.relevance}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-8">
          <Section title={t("brandDetail.sections.basicInfo")}>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <InfoList>
                <InfoRow label={t("brandDetail.headerStats.country")}>
                  {countryName}
                </InfoRow>
                {brand.foundedYear ? (
                  <InfoRow label="Founded">{brand.foundedYear}</InfoRow>
                ) : null}
                {brand.headquartersCity ? (
                  <InfoRow label="HQ">
                    <Link
                      href={`/${locale}/cities/${brand.headquartersCity.slug}`}
                      className="text-amber-700 hover:underline dark:text-amber-300"
                    >
                      {pickI18n(brand.headquartersCity.nameI18n, lc)}
                    </Link>
                  </InfoRow>
                ) : null}
                <InfoRow label="Business model">
                  {t(`brandList.model.${brand.businessModel.toLowerCase()}`)}
                </InfoRow>
                <InfoRow label="Price tier">
                  {t(`brandList.tier.${brand.priceTier.toLowerCase()}`)}
                </InfoRow>
                {brand.officialWebsite ? (
                  <InfoRow label={t("brandDetail.officialSite")}>
                    <a
                      href={brand.officialWebsite}
                      target="_blank"
                      rel="noreferrer noopener nofollow"
                      className="text-amber-700 hover:underline dark:text-amber-300"
                    >
                      ↗
                    </a>
                  </InfoRow>
                ) : null}
              </InfoList>
            </div>
          </Section>

          <Section title={t("brandDetail.sections.cities")}>
            {activeCities.length === 0 ? (
              <EmptyHint>{t("brandDetail.emptyState.cities")}</EmptyHint>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {activeCities.map((bc) => (
                  <li key={bc.cityId}>
                    <Link
                      href={`/${locale}/cities/${bc.city.slug}`}
                      prefetch={false}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    >
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {pickI18n(bc.city.nameI18n, lc)}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {bc.storeCountCached
                          ? t("brandDetail.headerStats.totalStores", { count: bc.storeCountCached })
                          : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {currentParent ? (
            <Section title={t("brandDetail.sections.parentCompany")}>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="font-medium text-neutral-900 dark:text-neutral-50">
                  {pickI18n(currentParent.company.nameI18n, lc)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {t("brandDetail.currentSince", {
                    since: formatDate(currentParent.since, lc, { year: "numeric", month: "short" }),
                  })}
                  {currentParent.company.stockTicker
                    ? ` · ${currentParent.company.stockTicker}`
                    : ""}
                </p>
              </div>
            </Section>
          ) : null}
        </aside>
      </div>

      {/* ── Similar brands ── */}
      <section className="mt-12 border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          {t("brandDetail.sections.similarBrands")}
        </h2>
        {similarBrands.length === 0 ? (
          <EmptyHint>{t("brandDetail.emptyState.similar")}</EmptyHint>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similarBrands.map(({ brand: similar }) => (
              <BrandCard key={similar.id} brand={similar} locale={lc} />
            ))}
          </ul>
        )}
      </section>
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

function Badge({ children, tone }: { children: React.ReactNode; tone?: "amber" }) {
  const base =
    tone === "amber"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${base}`}>
      {children}
    </span>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
      {children}
    </p>
  );
}
