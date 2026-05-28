import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getAdminLocale } from "@/lib/admin-i18n";
import {
  detectOrphans,
  detectPendingAiSummaries,
  detectReviewDue,
} from "@/lib/content-quality/orphan";
import { pickI18n } from "@/lib/i18n-text";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function loadQualityData() {
  const [brands, cities, drinks, news, orphans, reviewDue, aiPending] =
    await Promise.all([
      prisma.brand.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          slug: true,
          nameI18n: true,
          completenessScore: true,
        },
        orderBy: [{ completenessScore: "asc" }, { slug: "asc" }],
      }),
      prisma.city.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          slug: true,
          nameI18n: true,
          completenessScore: true,
        },
        orderBy: [{ completenessScore: "asc" }, { slug: "asc" }],
      }),
      prisma.drink.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          slug: true,
          nameI18n: true,
          completenessScore: true,
        },
        orderBy: [{ completenessScore: "asc" }, { slug: "asc" }],
      }),
      prisma.news.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          slug: true,
          titleI18n: true,
          completenessScore: true,
        },
        orderBy: [{ completenessScore: "asc" }, { slug: "asc" }],
      }),
      detectOrphans(prisma),
      detectReviewDue(prisma),
      detectPendingAiSummaries(prisma),
    ]);
  return { brands, cities, drinks, news, orphans, reviewDue, aiPending };
}

interface Scored {
  slug: string;
  nameI18n?: unknown;
  titleI18n?: unknown;
  completenessScore: number | null;
}

function distribute(items: Scored[]) {
  const buckets = { low: 0, mid: 0, high: 0, unscored: 0 };
  for (const it of items) {
    const s = it.completenessScore;
    if (s === null) buckets.unscored++;
    else if (s < 50) buckets.low++;
    else if (s < 80) buckets.mid++;
    else buckets.high++;
  }
  return buckets;
}

function scoreColor(score: number | null): string {
  if (score === null) return "bg-neutral-200 dark:bg-neutral-700";
  if (score < 50) return "bg-rose-500 dark:bg-rose-600";
  if (score < 80) return "bg-amber-500 dark:bg-amber-600";
  return "bg-emerald-500 dark:bg-emerald-600";
}

export default async function QualityDashboardPage() {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin.quality" });
  const tBuckets = await getTranslations({ locale, namespace: "admin.quality.buckets" });
  const data = await loadQualityData();

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {t("subtitle")}
        </p>
      </header>

      {/* Completeness summary */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">{t("completeness")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DistributionCard label="Brands" items={data.brands} bucketLabels={{ high: tBuckets("high"), mid: tBuckets("mid"), low: tBuckets("low"), unscored: tBuckets("unscored") }} avgLabel={t("average")} />
          <DistributionCard label="Cities" items={data.cities} bucketLabels={{ high: tBuckets("high"), mid: tBuckets("mid"), low: tBuckets("low"), unscored: tBuckets("unscored") }} avgLabel={t("average")} />
          <DistributionCard label="Drinks" items={data.drinks} bucketLabels={{ high: tBuckets("high"), mid: tBuckets("mid"), low: tBuckets("low"), unscored: tBuckets("unscored") }} avgLabel={t("average")} />
          <DistributionCard label="News" items={data.news} bucketLabels={{ high: tBuckets("high"), mid: tBuckets("mid"), low: tBuckets("low"), unscored: tBuckets("unscored") }} avgLabel={t("average")} />
        </div>
      </section>

      {/* Low-scoring entities */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">{t("lowest")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LowList label="Brands" items={data.brands.slice(0, 5)} pathPrefix="brands" useTitle={false} />
          <LowList label="Cities" items={data.cities.slice(0, 5)} pathPrefix="cities" useTitle={false} />
          <LowList label="Drinks" items={data.drinks.slice(0, 5)} pathPrefix="drinks" useTitle={false} />
          <LowList label="News" items={data.news.slice(0, 5)} pathPrefix="news" useTitle={true} />
        </div>
      </section>

      {/* Orphans */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">
          {t("orphans")} ·{" "}
          {data.orphans.brands.length +
            data.orphans.cities.length +
            data.orphans.drinks.length +
            data.orphans.news.length +
            data.orphans.sources.length}{" "}
          {t("total")}
        </h2>
        <OrphanGrid orphans={data.orphans} allLinkedLabel={t("allLinked")} />
      </section>

      {/* AI summary queue + review due */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-lg font-semibold">
            {t("aiQueueTitle")} · {data.aiPending.length}
          </h2>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            {t("aiQueueDesc")}
          </p>
          {data.aiPending.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("aiQueueEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.aiPending.slice(0, 10).map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/news/${n.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:underline dark:text-amber-400"
                  >
                    {pickI18n(n.titleI18n, routing.defaultLocale, { fallback: n.slug })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-lg font-semibold">
            {t("reviewDueTitle")} ·{" "}
            {data.reviewDue.brands.length +
              data.reviewDue.cities.length +
              data.reviewDue.drinks.length +
              data.reviewDue.news.length}
          </h2>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            {t("reviewDueDesc")}
          </p>
          {data.reviewDue.brands.length +
            data.reviewDue.cities.length +
            data.reviewDue.drinks.length +
            data.reviewDue.news.length ===
          0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("reviewDueEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {[
                ...data.reviewDue.brands.map((b) => ({ ...b, kind: "brands" })),
                ...data.reviewDue.cities.map((c) => ({ ...c, kind: "cities" })),
                ...data.reviewDue.drinks.map((d) => ({ ...d, kind: "drinks" })),
                ...data.reviewDue.news.map((n) => ({ ...n, kind: "news" })),
              ]
                .slice(0, 10)
                .map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/${r.kind}/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-700 hover:underline dark:text-amber-400"
                    >
                      {r.kind}/{r.slug}
                    </Link>
                    {r.reviewDueAt ? (
                      <span className="text-xs text-neutral-500">
                        {new Date(r.reviewDueAt).toISOString().slice(0, 10)}
                      </span>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function DistributionCard({
  label,
  items,
  bucketLabels,
  avgLabel,
}: {
  label: string;
  items: Scored[];
  bucketLabels: { high: string; mid: string; low: string; unscored: string };
  avgLabel: string;
}) {
  const buckets = distribute(items);
  const total = items.length;
  const avg =
    items.filter((i) => i.completenessScore !== null).reduce((sum, i) => sum + (i.completenessScore ?? 0), 0) /
      Math.max(1, items.filter((i) => i.completenessScore !== null).length);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {label}
        </h3>
        <span className="text-xs text-neutral-500">{avgLabel} {Math.round(avg)}</span>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums">{total}</p>
      {/* Stacked bar */}
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        {buckets.high > 0 ? (
          <div className="bg-emerald-500 dark:bg-emerald-600" style={{ width: `${(buckets.high / total) * 100}%` }} />
        ) : null}
        {buckets.mid > 0 ? (
          <div className="bg-amber-500 dark:bg-amber-600" style={{ width: `${(buckets.mid / total) * 100}%` }} />
        ) : null}
        {buckets.low > 0 ? (
          <div className="bg-rose-500 dark:bg-rose-600" style={{ width: `${(buckets.low / total) * 100}%` }} />
        ) : null}
        {buckets.unscored > 0 ? (
          <div className="bg-neutral-300 dark:bg-neutral-600" style={{ width: `${(buckets.unscored / total) * 100}%` }} />
        ) : null}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-xs">
        <li className="flex justify-between">
          <span className="text-emerald-700 dark:text-emerald-400">{bucketLabels.high}</span>
          <span className="tabular-nums">{buckets.high}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-amber-700 dark:text-amber-400">{bucketLabels.mid}</span>
          <span className="tabular-nums">{buckets.mid}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-rose-700 dark:text-rose-400">{bucketLabels.low}</span>
          <span className="tabular-nums">{buckets.low}</span>
        </li>
        {buckets.unscored > 0 ? (
          <li className="flex justify-between">
            <span className="text-neutral-500">{bucketLabels.unscored}</span>
            <span className="tabular-nums">{buckets.unscored}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function LowList({
  label,
  items,
  pathPrefix,
  useTitle,
}: {
  label: string;
  items: Scored[];
  pathPrefix: string;
  useTitle: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </h3>
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((it) => {
          const name = useTitle
            ? pickI18n(it.titleI18n, routing.defaultLocale, { fallback: it.slug })
            : pickI18n(it.nameI18n, routing.defaultLocale, { fallback: it.slug });
          return (
            <li key={it.slug} className="flex items-center justify-between gap-2">
              <Link
                href={`/${pathPrefix}/${it.slug}`}
                target="_blank"
                rel="noreferrer"
                className="truncate text-neutral-800 hover:text-amber-700 dark:text-neutral-200 dark:hover:text-amber-400"
              >
                {name}
              </Link>
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block size-2 rounded-full ${scoreColor(it.completenessScore)}`}
                />
                <span className="font-mono text-xs tabular-nums">
                  {it.completenessScore ?? "–"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OrphanGrid({
  orphans,
  allLinkedLabel,
}: {
  orphans: {
    brands: Array<{ slug: string }>;
    cities: Array<{ slug: string }>;
    drinks: Array<{ slug: string }>;
    news: Array<{ slug: string }>;
    sources: Array<{ slug: string }>;
  };
  allLinkedLabel: string;
}) {
  const groups: Array<{ label: string; kind: string; items: Array<{ slug: string }> }> = [
    { label: "Brands", kind: "brands", items: orphans.brands },
    { label: "Cities", kind: "cities", items: orphans.cities },
    { label: "Drinks", kind: "drinks", items: orphans.drinks },
    { label: "News", kind: "news", items: orphans.news },
    { label: "Sources", kind: "sources", items: orphans.sources },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {groups.map((g) => (
        <div
          key={g.kind}
          className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {g.label} · {g.items.length}
          </h3>
          {g.items.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">{allLinkedLabel}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {g.items.slice(0, 8).map((it) => (
                <li key={it.slug}>
                  <span className="font-mono text-xs text-rose-700 dark:text-rose-400">
                    {it.slug}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
