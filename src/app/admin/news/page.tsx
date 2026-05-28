import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
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

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = (await getAdminLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.news" });
  const tStatus = await getTranslations({ locale, namespace: "admin.news.status" });
  const tCategory = await getTranslations({ locale, namespace: "admin.news.category" });

  const sp = await searchParams;
  const q = parse(sp, "q")?.trim() ?? "";
  const statusFilter = parse(sp, "status");
  const categoryFilter = parse(sp, "category");

  const where: Prisma.NewsWhereInput = {};
  if (statusFilter && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(statusFilter)) {
    where.status = statusFilter as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }
  if (
    categoryFilter &&
    [
      "EXPANSION",
      "LAUNCH",
      "FRANCHISE_INVESTMENT",
      "CITY_MARKET",
      "TREND",
      "SUPPLY_CHAIN",
      "CULTURE",
    ].includes(categoryFilter)
  ) {
    where.category = categoryFilter as Prisma.NewsWhereInput["category"];
  }
  if (q) {
    where.OR = [{ slug: { contains: q, mode: "insensitive" } }];
  }

  const items = await prisma.news.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      titleI18n: true,
      category: true,
      publishedAt: true,
      status: true,
      completenessScore: true,
      updatedAt: true,
      source: { select: { id: true, slug: true, nameI18n: true } },
    },
  });

  const filtered = q
    ? items.filter((n) => {
        const title = pickI18n(n.titleI18n, locale);
        const needle = q.toLowerCase();
        return title.toLowerCase().includes(needle) || n.slug.toLowerCase().includes(needle);
      })
    : items;

  return (
    <>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("listTitle")}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {t("listSubtitle", { count: filtered.length })}
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600"
        >
          + {t("create")}
        </Link>
      </header>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={t("search")}
          className="min-w-[200px] flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        />
        <select
          name="category"
          defaultValue={categoryFilter ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        >
          <option value="">— {t("table.category")}</option>
          {[
            "EXPANSION",
            "LAUNCH",
            "FRANCHISE_INVESTMENT",
            "CITY_MARKET",
            "TREND",
            "SUPPLY_CHAIN",
            "CULTURE",
          ].map((c) => (
            <option key={c} value={c}>
              {tCategory(c.toLowerCase())}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        >
          <option value="">— {t("table.status")}</option>
          <option value="DRAFT">{tStatus("draft")}</option>
          <option value="PUBLISHED">{tStatus("published")}</option>
          <option value="ARCHIVED">{tStatus("archived")}</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
        >
          🔍
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">{t("table.title")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.category")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.source")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("table.publishedAt")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.status")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("table.completeness")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("table.updated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((n) => {
              const title = pickI18n(n.titleI18n, locale, { fallback: n.slug });
              const sourceName = pickI18n(n.source.nameI18n, locale, { fallback: n.source.slug });
              return (
                <tr key={n.id} className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/news/${n.id}`}
                      className="font-medium text-neutral-900 hover:text-rose-700 dark:text-neutral-100 dark:hover:text-rose-400"
                    >
                      {title}
                    </Link>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">{n.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {tCategory(n.category.toLowerCase())}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{sourceName}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {formatDate(n.publishedAt, locale, { dateStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={n.status} label={tStatus(n.status.toLowerCase())} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CompletenessBadge score={n.completenessScore} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500 dark:text-neutral-500">
                    {formatDate(n.updatedAt, locale, { dateStyle: "short" })}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-500">
                  —
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusPill({ status, label }: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; label: string }) {
  const cls =
    status === "PUBLISHED"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : status === "DRAFT"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function CompletenessBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-neutral-400">–</span>;
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2 rounded-full ${color}`} />
      <span className="font-mono tabular-nums">{score}</span>
    </span>
  );
}
