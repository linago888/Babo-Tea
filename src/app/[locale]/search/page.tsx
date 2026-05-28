import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SearchBox } from "@/components/search-box";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/metadata";
import { search, type SearchHit } from "@/lib/search";

type SearchParams = { [k: string]: string | string[] | undefined };

export const dynamic = "force-dynamic"; // 搜尋結果不快取

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return buildPageMetadata({
    locale: locale as Locale,
    path: "/search",
    title: `${t("search.title")} — ${t("site.name")}`,
    description: t("site.description"),
  });
}

function parse(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const q = parse(sp, "q") ?? "";
  const t = await getTranslations({ locale });

  const results = q ? await search(q, locale as Locale) : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {q ? t("search.resultsFor", { q }) : t("search.title")}
        </h1>
        {results ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("search.count", { count: results.total })}
          </p>
        ) : null}
      </header>

      <div className="mb-8">
        <SearchBox locale={locale as Locale} />
      </div>

      {!q ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          {t("search.promptEmpty")}
        </p>
      ) : results?.total === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-300">{t("search.empty", { q })}</p>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {t.rich("search.noResultsHint", {
              brands: (chunks) => (
                <Link
                  href={`/${locale}/brands`}
                  className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  {chunks}
                </Link>
              ),
              cities: (chunks) => (
                <Link
                  href={`/${locale}/cities`}
                  className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  {chunks}
                </Link>
              ),
              drinks: (chunks) => (
                <Link
                  href={`/${locale}/drinks`}
                  className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  {chunks}
                </Link>
              ),
              news: (chunks) => (
                <Link
                  href={`/${locale}/news`}
                  className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {(["brand", "city", "drink", "news"] as const).map((kind) => {
            const hits =
              kind === "brand"
                ? results!.brands
                : kind === "city"
                  ? results!.cities
                  : kind === "drink"
                    ? results!.drinks
                    : results!.news;
            if (hits.length === 0) return null;
            return (
              <section key={kind}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {t(`search.kinds.${kind}`)} · {hits.length}
                </h2>
                <ul className="flex flex-col gap-1">
                  {hits.map((hit) => (
                    <HitItem key={`${hit.kind}-${hit.slug}`} hit={hit} locale={locale as Locale} q={q} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function HitItem({ hit, locale, q }: { hit: SearchHit; locale: Locale; q: string }) {
  const basePath =
    hit.kind === "brand"
      ? "/brands"
      : hit.kind === "city"
        ? "/cities"
        : hit.kind === "drink"
          ? "/drinks"
          : "/news";

  // 高亮 query
  const highlighted = highlight(hit.name, q);
  const excerptHighlighted = hit.excerpt ? highlight(hit.excerpt, q) : null;

  return (
    <li>
      <Link
        href={`/${locale}${basePath}/${hit.slug}`}
        prefetch={false}
        className="block rounded-lg border border-transparent px-4 py-3 transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
      >
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          {highlighted}
        </p>
        {excerptHighlighted ? (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {excerptHighlighted}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200 px-0.5 text-amber-900 dark:bg-amber-700 dark:text-amber-50">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
