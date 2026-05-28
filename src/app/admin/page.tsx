import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getAdminLocale } from "@/lib/admin-i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin" });

  const [brandCount, cityCount, drinkCount, newsCount, sourceCount] = await Promise.all([
    prisma.brand.count(),
    prisma.city.count(),
    prisma.drink.count(),
    prisma.news.count(),
    prisma.source.count(),
  ]);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("overview.title")}</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {t("overview.subtitle")}
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: t("overview.cards.brands"), count: brandCount, href: "/brands", admin: "/admin/brands" },
          { label: t("overview.cards.cities"), count: cityCount, href: "/cities", admin: "/admin/cities" },
          { label: t("overview.cards.drinks"), count: drinkCount, href: "/drinks", admin: "/admin/drinks" },
          { label: t("overview.cards.news"), count: newsCount, href: "/news", admin: "/admin/news" },
          { label: t("overview.cards.sources"), count: sourceCount, href: null, admin: "/admin/sources" },
        ].map((m) => (
          <li
            key={m.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            <p className="text-3xl font-bold tabular-nums">{m.count}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {m.label}
            </p>
            <div className="mt-3 flex flex-col gap-1 text-xs">
              {m.admin ? (
                <Link
                  href={m.admin}
                  className="text-rose-700 hover:underline dark:text-rose-400"
                >
                  Manage →
                </Link>
              ) : null}
              {m.href ? (
                <Link
                  href={m.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-300"
                >
                  {t("overview.viewLive")}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">{t("overview.modules")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/admin/brands"
            className="block rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-rose-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-rose-700"
          >
            <h3 className="text-base font-semibold">{t("overview.contentEditor")}</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {t("overview.contentEditorDesc")}
            </p>
          </Link>
          <Link
            href="/admin/quality"
            className="block rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-rose-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-rose-700"
          >
            <h3 className="text-base font-semibold">{t("overview.contentQuality")}</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {t("overview.contentQualityDesc")}
            </p>
          </Link>
        </div>
      </section>
    </>
  );
}
