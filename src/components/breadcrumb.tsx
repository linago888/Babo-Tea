import Link from "next/link";

import type { Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/metadata";

export interface BreadcrumbItem {
  label: string;
  /** path 不含 locale 前綴；最後一項 path 可省略代表當前頁 */
  path?: string;
}

/**
 * Breadcrumb 列 + 對應 BreadcrumbList JSON-LD（SEO + a11y）
 */
export function Breadcrumb({
  items,
  locale,
}: {
  items: BreadcrumbItem[];
  locale: Locale;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.path
        ? { item: `${SITE_URL}/${locale}${item.path}` }
        : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 dark:text-neutral-400">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={`${item.label}-${i}`} className="flex items-center gap-1">
                {item.path && !isLast ? (
                  <Link
                    href={`/${locale}${item.path}`}
                    className="transition hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={isLast ? "text-neutral-700 dark:text-neutral-300" : ""}
                  >
                    {item.label}
                  </span>
                )}
                {!isLast ? <span aria-hidden>/</span> : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
