import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; // admin 數據要即時

export default async function AdminIndexPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Editorial overview</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Snapshot of the catalogue. Click through to manage each module.
        </p>
      </header>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Brands", count: brandCount, href: "/brands" },
          { label: "Cities", count: cityCount, href: "/cities" },
          { label: "Drinks", count: drinkCount, href: "/drinks" },
          { label: "News", count: newsCount, href: "/news" },
          { label: "Sources", count: sourceCount, href: null },
        ].map((m) => (
          <li
            key={m.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-3xl font-bold tabular-nums">{m.count}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {m.label}
            </p>
            {m.href ? (
              <Link
                href={m.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs text-amber-700 hover:underline dark:text-amber-400"
              >
                View live →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/admin/quality"
            className="block rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
          >
            <h3 className="text-base font-semibold">Content quality</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Completeness scores, orphan entities, AI summary review queue.
            </p>
          </Link>
          <div className="block rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
            <h3 className="text-base font-semibold text-neutral-500 dark:text-neutral-500">
              Content editor (Phase 4.5)
            </h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
              Brand / city / drink / news CRUD via Payload v3 — not yet wired.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
