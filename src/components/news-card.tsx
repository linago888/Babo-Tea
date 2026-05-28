import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { News, Source } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { formatRelativeTime } from "@/lib/intl";

/**
 * 新聞卡 — 用在 /news 列表頁。
 * 比 NewsListItem 大，含完整 summary。
 */
export async function NewsCard({
  news,
  locale,
}: {
  news: News & { source: Source };
  locale: Locale;
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
        className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
      >
        <header className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {t(`newsList.category.${news.category.toLowerCase()}`)}
          </span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
            {relative}
          </span>
        </header>

        <h2 className="text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
          {title}
        </h2>

        <p className="line-clamp-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {summary}
        </p>

        <p className="mt-auto text-xs text-neutral-500 dark:text-neutral-400">
          {sourceName}
        </p>
      </Link>
    </li>
  );
}
