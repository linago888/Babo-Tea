import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-neutral-500">
        {t("site.name")}
      </p>
      <h1 className="text-4xl font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
        {t("home.headline")}
      </h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        {t("home.lede")}
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={`/${locale}/brands`}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {t("home.explore_brands")} →
        </Link>
        <Link
          href={`/${locale}/cities`}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
        >
          {t("home.explore_cities")}
        </Link>
        <Link
          href={`/${locale}/drinks`}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
        >
          {t("home.explore_drinks")}
        </Link>
      </div>
    </main>
  );
}
