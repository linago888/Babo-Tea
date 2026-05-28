import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { BrandDrink, Drink } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";

export type DrinkCardData = Drink & {
  brandDrinks?: BrandDrink[];
  _count?: { brandDrinks?: number };
};

export async function DrinkCard({
  drink,
  locale,
}: {
  drink: DrinkCardData;
  locale: Locale;
}) {
  const t = await getTranslations({ locale });
  const name = pickI18n(drink.nameI18n, locale);
  const description = pickI18n(drink.descriptionI18n, locale);
  const brandsCount =
    drink._count?.brandDrinks ?? drink.brandDrinks?.length ?? 0;

  const calMin = drink.caloriesKcalMin ?? null;
  const calMax = drink.caloriesKcalMax ?? null;
  const cafMin = drink.caffeineMgMin ?? null;
  const cafMax = drink.caffeineMgMax ?? null;
  const isCaffeineFree = cafMax === 0;

  return (
    <li>
      <Link
        href={`/${locale}/drinks/${drink.slug}`}
        prefetch={false}
        className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
      >
        <header className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {t(`drinkList.category.${drink.category.toLowerCase()}`)}
          </span>
          <h2 className="text-lg font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
            {name}
          </h2>
        </header>

        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {calMin !== null && calMax !== null ? (
            <span>{t("drinkCard.calories", { min: calMin, max: calMax })}</span>
          ) : null}
          {isCaffeineFree ? (
            <span>· {t("drinkCard.caffeineFree")}</span>
          ) : cafMin !== null && cafMax !== null ? (
            <span>· {t("drinkCard.caffeine", { min: cafMin, max: cafMax })}</span>
          ) : null}
        </div>

        {brandsCount > 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("drinkCard.brandsCount", { count: brandsCount })}
          </p>
        ) : null}
      </Link>
    </li>
  );
}
