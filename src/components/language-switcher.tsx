"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { type Locale, localeMetadata, routing } from "@/i18n/routing";

const LOCALE_COOKIE = "NEXT_LOCALE";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * 替換 path 中的 locale 前綴：'/zh-TW/brands' → '/en/brands'
 * 若 path 沒有 locale 前綴（理論上不會，因 localePrefix='always'），直接加上
 */
function withLocale(pathname: string, locale: Locale): string {
  for (const l of routing.locales) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) {
      return pathname.replace(`/${l}`, `/${locale}`) || `/${locale}`;
    }
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSelect(locale: Locale) {
    if (locale === currentLocale) return;
    setLocaleCookie(locale);
    startTransition(() => {
      router.replace(withLocale(pathname, locale));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" aria-label={t("label")}>
      <span className="text-neutral-500" id="language-switcher-label">
        {t("label")}:
      </span>
      <ul
        className="flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-labelledby="language-switcher-label"
      >
        {routing.locales.map((l) => {
          const meta = localeMetadata[l];
          const active = l === currentLocale;
          return (
            <li key={l}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${meta.englishName} (${meta.nativeName})`}
                disabled={pending}
                onClick={() => onSelect(l)}
                className={`rounded-full border px-3 py-1 transition disabled:opacity-50 ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
                }`}
              >
                <span lang={meta.bcp47}>{meta.nativeName}</span>
                {active ? (
                  <span className="sr-only"> — {t("current")}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
