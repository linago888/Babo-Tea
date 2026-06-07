import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { GoogleNewsCrawlButton, IngestAllButton, InboxRowActions } from "@/components/admin/news-inbox-actions";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale, routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { formatDate } from "@/lib/intl";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { [k: string]: string | string[] | undefined };

function parse(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * 把任意 Prisma 例外轉成回退值；同時保留訊息給 UI 顯示警告條
 */
async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<{ value: T; error: string | null }> {
  try {
    return { value: await fn(), error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`[news-inbox] ${label} failed:`, msg);
    return { value: fallback, error: `${label}: ${msg}` };
  }
}

type ItemRow = {
  id: string;
  slug: string;
  titleI18n: unknown;
  summaryI18n: unknown;
  heroImageUrl: string | null;
  sourceUrl: string;
  publishedAt: Date;
  createdAt: Date;
  completenessScore: number | null;
  source: {
    id: string;
    slug: string;
    nameI18n: unknown;
    countryCode: string | null;
    primaryLanguage: string;
  };
};

export default async function NewsInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = (await getAdminLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.newsInbox" });

  const sp = await searchParams;
  const sourceFilter = parse(sp, "sourceId");

  const where: Prisma.NewsWhereInput = { status: "DRAFT" };
  if (sourceFilter) where.sourceId = sourceFilter;

  // 每個 query 獨立隔離 — 任一個失敗也不擋整頁
  const countResult = await safeQuery("count DRAFT", () => prisma.news.count({ where: { status: "DRAFT" } }), 0);
  const totalDraft = countResult.value;

  const archivedResult = await safeQuery(
    "count ARCHIVED",
    () => prisma.news.count({ where: { status: "ARCHIVED" } }),
    0,
  );
  const totalArchived = archivedResult.value;

  const itemsResult = await safeQuery<ItemRow[]>(
    "findMany news",
    () =>
      prisma.news.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { publishedAt: "desc" }],
        take: 100,
        select: {
          id: true,
          slug: true,
          titleI18n: true,
          summaryI18n: true,
          heroImageUrl: true,
          sourceUrl: true,
          publishedAt: true,
          createdAt: true,
          completenessScore: true,
          source: {
            select: { id: true, slug: true, nameI18n: true, countryCode: true, primaryLanguage: true },
          },
        },
      }) as unknown as Promise<ItemRow[]>,
    [] as ItemRow[],
  );
  const items = itemsResult.value;

  // 從 items 直接 dedupe sources — 不再跑 source.findMany 的 nested where（Supabase pooler 對 some/_count 不穩定）
  const sourceMap = new Map<string, { id: string; nameI18n: unknown; slug: string; count: number }>();
  for (const n of items) {
    const existing = sourceMap.get(n.source.id);
    if (existing) {
      existing.count += 1;
    } else {
      sourceMap.set(n.source.id, {
        id: n.source.id,
        slug: n.source.slug,
        nameI18n: n.source.nameI18n,
        count: 1,
      });
    }
  }
  const sources = [...sourceMap.values()].sort((a, b) => a.slug.localeCompare(b.slug));

  const errors = [countResult.error, archivedResult.error, itemsResult.error].filter(
    (x): x is string => x !== null,
  );

  // 空收件匣短路
  if (totalDraft === 0 && errors.length === 0) {
    return (
      <>
        <Header t={t} />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-300">{t("emptyTitle")}</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("emptyHint")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header t={t} />

      {errors.length > 0 ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-800 dark:bg-amber-950">
          <p className="font-medium text-amber-900 dark:text-amber-100">⚠ 部分查詢失敗（已用回退值繼續渲染）：</p>
          <ul className="mt-1 list-inside list-disc text-amber-800 dark:text-amber-200">
            {errors.map((e, i) => (
              <li key={i} className="font-mono">{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={t("tiles.pending")} value={totalDraft} tone="warn" />
        <Tile label={t("tiles.sources")} value={sources.length} />
        <Tile label={t("tiles.shown")} value={items.length} />
        <Tile label={t("tiles.archived")} value={totalArchived} />
      </ul>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <label className="text-xs text-neutral-500 dark:text-neutral-400">{t("filterBySource")}:</label>
        <select
          name="sourceId"
          defaultValue={sourceFilter ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        >
          <option value="">{t("allSources")}</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {pickI18n(s.nameI18n, locale, { fallback: s.slug })} ({s.count})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
        >
          {t("apply")}
        </button>
        {sourceFilter ? (
          <Link href="/admin/news-inbox" className="text-xs text-rose-700 hover:underline dark:text-rose-400">
            {t("clearFilter")}
          </Link>
        ) : null}
      </form>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-300">{t("emptyTitle")}</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => {
            // primaryLanguage 可能不在我們支援的 locales 之中（e.g. 'en-US'）— normalize
            const rawLang = n.source.primaryLanguage;
            const supported = routing.locales as readonly string[];
            const lc = (supported.includes(rawLang) ? rawLang : locale) as Locale;
            const title =
              pickI18n(n.titleI18n, lc, { fallback: "" }) ||
              pickI18n(n.titleI18n, locale, { fallback: n.slug });
            const excerpt =
              pickI18n(n.summaryI18n, lc, { fallback: "" }) ||
              pickI18n(n.summaryI18n, locale, { fallback: "" });
            const sourceName = pickI18n(n.source.nameI18n, locale, { fallback: n.source.slug });

            return (
              <li
                key={n.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 sm:flex-row dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                {n.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.heroImageUrl}
                    alt=""
                    className="h-24 w-24 shrink-0 rounded-md object-cover sm:h-28 sm:w-40"
                  />
                ) : (
                  <div className="hidden h-28 w-40 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-400 sm:flex dark:bg-neutral-800">
                    {t("noImage")}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{sourceName}</span>
                    {n.source.countryCode ? <span>{n.source.countryCode}</span> : null}
                    <span className="font-mono">{rawLang}</span>
                    <span>·</span>
                    <span>{t("crawled")}: {formatDate(n.createdAt, locale, { dateStyle: "short" })}</span>
                    <span>·</span>
                    <span>{t("published")}: {formatDate(n.publishedAt, locale, { dateStyle: "short" })}</span>
                    {n.completenessScore !== null ? (
                      <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-mono tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {n.completenessScore}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-1 text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                    <Link href={`/admin/news/${n.id}`} className="hover:text-rose-700 dark:hover:text-rose-400">
                      {title || n.slug}
                    </Link>
                  </h2>
                  {excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{excerpt}</p>
                  ) : null}
                  {n.sourceUrl ? (
                    <a
                      href={n.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener nofollow"
                      className="mt-1 inline-block max-w-full truncate text-[11px] text-amber-700 hover:underline dark:text-amber-400"
                    >
                      ↗ {n.sourceUrl}
                    </a>
                  ) : null}
                </div>

                <div className="sm:ml-auto sm:shrink-0">
                  <InboxRowActions newsId={n.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {items.length >= 100 ? (
        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">{t("limitNote")}</p>
      ) : null}
    </>
  );
}

function Header({ t }: { t: (key: string) => string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📥 {t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{t("subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <GoogleNewsCrawlButton />
        <IngestAllButton />
      </div>
    </header>
  );
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn";
}) {
  const valueColor =
    tone === "warn"
      ? "text-amber-700 dark:text-amber-400"
      : "text-neutral-900 dark:text-neutral-50";
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
    </li>
  );
}
