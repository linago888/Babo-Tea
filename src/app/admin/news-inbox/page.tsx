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

/**
 * 主頁 — 把整個邏輯包在 try/catch 裡渲染。
 * 任何例外都直接把訊息 + stack 寫進頁面，不會被 Next.js production
 * 遮罩成 "An error occurred in the Server Components render"。
 */
export default async function NewsInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
    return await renderInbox(searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? err.stack : "";
    const name = err instanceof Error ? err.name : "Error";
    // 同時也 log 到 Vercel function logs（從 Vercel dashboard 可以找到）
    // eslint-disable-next-line no-console
    console.error("[news-inbox] caught at page boundary:", err);
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950">
        <h1 className="text-xl font-bold text-rose-900 dark:text-rose-100">
          ⚠ 新聞收件匣載入失敗（已捕捉具體錯誤）
        </h1>
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          <span className="font-mono">{name}</span>
        </p>
        <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap rounded bg-rose-100 p-3 text-xs text-rose-900 dark:bg-rose-900 dark:text-rose-100">
          {message}
        </pre>
        {stack ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-rose-700 dark:text-rose-300">
              Stack trace
            </summary>
            <pre className="mt-2 max-h-[500px] overflow-auto whitespace-pre-wrap rounded bg-rose-100 p-3 text-[10px] text-rose-900 dark:bg-rose-900 dark:text-rose-100">
              {stack}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }
}

async function renderInbox(searchParamsPromise: Promise<SearchParams>) {
  const locale = (await getAdminLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.newsInbox" });

  const sp = await searchParamsPromise;
  const sourceFilter = parse(sp, "sourceId");

  const where: Prisma.NewsWhereInput = { status: "DRAFT" };
  if (sourceFilter) where.sourceId = sourceFilter;

  const totalDraft = await prisma.news.count({ where: { status: "DRAFT" } });
  const totalArchived = await prisma.news.count({ where: { status: "ARCHIVED" } });

  if (totalDraft === 0) {
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

  const items = (await prisma.news.findMany({
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
  })) as unknown as ItemRow[];

  // 從 items 直接 dedupe sources — 不再跑 source.findMany 的 nested where
  const sourceMap = new Map<string, { id: string; nameI18n: unknown; slug: string; count: number }>();
  for (const n of items) {
    if (!n.source) continue;
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

  return (
    <>
      <Header t={t} />

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
            const rawLang = n.source?.primaryLanguage ?? locale;
            const supported = routing.locales as readonly string[];
            const lc = (supported.includes(rawLang) ? rawLang : locale) as Locale;
            const title =
              pickI18n(n.titleI18n, lc, { fallback: "" }) ||
              pickI18n(n.titleI18n, locale, { fallback: n.slug });
            const excerpt =
              pickI18n(n.summaryI18n, lc, { fallback: "" }) ||
              pickI18n(n.summaryI18n, locale, { fallback: "" });
            const sourceName = n.source
              ? pickI18n(n.source.nameI18n, locale, { fallback: n.source.slug })
              : "(no source)";

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
                    {n.source?.countryCode ? <span>{n.source.countryCode}</span> : null}
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
