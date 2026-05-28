import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/i18n/routing";

const NAV_ITEMS = [
  { key: "brands", href: "/brands" },
  { key: "cities", href: "/cities" },
  { key: "drinks", href: "/drinks" },
  { key: "news", href: "/news" },
] as const;

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale });

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/85">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
          aria-label={t("site.name")}
        >
          <span aria-hidden className="inline-block size-2.5 rounded-full bg-amber-700" />
          <span>{t("site.name")}</span>
        </Link>

        <nav
          className="hidden flex-1 items-center gap-1 text-sm text-neutral-600 sm:flex dark:text-neutral-300"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className="rounded-md px-3 py-1.5 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      {/* 行動裝置：主導覽單獨一列，避免被 LanguageSwitcher 擠壓 */}
      <nav
        className="border-t border-neutral-200/70 px-6 py-2 sm:hidden dark:border-neutral-800/70"
        aria-label="Primary mobile"
      >
        <div className="flex flex-wrap gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className="rounded-md px-2.5 py-1 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
