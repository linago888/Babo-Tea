import { getTranslations } from "next-intl/server";
import Link from "next/link";

import {
  GoogleNewsCrawlButton,
  IngestAllButton,
  InboxRowActions,
  RunDailyCronButton,
  TranslateBatchButton,
} from "@/components/admin/news-inbox-actions";
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
 * 從 i18n jsonb 欄位收集所有已填寫（非空字串）的 locale 版本，
 * 用我們支援的 4 個 locale 的順序回傳。
 */
function collectFilledLocales(field: unknown): Array<{ locale: string; value: string }> {
  if (!field || typeof field !== "object") return [];
  const map = field as Record<string, unknown>;
  const out: Array<{ locale: string; value: string }> = [];
  for (const lc of routing.locales as readonly string[]) {
    const v = map[lc];
    if (typeof v === "string" && v.trim().length > 0) {
      out.push({ locale: lc, value: v.trim() });
    }
  }
  return out;
}

type ItemRow = {
  id: string;
  slug: string;
  titleI18n: unknown;
  summaryI18n: unknown;
  bodyI18n: unknown;
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
      bodyI18n: true,
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
            // 蒐集 titleI18n / summaryI18n / bodyI18n 裡所有 *已填寫* 的 locale 版本
            const titles = collectFilledLocales(n.titleI18n);
            const summaries = collectFilledLocales(n.summaryI18n);
            const bodies = collectFilledLocales(n.bodyI18n);

            // 決定 primary locale —— 偏好順序：
            //   1. zh-TW（後台預設顯示繁體中文）
            //   2. 使用者目前的 admin locale
            //   3. source.primaryLanguage（原文語言）
            //   4. 任一已填的 locale
            const rawLang = n.source?.primaryLanguage ?? locale;
            const supported = routing.locales as readonly string[];
            const primaryLocale: string =
              titles.find((tt) => tt.locale === "zh-TW")?.locale ??
              titles.find((tt) => tt.locale === locale)?.locale ??
              titles.find((tt) => tt.locale === rawLang)?.locale ??
              titles[0]?.locale ??
              rawLang;

            const primaryTitle = titles.find((tt) => tt.locale === primaryLocale);
            const primarySummary = summaries.find((tt) => tt.locale === primaryLocale);
            const primaryBody = bodies.find((tt) => tt.locale === primaryLocale) ?? bodies[0];
            const otherTitles = titles.filter((tt) => tt.locale !== primaryLocale);
            // body 預覽：取第一段、最多 300 字元
            const bodyPreview = primaryBody?.value
              ? primaryBody.value
                  .replace(/[#*_`>]/g, "")
                  .trim()
                  .slice(0, 300)
              : "";
            const bodyCharCount = primaryBody?.value?.length ?? 0;

            const sourceName = n.source
              ? pickI18n(n.source.nameI18n, locale, { fallback: n.source.slug })
              : "(no source)";

            const missingLocales = (supported as readonly string[]).filter(
              (loc) => !titles.some((tt) => tt.locale === loc),
            );

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
                    <span>·</span>
                    <span>{t("crawled")}: {formatDate(n.createdAt, locale, { dateStyle: "short" })}</span>
                    <span>·</span>
                    <span>{t("published")}: {formatDate(n.publishedAt, locale, { dateStyle: "short" })}</span>
                    {n.completenessScore !== null ? (
                      <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-mono tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {n.completenessScore}
                      </span>
                    ) : null}
                    {/* 語系完成度狀態：✓ 已填 / ⚠ 未填 */}
                    <span className="ml-auto flex gap-1">
                      {(supported as readonly string[]).map((loc) => {
                        const filled = titles.some((tt) => tt.locale === loc);
                        return (
                          <span
                            key={loc}
                            className={`rounded px-1 font-mono text-[9px] ${
                              filled
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                : "bg-neutral-100 text-neutral-400 line-through dark:bg-neutral-800"
                            }`}
                            title={filled ? `${loc} title filled` : `${loc} title missing`}
                          >
                            {loc}
                          </span>
                        );
                      })}
                    </span>
                  </div>

                  {/* Primary 標題 */}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="rounded bg-rose-100 px-1 font-mono text-[9px] text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                      {primaryLocale}
                    </span>
                    <h2 className="text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                      <Link href={`/admin/news/${n.id}`} className="hover:text-rose-700 dark:hover:text-rose-400">
                        {primaryTitle?.value || n.slug}
                      </Link>
                    </h2>
                  </div>

                  {primarySummary?.value ? (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {primarySummary.value}
                    </p>
                  ) : null}

                  {/* Body 預覽 + 字數狀態 — 讓編輯一眼看出有沒有爬到內文 */}
                  {bodyPreview ? (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-2 text-xs leading-relaxed text-neutral-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-neutral-300">
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <span>✓ {t("bodyPreview")}</span>
                        <span className="font-mono tabular-nums">{bodyCharCount.toLocaleString()} {t("chars")}</span>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-line">{bodyPreview}{primaryBody && primaryBody.value.length > 300 ? "..." : ""}</p>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 p-2 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                      ⚠ {t("bodyEmpty")}
                    </div>
                  )}

                  {/* 其他 locale 的標題（若有） */}
                  {otherTitles.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {otherTitles.map((tt) => {
                        const sm = summaries.find((s) => s.locale === tt.locale);
                        return (
                          <li
                            key={tt.locale}
                            className="rounded-md border border-neutral-100 bg-neutral-50 p-2 text-xs dark:border-neutral-800 dark:bg-neutral-800/40"
                          >
                            <div className="flex items-baseline gap-1.5">
                              <span className="rounded bg-violet-100 px-1 font-mono text-[9px] text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                                {tt.locale}
                              </span>
                              <span className="line-clamp-1 font-medium text-neutral-800 dark:text-neutral-200">
                                {tt.value}
                              </span>
                            </div>
                            {sm?.value ? (
                              <p className="mt-0.5 line-clamp-1 pl-9 text-[11px] text-neutral-500 dark:text-neutral-400">
                                {sm.value}
                              </p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {/* 未翻譯提示 */}
                  {missingLocales.length > 0 ? (
                    <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                      ⚠ {t("missingLocales", { locales: missingLocales.join(" · ") })}
                    </p>
                  ) : null}

                  {n.sourceUrl ? (
                    <a
                      href={n.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener nofollow"
                      className="mt-2 inline-block max-w-full truncate text-[11px] text-amber-700 hover:underline dark:text-amber-400"
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
        <RunDailyCronButton />
        <GoogleNewsCrawlButton />
        <IngestAllButton />
        <TranslateBatchButton />
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
