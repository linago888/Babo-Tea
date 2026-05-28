import { getTranslations } from "next-intl/server";

import { HBar, Sparkline } from "@/components/admin/sparkline";
import { getAdminLocale } from "@/lib/admin-i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TopQueryRow = { query: string; count: bigint; avg_results: number | null };
type ZeroRow = { query: string; count: bigint; last_seen: Date };
type DayRow = { day: Date; count: bigint };
type LocaleRow = { locale: string; count: bigint };
type CountryRow = { country_code: string; count: bigint };

export default async function AdminSearchLogPage() {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin.searchLog" });

  const [
    topQueries,
    zeroResults,
    daily,
    locales,
    countries,
    totalLast7d,
    zeroLast7d,
  ] = await Promise.all([
    prisma.$queryRaw<TopQueryRow[]>`
      SELECT query, COUNT(*)::bigint as count, AVG(result_count)::int as avg_results
      FROM search_log
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT 20
    `,
    prisma.$queryRaw<ZeroRow[]>`
      SELECT query, COUNT(*)::bigint as count, MAX(created_at) as last_seen
      FROM search_log
      WHERE result_count = 0 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY query
      ORDER BY count DESC, last_seen DESC
      LIMIT 20
    `,
    prisma.$queryRaw<DayRow[]>`
      SELECT DATE(created_at) as day, COUNT(*)::bigint as count
      FROM search_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.$queryRaw<LocaleRow[]>`
      SELECT locale, COUNT(*)::bigint as count
      FROM search_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY locale
      ORDER BY count DESC
    `,
    prisma.$queryRaw<CountryRow[]>`
      SELECT country_code, COUNT(*)::bigint as count
      FROM search_log
      WHERE country_code IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 10
    `,
    prisma.searchLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
    }),
    prisma.searchLog.count({
      where: {
        resultCount: 0,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
    }),
  ]);

  // 把 daily 對齊成完整 30 天（含空日）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const series: Array<{ day: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = daily.find((row) => row.day.toISOString().slice(0, 10) === key);
    series.push({ day: key, count: found ? Number(found.count) : 0 });
  }
  const max7d = topQueries.reduce((m, r) => Math.max(m, Number(r.count)), 0);
  const maxZero = zeroResults.reduce((m, r) => Math.max(m, Number(r.count)), 0);
  const maxLocale = locales.reduce((m, r) => Math.max(m, Number(r.count)), 0);
  const maxCountry = countries.reduce((m, r) => Math.max(m, Number(r.count)), 0);

  const totalLast30d = series.reduce((sum, p) => sum + p.count, 0);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t("subtitle")}</p>
      </header>

      {/* Top tiles */}
      <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={t("tiles.searches7d")} value={totalLast7d} />
        <Tile label={t("tiles.zero7d")} value={zeroLast7d} tone={zeroLast7d > 0 ? "warn" : "ok"} />
        <Tile label={t("tiles.searches30d")} value={totalLast30d} />
        <Tile label={t("tiles.locales")} value={locales.length} />
      </ul>

      {/* 30 day trend */}
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 text-sm font-semibold">{t("dailyVolume")}</h2>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-500">{t("dailyVolumeHint")}</p>
        <div className="text-rose-700 dark:text-rose-400">
          <Sparkline values={series.map((p) => p.count)} width={900} height={80} showDots />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-neutral-500 dark:text-neutral-500">
          <span>{series[0].day}</span>
          <span>{series[series.length - 1].day}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top queries */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">{t("topQueries")}</h2>
          {topQueries.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("empty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {topQueries.map((row) => {
                const count = Number(row.count);
                return (
                  <li key={row.query} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-mono">{row.query}</span>
                      <span className="shrink-0 font-mono tabular-nums text-xs text-neutral-500">
                        {count} · {row.avg_results ?? 0} {t("avgResults")}
                      </span>
                    </div>
                    <HBar value={count} max={max7d} barClassName="bg-rose-500 dark:bg-rose-600" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Zero result */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-1 text-sm font-semibold">{t("zeroResults")}</h2>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-500">{t("zeroResultsHint")}</p>
          {zeroResults.length === 0 ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{t("zeroEmpty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {zeroResults.map((row) => {
                const count = Number(row.count);
                return (
                  <li key={row.query} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-mono">{row.query}</span>
                      <span className="shrink-0 font-mono tabular-nums text-xs text-neutral-500">
                        {count}×
                      </span>
                    </div>
                    <HBar value={count} max={maxZero} barClassName="bg-amber-500 dark:bg-amber-600" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Locale distribution */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">{t("byLocale")}</h2>
          {locales.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("empty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {locales.map((row) => {
                const count = Number(row.count);
                return (
                  <li key={row.locale} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{row.locale}</span>
                      <span className="font-mono tabular-nums text-xs text-neutral-500">{count}</span>
                    </div>
                    <HBar value={count} max={maxLocale} barClassName="bg-violet-500 dark:bg-violet-600" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Country distribution */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold">{t("byCountry")}</h2>
          {countries.length === 0 ? (
            <p className="text-xs text-neutral-500">{t("empty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {countries.map((row) => {
                const count = Number(row.count);
                return (
                  <li key={row.country_code} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{row.country_code}</span>
                      <span className="font-mono tabular-nums text-xs text-neutral-500">{count}</span>
                    </div>
                    <HBar value={count} max={maxCountry} barClassName="bg-emerald-500 dark:bg-emerald-600" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "ok";
}) {
  const valueColor =
    tone === "warn"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "ok"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-neutral-900 dark:text-neutral-50";
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <p className={`text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
    </li>
  );
}
