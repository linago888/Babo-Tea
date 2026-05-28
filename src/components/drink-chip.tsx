import Link from "next/link";

import type { BrandDrink, Drink } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";

/**
 * 小型 drink 卡 — 用在品牌詳情頁 / 城市詳情頁的飲品列表
 * brandDrink 帶 local_name_i18n / 價格時優先顯示品牌專屬資訊
 */
export function DrinkChip({
  drink,
  brandDrink,
  locale,
}: {
  drink: Drink;
  brandDrink?: BrandDrink;
  locale: Locale;
}) {
  const localName = brandDrink?.localNameI18n
    ? pickI18n(brandDrink.localNameI18n, locale)
    : "";
  const drinkName = pickI18n(drink.nameI18n, locale);
  const displayName = localName || drinkName;

  const price = brandDrink?.priceLocal && brandDrink?.priceCurrency
    ? `${brandDrink.priceCurrency} ${Number(brandDrink.priceLocal).toFixed(0)}`
    : null;

  return (
    <Link
      href={`/${locale}/drinks/${drink.slug}`}
      prefetch={false}
      className="group flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      <div className="flex items-center gap-2 min-w-0">
        {brandDrink?.isSignature ? (
          <span
            aria-label="Signature"
            title="Signature drink"
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-200"
          >
            ★
          </span>
        ) : null}
        <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {displayName}
        </span>
        {localName && localName !== drinkName ? (
          <span className="hidden truncate text-xs text-neutral-500 dark:text-neutral-400 sm:inline">
            ({drinkName})
          </span>
        ) : null}
      </div>
      {price ? (
        <span className="shrink-0 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          {price}
        </span>
      ) : null}
    </Link>
  );
}
