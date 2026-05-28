import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import type { Brand, BrandDrink, Drink } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";

export type BrandCardData = Brand & {
  brandDrinks: Array<BrandDrink & { drink: Drink }>;
  _count?: { brandCities?: number };
};

/**
 * 單一品牌資料卡 — server component。
 * Phase 2.2 列表頁與 Phase 2.3 詳情頁的「相似品牌」區塊都會用到。
 */
export async function BrandCard({
  brand,
  locale,
}: {
  brand: BrandCardData;
  locale: Locale;
}) {
  const t = await getTranslations({ locale });
  const name = pickI18n(brand.nameI18n, locale);
  const description = pickI18n(brand.descriptionI18n, locale);
  const countryName = localizeCountry(brand.countryCode, locale);
  const tierLabel = t(`brandList.tier.${brand.priceTier.toLowerCase()}`);
  const modelLabel = t(`brandList.model.${brand.businessModel.toLowerCase()}`);
  const signatures = brand.brandDrinks
    .filter((bd) => bd.isSignature)
    .map((bd) => pickI18n(bd.drink.nameI18n, locale));

  return (
    <li>
      <Link
        href={`/${locale}/brands/${brand.slug}`}
        className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
        prefetch={false}
      >
        <header className="flex items-start gap-3">
          <BrandLogo
            slug={brand.slug}
            nameI18n={brand.nameI18n}
            logoUrl={brand.logoUrl}
            locale={locale}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
              {name}
            </h2>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {countryName}
              {brand.foundedYear ? ` · ${t("brandCard.founded", { year: brand.foundedYear })}` : null}
            </p>
          </div>
          {brand.verified ? (
            <span
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              title="Verified"
            >
              ✓
            </span>
          ) : null}
        </header>

        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {tierLabel}
          </span>
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {modelLabel}
          </span>
          {brand.positioningTags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {signatures.length > 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-medium text-neutral-600 dark:text-neutral-300">
              {t("brandCard.signatureDrinks")}：
            </span>{" "}
            {signatures.slice(0, 2).join(" · ")}
          </p>
        ) : null}
      </Link>
    </li>
  );
}
