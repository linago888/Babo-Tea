import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { CityCard } from "@/components/city-card";
import { DrinkCard } from "@/components/drink-card";
import { NewsCard } from "@/components/news-card";
import { type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { formatNumber } from "@/lib/intl";
import { prisma } from "@/lib/prisma";

export const revalidate = 600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lc = locale as Locale;
  const t = await getTranslations({ locale });

  // 並行抓所有區塊資料
  const [
    brandCount,
    cityCount,
    drinkCount,
    newsCount,
    latestNews,
    featuredBrandsRaw,
    popularCitiesRaw,
    trendingDrinksRaw,
  ] = await Promise.all([
    prisma.brand.count({ where: { status: "PUBLISHED" } }),
    prisma.city.count({ where: { status: "PUBLISHED" } }),
    prisma.drink.count({ where: { status: "PUBLISHED" } }),
    prisma.news.count({ where: { status: "PUBLISHED" } }),
    prisma.news.findMany({
      where: { status: "PUBLISHED" },
      include: { source: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    // featured brands: 依當地總店數最多的前 3 個
    prisma.brand.findMany({
      where: { status: "PUBLISHED" },
      include: {
        brandDrinks: { where: { isSignature: true }, include: { drink: true } },
        brandCities: true,
      },
    }),
    // popular cities: 依 active brand 數最多的前 3 個
    prisma.city.findMany({
      where: { status: "PUBLISHED" },
      include: {
        _count: { select: { brandCities: { where: { status: "ACTIVE" } } } },
      },
    }),
    // trending drinks: 依 drink_cities 總 popularity_score 最高
    prisma.drink.findMany({
      where: { status: "PUBLISHED" },
      include: {
        drinkCities: { select: { popularityScore: true } },
        _count: { select: { brandDrinks: true } },
      },
    }),
  ]);

  // sort & take 3
  const featuredBrands = featuredBrandsRaw
    .map((b) => ({
      ...b,
      _storeTotal: b.brandCities.reduce(
        (sum, bc) => sum + (bc.storeCountCached ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b._storeTotal - a._storeTotal)
    .slice(0, 3);

  const popularCities = popularCitiesRaw
    .sort(
      (a, b) => (b._count?.brandCities ?? 0) - (a._count?.brandCities ?? 0),
    )
    .slice(0, 3);

  const trendingDrinks = trendingDrinksRaw
    .map((d) => ({
      ...d,
      _trendScore: d.drinkCities.reduce(
        (sum, dc) => sum + Number(dc.popularityScore ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b._trendScore - a._trendScore)
    .slice(0, 3);

  return (
    <main className="flex-1">
      {/* ── Hero ── */}
      <section className="border-b border-neutral-200 bg-gradient-to-br from-amber-50 via-white to-amber-50 px-6 py-16 dark:border-neutral-800 dark:from-amber-950/40 dark:via-neutral-950 dark:to-amber-950/40">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-amber-700 dark:text-amber-400">
            {t("site.name")}
          </p>
          <h1
            className="text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl dark:text-neutral-50"
          >
            {t("home.headline")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
            {t("home.lede")}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${lc}/brands`}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {t("home.explore_brands")} →
            </Link>
            <Link
              href={`/${lc}/cities`}
              className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
            >
              {t("home.explore_cities")}
            </Link>
            <Link
              href={`/${lc}/drinks`}
              className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
            >
              {t("home.explore_drinks")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="border-b border-neutral-200 bg-white px-6 py-8 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label={t("home.metrics.brands")} value={brandCount} locale={lc} href={`/${lc}/brands`} />
          <Metric label={t("home.metrics.cities")} value={cityCount} locale={lc} href={`/${lc}/cities`} />
          <Metric label={t("home.metrics.drinks")} value={drinkCount} locale={lc} href={`/${lc}/drinks`} />
          <Metric label={t("home.metrics.news")} value={newsCount} locale={lc} href={`/${lc}/news`} />
        </div>
      </section>

      {/* ── Latest news ── */}
      <Section
        title={t("home.sections.latestNews")}
        action={
          <Link
            href={`/${lc}/news`}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            {t("home.viewAll.news")}
          </Link>
        }
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestNews.map((n) => (
            <NewsCard key={n.id} news={n} locale={lc} />
          ))}
        </ul>
      </Section>

      {/* ── Featured brands ── */}
      <Section
        title={t("home.sections.featuredBrands")}
        action={
          <Link
            href={`/${lc}/brands`}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            {t("home.viewAll.brands")}
          </Link>
        }
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {featuredBrands.map((b) => {
            const signatures = b.brandDrinks
              .map((bd) => pickI18n(bd.drink.nameI18n, lc))
              .slice(0, 2);
            return (
              <li key={b.id}>
                <Link
                  href={`/${lc}/brands/${b.slug}`}
                  prefetch={false}
                  className="flex h-full items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
                >
                  <BrandLogo
                    slug={b.slug}
                    nameI18n={b.nameI18n}
                    logoUrl={b.logoUrl}
                    locale={lc}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                      {pickI18n(b.nameI18n, lc)}
                    </h3>
                    {signatures.length > 0 ? (
                      <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        ★ {signatures.join(" · ")}
                      </p>
                    ) : null}
                    {b._storeTotal > 0 ? (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {t("brandDetail.headerStats.totalStores", { count: b._storeTotal })}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── Popular cities ── */}
      <Section
        title={t("home.sections.popularCities")}
        action={
          <Link
            href={`/${lc}/cities`}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            {t("home.viewAll.cities")}
          </Link>
        }
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {popularCities.map((c) => (
            <CityCard key={c.id} city={c} locale={lc} />
          ))}
        </ul>
      </Section>

      {/* ── Trending drinks ── */}
      <Section
        title={t("home.sections.trendingDrinks")}
        action={
          <Link
            href={`/${lc}/drinks`}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            {t("home.viewAll.drinks")}
          </Link>
        }
      >
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {trendingDrinks.map((d) => (
            <DrinkCard key={d.id} drink={d} locale={lc} />
          ))}
        </ul>
      </Section>

      {/* ── Newsletter ── */}
      <section className="border-t border-neutral-200 bg-neutral-50 px-6 py-14 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {t("home.sections.newsletter")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
            {t("home.newsletter.blurb")}
          </p>
          <form
            className="mx-auto mt-6 flex max-w-md gap-2"
            // 暫不串後端；Phase 3 接 Resend / Buttondown 之類服務
            action="#"
            method="post"
            aria-describedby="newsletter-hint"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              {t("home.newsletter.placeholder")}
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              placeholder={t("home.newsletter.placeholder")}
              required
              disabled
              className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm transition focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
            />
            <button
              type="submit"
              disabled
              className="cursor-not-allowed rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {t("home.newsletter.subscribe")}
            </button>
          </form>
          <p id="newsletter-hint" className="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
            {t("home.newsletter.soon")}
          </p>
        </div>
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
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  locale,
  href,
}: {
  label: string;
  value: number;
  locale: Locale;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start gap-0.5 rounded-lg p-3 transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
    >
      <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50 sm:text-3xl">
        {formatNumber(value, locale)}
      </span>
      <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
    </Link>
  );
}
