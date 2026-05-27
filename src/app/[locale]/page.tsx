import { getTranslations, setRequestLocale } from "next-intl/server";

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
      <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
        {t("home.scaffold_note")}
      </p>
      <nav className="flex flex-wrap gap-3 text-sm">
        {(["zh-TW", "zh-CN", "en", "ja"] as const).map((l) => (
          <a
            key={l}
            href={`/${l}`}
            className={`rounded-full border px-3 py-1 transition ${
              l === locale
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            {l}
          </a>
        ))}
      </nav>
    </main>
  );
}
