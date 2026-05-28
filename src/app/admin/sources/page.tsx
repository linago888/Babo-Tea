import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { formatDate } from "@/lib/intl";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { [k: string]: string | string[] | undefined };

function parse(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = (await getAdminLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "admin.sources" });
  const tStatus = await getTranslations({ locale, namespace: "admin.sources.status" });
  const tKind = await getTranslations({ locale, namespace: "admin.sources.kind" });

  const sp = await searchParams;
  const q = parse(sp, "q")?.trim() ?? "";
  const statusFilter = parse(sp, "status");

  const where: Prisma.SourceWhereInput = {};
  if (statusFilter && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(statusFilter)) {
    where.status = statusFilter as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }
  if (q) {
    where.OR = [
      { slug: { contains: q, mode: "insensitive" } },
      { domain: { contains: q, mode: "insensitive" } },
    ];
  }

  const sources = await prisma.source.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      nameI18n: true,
      domain: true,
      countryCode: true,
      primaryLanguage: true,
      kind: true,
      credibilityScore: true,
      status: true,
      updatedAt: true,
    },
  });

  const filtered = q
    ? sources.filter((s) => {
        const name = pickI18n(s.nameI18n, locale);
        const needle = q.toLowerCase();
        return (
          name.toLowerCase().includes(needle) ||
          s.slug.toLowerCase().includes(needle) ||
          s.domain.toLowerCase().includes(needle)
        );
      })
    : sources;

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
          href="/admin/sources/new"
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
              <th className="px-4 py-3 text-left font-semibold">{t("table.name")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.domain")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.country")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.kind")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.language")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("table.credibility")}</th>
              <th className="px-4 py-3 text-left font-semibold">{t("table.status")}</th>
              <th className="px-4 py-3 text-right font-semibold">{t("table.updated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((s) => {
              const name = pickI18n(s.nameI18n, locale, { fallback: s.slug });
              return (
                <tr key={s.id} className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/sources/${s.id}`}
                      className="font-medium text-neutral-900 hover:text-rose-700 dark:text-neutral-100 dark:hover:text-rose-400"
                    >
                      {name}
                    </Link>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">{s.slug}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {s.domain}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {s.countryCode ? localizeCountry(s.countryCode, locale) : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {tKind(s.kind.toLowerCase())}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {s.primaryLanguage}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                    {s.credibilityScore ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} label={tStatus(s.status.toLowerCase())} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-500 dark:text-neutral-500">
                    {formatDate(s.updatedAt, locale, { dateStyle: "short" })}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-500">
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
