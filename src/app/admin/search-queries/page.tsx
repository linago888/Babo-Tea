import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/intl";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSearchQueriesPage() {
  const locale = (await getAdminLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.searchQueries" });

  const queries = await prisma.newsSearchQuery.findMany({
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🔎 {t("listTitle")}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {t("listSubtitle", { count: queries.length })}
          </p>
        </div>
        <Link
          href="/admin/search-queries/new"
          className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600"
        >
          + {t("create")}
        </Link>
      </header>

      {queries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-300">{t("emptyTitle")}</p>
          <p className="mt-1 whitespace-pre-line text-xs text-neutral-500 dark:text-neutral-400">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t("table.label")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("table.query")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("table.locale")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("table.country")}</th>
                <th className="px-4 py-3 text-center font-semibold">{t("table.enabled")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.lastCrawled")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {queries.map((q) => (
                <tr key={q.id} className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/search-queries/${q.id}`}
                      className="font-medium text-neutral-900 hover:text-rose-700 dark:text-neutral-100 dark:hover:text-rose-400"
                    >
                      {q.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-w-[400px] truncate font-mono text-xs text-neutral-600 dark:text-neutral-400" title={q.query}>
                    {q.query}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{q.locale}</td>
                  <td className="px-4 py-3 font-mono text-xs">{q.countryCode ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {q.enabled ? (
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500 dark:text-neutral-500">
                    {q.lastCrawledAt ? formatDate(q.lastCrawledAt, locale, { dateStyle: "short" }) : t("never")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
