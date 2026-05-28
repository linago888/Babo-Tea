import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { BrandCity, City } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { formatCurrency, formatNumber } from "@/lib/intl";

export type CityCardData = City & {
  brandCities?: BrandCity[];
  _count?: { brandCities?: number };
};

export async function CityCard({
  city,
  locale,
}: {
  city: CityCardData;
  locale: Locale;
}) {
  const t = await getTranslations({ locale });
  const name = pickI18n(city.nameI18n, locale);
  const country = localizeCountry(city.countryCode, locale);
  const brandCount =
    city._count?.brandCities ?? city.brandCities?.length ?? 0;

  const avgPrice =
    city.avgPriceLocal && city.avgPriceCurrency
      ? formatCurrency(
          Number(city.avgPriceLocal),
          city.avgPriceCurrency,
          locale,
          { maximumFractionDigits: 0 },
        )
      : null;

  return (
    <li>
      <Link
        href={`/${locale}/cities/${city.slug}`}
        prefetch={false}
        className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
              {name}
            </h2>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {country}
              {city.adminRegion ? ` · ${city.adminRegion}` : ""}
            </p>
          </div>
          {city.marketMaturity ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${maturityTone(city.marketMaturity)}`}
            >
              {t(`cityList.maturity.${city.marketMaturity.toLowerCase()}`)}
            </span>
          ) : null}
        </header>

        {city.descriptionI18n ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {pickI18n(city.descriptionI18n, locale)}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {brandCount > 0 ? (
            <span>{t("cityCard.brands", { count: brandCount })}</span>
          ) : null}
          {avgPrice ? (
            <span>· {t("cityCard.avgPrice", { price: avgPrice })}</span>
          ) : null}
          {city.population ? (
            <span>· {t("cityCard.population", { count: formatNumber(city.population, locale) })}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function maturityTone(level: string): string {
  switch (level) {
    case "SATURATED":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
    case "MATURE":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "GROWING":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
    case "EMERGING":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}
