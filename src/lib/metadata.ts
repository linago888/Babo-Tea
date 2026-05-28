import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { type Locale, localeMetadata, routing } from "@/i18n/routing";

/**
 * 站台 base URL，給 metadataBase / canonical / hreflang / OG image 用。
 * Vercel 上由 NEXT_PUBLIC_SITE_URL 提供，本機走 http://localhost:3000。
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * 產出每頁通用的 i18n metadata：
 *  - title / description / OG / Twitter（依 locale）
 *  - canonical 指向當前 locale 的完整 URL
 *  - alternates.languages 對每個 locale 產一條 hreflang（含 x-default）
 *
 * @param locale 當前 locale
 * @param path   不含 locale 的相對 path，例：'/' / '/brands' / '/brands/gong-cha'
 */
export async function buildPageMetadata({
  locale,
  path = "/",
  title,
  description,
}: {
  locale: Locale;
  path?: string;
  title?: string;
  description?: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "site" });
  const finalTitle = title ?? t("name");
  const finalDescription = description ?? t("description");

  // alternates.languages 必須有完整 URL（含 protocol + host）
  const cleanPath = path === "/" ? "" : path;
  const canonical = `${SITE_URL}/${locale}${cleanPath}`;

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[localeMetadata[l].bcp47] = `${SITE_URL}/${l}${cleanPath}`;
  }
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${cleanPath}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: finalTitle,
    description: finalDescription,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      title: finalTitle,
      description: finalDescription,
      url: canonical,
      siteName: t("name"),
      locale: localeMetadata[locale].bcp47.replace("-", "_"),
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => localeMetadata[l].bcp47.replace("-", "_")),
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
    },
  };
}
