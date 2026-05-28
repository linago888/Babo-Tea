"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { type Locale, localeMetadata, routing } from "@/i18n/routing";

const LOCALE_COOKIE = "NEXT_LOCALE";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Swap the locale prefix in a path: '/zh-TW/brands' → '/en/brands' */
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

  function onChange(value: string) {
    const locale = value as Locale;
    if (locale === currentLocale) return;
    setLocaleCookie(locale);
    startTransition(() => {
      router.replace(withLocale(pathname, locale));
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t("label")}</span>
      <span aria-hidden className="text-neutral-500 dark:text-neutral-400">
        🌐
      </span>
      <select
        aria-label={t("label")}
        value={currentLocale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium transition hover:border-neutral-500 focus:border-neutral-900 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:focus:border-neutral-100"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} lang={localeMetadata[l].bcp47}>
            {localeMetadata[l].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
