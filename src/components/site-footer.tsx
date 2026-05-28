import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { type Locale, localeMetadata, routing } from "@/i18n/routing";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 px-6 py-12 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 sm:grid-cols-4">
        {/* Brand mark + tagline */}
        <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <span aria-hidden className="inline-block size-2.5 rounded-full bg-amber-700" />
            <span>{t("site.name")}</span>
          </Link>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("footer.tagline")}
          </p>
        </div>

        {/* Browse */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("footer.browse")}
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {(["brands", "cities", "drinks", "news"] as const).map((k) => (
              <li key={k}>
                <Link
                  href={`/${locale}/${k}`}
                  className="text-neutral-700 transition hover:text-amber-700 dark:text-neutral-300 dark:hover:text-amber-400"
                >
                  {t(`nav.${k}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("footer.resources")}
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>
              <a
                href="/feed.xml"
                className="text-neutral-700 transition hover:text-amber-700 dark:text-neutral-300 dark:hover:text-amber-400"
              >
                {t("footer.rss")}
              </a>
            </li>
            <li>
              <a
                href="/sitemap.xml"
                className="text-neutral-700 transition hover:text-amber-700 dark:text-neutral-300 dark:hover:text-amber-400"
              >
                {t("footer.sitemap")}
              </a>
            </li>
            <li>
              <a
                href="https://github.com/linago888/Babo-Tea"
                target="_blank"
                rel="noreferrer noopener"
                className="text-neutral-700 transition hover:text-amber-700 dark:text-neutral-300 dark:hover:text-amber-400"
              >
                GitHub ↗
              </a>
            </li>
          </ul>
        </div>

        {/* Languages */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("languageSwitcher.label")}
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {routing.locales.map((l) => (
              <li key={l}>
                <Link
                  href={`/${l}`}
                  lang={localeMetadata[l].bcp47}
                  className={`transition hover:text-amber-700 dark:hover:text-amber-400 ${
                    l === locale
                      ? "text-neutral-900 font-medium dark:text-neutral-50"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {localeMetadata[l].nativeName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
        {t("footer.copyright", { year })}
      </div>
    </footer>
  );
}
