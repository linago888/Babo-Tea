import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { News, RelevanceLevel, Source } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { formatRelativeTime } from "@/lib/intl";

/**
 * 詳情頁、列表頁、首頁的新聞列項。
 * relevance 不傳就不顯示徽章（單純列表場景）。
 */
export async function NewsListItem({
  news,
  locale,
  relevance,
}: {
  news: News & { source: Source };
  locale: Locale;
  relevance?: RelevanceLevel;
}) {
  const t = await getTranslations({ locale });
  const title = pickI18n(news.titleI18n, locale);
  const summary = pickI18n(news.summaryI18n, locale);
  const sourceName = pickI18n(news.source.nameI18n, locale);
  const relative = formatRelativeTime(news.publishedAt, locale);

  return (
    <li>
      <Link
        href={`/${locale}/news/${news.slug}`}
        prefetch={false}
        className="block rounded-lg border border-transparent px-3 py-2.5 transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
      >
        <div className="flex items-start gap-3">
          {relevance ? (
            <RelevanceBadge level={relevance} label={t(`relevance.${relevance.toLowerCase()}`)} />
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
              {title}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
              {summary}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-500">
              {sourceName} · {relative}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

function RelevanceBadge({ level, label }: { level: RelevanceLevel; label: string }) {
  const styles: Record<RelevanceLevel, string> = {
    PRIMARY: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    SECONDARY: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    MENTIONED: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  };
  return (
    <span
      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[level]}`}
      title={label}
    >
      {label}
    </span>
  );
}
