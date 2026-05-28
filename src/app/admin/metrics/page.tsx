import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Sparkline } from "@/components/admin/sparkline";
import { getAdminLocale } from "@/lib/admin-i18n";
import { getTopByMetric, type TopEntity } from "@/lib/admin-metrics";
import { type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMetricsPage() {
  const locale = (await getAdminLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.metrics" });

  const [topBrandsTrending, topBrandsNews, topCities, topDrinks, totalRows] = await Promise.all([
    getTopByMetric("brand", "trending_score", { limit: 10 }),
    getTopByMetric("brand", "news_count_30d", { limit: 10 }),
    getTopByMetric("city", "popularity_score", { limit: 10 }),
    getTopByMetric("drink", "popularity_score", { limit: 10 }),
    prisma.metricDaily.count(),
  ]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {t("subtitle", { total: totalRows })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <MetricSection
          title={t("topBrandsTrending")}
          hint={t("topBrandsTrendingHint")}
          rows={topBrandsTrending}
          locale={locale}
          adminPathFor={(slug, id) => `/admin/brands/${id}`}
          formatValue={(v) => v.toFixed(0)}
        />
        <MetricSection
          title={t("topBrandsNews")}
          hint={t("topBrandsNewsHint")}
          rows={topBrandsNews}
          locale={locale}
          adminPathFor={(slug, id) => `/admin/brands/${id}`}
          formatValue={(v) => v.toFixed(0)}
        />
        <MetricSection
          title={t("topCities")}
          hint={t("topCitiesHint")}
          rows={topCities}
          locale={locale}
          adminPathFor={(slug, id) => `/admin/cities/${id}`}
          formatValue={(v) => v.toFixed(0)}
        />
        <MetricSection
          title={t("topDrinks")}
          hint={t("topDrinksHint")}
          rows={topDrinks}
          locale={locale}
          adminPathFor={(slug, id) => `/admin/drinks/${id}`}
          formatValue={(v) => v.toFixed(0)}
        />
      </div>

      <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-500">{t("footnote")}</p>
    </>
  );
}

function MetricSection({
  title,
  hint,
  rows,
  locale,
  adminPathFor,
  formatValue,
}: {
  title: string;
  hint: string;
  rows: TopEntity[];
  locale: Locale;
  adminPathFor: (slug: string, id: string) => string;
  formatValue: (v: number) => string;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 mb-4 text-xs text-neutral-500 dark:text-neutral-500">{hint}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-500">No data yet. Run <code>pnpm metrics:run</code>.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, idx) => {
            const name = pickI18n(r.nameI18n, locale, { fallback: r.slug });
            const delta = r.previous !== null ? r.latest - r.previous : null;
            const deltaClass =
              delta === null
                ? "text-neutral-400"
                : delta > 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : delta < 0
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-neutral-500";
            const deltaIcon = delta === null ? "—" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
            return (
              <li
                key={r.id}
                className="grid grid-cols-[1.5rem_1fr_auto_auto_auto] items-center gap-2"
              >
                <span className="text-xs font-mono tabular-nums text-neutral-400">#{idx + 1}</span>
                <Link
                  href={adminPathFor(r.slug, r.id)}
                  className="truncate text-sm font-medium text-neutral-900 hover:text-rose-700 dark:text-neutral-100 dark:hover:text-rose-400"
                >
                  {name}
                </Link>
                <div className="text-rose-700 dark:text-rose-400">
                  <Sparkline values={r.series.map((p) => p.value)} width={80} height={24} />
                </div>
                <span className="w-12 text-right font-mono tabular-nums text-sm">
                  {formatValue(r.latest)}
                </span>
                <span className={`w-10 text-right font-mono text-xs ${deltaClass}`}>
                  {deltaIcon}
                  {delta !== null ? Math.abs(delta).toFixed(0) : ""}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
