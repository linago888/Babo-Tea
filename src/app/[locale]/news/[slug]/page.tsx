import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { Breadcrumb } from "@/components/breadcrumb";
import type { RelevanceLevel } from "@/generated/prisma/enums";
import { type Locale, localeMetadata, routing } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { formatDate } from "@/lib/intl";
import { buildPageMetadata, SITE_URL } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";

interface PageParams {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 600;

export async function generateStaticParams() {
  const news = await prisma.news.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return routing.locales.flatMap((locale) =>
    news.map((n) => ({ locale, slug: n.slug })),
  );
}

async function getNewsPage(slug: string) {
  return prisma.news.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      source: true,
      newsBrands: {
        include: { brand: true },
        orderBy: { relevance: "asc" }, // primary 字面排在最前
      },
      newsCities: {
        include: { city: true },
        orderBy: { relevance: "asc" },
      },
      newsDrinks: {
        include: { drink: true },
        orderBy: { relevance: "asc" },
      },
    },
  });
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const news = await prisma.news.findUnique({
    where: { slug, status: "PUBLISHED" },
    select: { titleI18n: true, summaryI18n: true },
  });
  if (!news) return {};
  const title = pickI18n(news.titleI18n, locale as Locale);
  const summary = pickI18n(news.summaryI18n, locale as Locale);
  return buildPageMetadata({
    locale: locale as Locale,
    path: `/news/${slug}`,
    title,
    description: summary || undefined,
  });
}

/** 把同一類關聯依 relevance 分組（primary/secondary/mentioned 順序） */
function groupByRelevance<T extends { relevance: RelevanceLevel }>(items: T[]) {
  const order: RelevanceLevel[] = ["PRIMARY", "SECONDARY", "MENTIONED"];
  const groups: Record<RelevanceLevel, T[]> = {
    PRIMARY: [],
    SECONDARY: [],
    MENTIONED: [],
  };
  for (const it of items) groups[it.relevance].push(it);
  return order.map((rel) => ({ relevance: rel, items: groups[rel] }));
}

export default async function NewsDetailPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const news = await getNewsPage(slug);
  if (!news) notFound();

  const t = await getTranslations({ locale });
  const lc = locale as Locale;

  const title = pickI18n(news.titleI18n, lc);
  const summary = pickI18n(news.summaryI18n, lc);
  const body = pickI18n(news.bodyI18n, lc);
  const sourceName = pickI18n(news.source.nameI18n, lc);
  const publishedDate = formatDate(news.publishedAt, lc, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // AI 摘要僅在 reviewed_by 非 null 才對外顯示（編輯審核後才公開）
  const aiSummary =
    news.aiSummaryReviewedBy && news.aiSummaryI18n
      ? pickI18n(news.aiSummaryI18n, lc)
      : null;
  const aiReviewedOn = news.aiSummaryReviewedAt
    ? formatDate(news.aiSummaryReviewedAt, lc, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const brandGroups = groupByRelevance(news.newsBrands);
  const cityGroups = groupByRelevance(news.newsCities);
  const drinkGroups = groupByRelevance(news.newsDrinks);

  // SEO：NewsArticle
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: summary || undefined,
    inLanguage: localeMetadata[lc].bcp47,
    datePublished: news.publishedAt.toISOString(),
    url: `${SITE_URL}/${locale}/news/${slug}`,
    ...(news.heroImageUrl ? { image: [news.heroImageUrl] } : {}),
    author: { "@type": "Organization", name: sourceName },
    publisher: {
      "@type": "Organization",
      name: t("site.name"),
      url: SITE_URL,
    },
    articleSection: t(`newsList.category.${news.category.toLowerCase()}`),
    isAccessibleForFree: true,
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }}
      />

      <Breadcrumb
        locale={lc}
        items={[
          { label: t("nav.news"), path: "/news" },
          { label: title },
        ]}
      />

      {/* ── Hero ── */}
      <header className="mt-4 mb-6 flex flex-col gap-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <span className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
          {t(`newsList.category.${news.category.toLowerCase()}`)}
        </span>
        <h1
          className="text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl dark:text-neutral-50"
          lang={localeMetadata[lc].bcp47}
        >
          {title}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-medium">{sourceName}</span>
          <span className="mx-2">·</span>
          <time dateTime={news.publishedAt.toISOString()}>
            {t("newsDetail.publishedAt", { date: publishedDate })}
          </time>
        </p>
      </header>

      {/* Summary */}
      <p className="mb-8 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
        {summary}
      </p>

      {/* AI summary — 僅 reviewed_by 非 null 才顯示 */}
      {aiSummary ? (
        <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t("newsDetail.aiSummary.title")}
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                ✓ {t("newsDetail.aiSummary.reviewed")}
              </span>
            </h2>
            {aiReviewedOn ? (
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                {t("newsDetail.aiSummary.reviewedOn", { date: aiReviewedOn })}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
            {aiSummary}
          </p>
        </section>
      ) : null}

      {/* Body — 現階段 plain-text + whitespace-pre-line；CMS 接上 markdown 後可換 markdown renderer */}
      <article className="prose prose-neutral max-w-none dark:prose-invert">
        <div className="whitespace-pre-line text-base leading-relaxed text-neutral-800 dark:text-neutral-200">
          {body}
        </div>
      </article>

      {/* Source link */}
      {news.sourceUrl ? (
        <p className="mt-6 text-sm">
          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noreferrer noopener nofollow"
            className="text-amber-700 hover:underline dark:text-amber-300"
          >
            {t("newsDetail.viewSource")}
          </a>
        </p>
      ) : null}

      {/* ── Related entities ── */}
      <section className="mt-12 grid grid-cols-1 gap-8 border-t border-neutral-200 pt-10 sm:grid-cols-3 dark:border-neutral-800">
        {news.newsBrands.length > 0 ? (
          <RelatedGroup
            title={t("newsDetail.sections.relatedBrands")}
            groups={brandGroups}
            renderItem={(nb) => (
              <Link
                href={`/${lc}/brands/${nb.brand.slug}`}
                prefetch={false}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <BrandLogo
                  slug={nb.brand.slug}
                  nameI18n={nb.brand.nameI18n}
                  logoUrl={nb.brand.logoUrl}
                  locale={lc}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-neutral-800 dark:text-neutral-200">
                  {pickI18n(nb.brand.nameI18n, lc)}
                </span>
              </Link>
            )}
            relevanceLabel={(rel) => t(`relevance.${rel.toLowerCase()}`)}
            keyOf={(nb) => nb.brandId}
          />
        ) : null}

        {news.newsCities.length > 0 ? (
          <RelatedGroup
            title={t("newsDetail.sections.relatedCities")}
            groups={cityGroups}
            renderItem={(nc) => (
              <Link
                href={`/${lc}/cities/${nc.city.slug}`}
                prefetch={false}
                className="block rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                {pickI18n(nc.city.nameI18n, lc)}
              </Link>
            )}
            relevanceLabel={(rel) => t(`relevance.${rel.toLowerCase()}`)}
            keyOf={(nc) => nc.cityId}
          />
        ) : null}

        {news.newsDrinks.length > 0 ? (
          <RelatedGroup
            title={t("newsDetail.sections.relatedDrinks")}
            groups={drinkGroups}
            renderItem={(nd) => (
              <Link
                href={`/${lc}/drinks/${nd.drink.slug}`}
                prefetch={false}
                className="block rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                {pickI18n(nd.drink.nameI18n, lc)}
              </Link>
            )}
            relevanceLabel={(rel) => t(`relevance.${rel.toLowerCase()}`)}
            keyOf={(nd) => nd.drinkId}
          />
        ) : null}
      </section>
    </main>
  );
}

function RelatedGroup<T extends { relevance: RelevanceLevel }>({
  title,
  groups,
  renderItem,
  relevanceLabel,
  keyOf,
}: {
  title: string;
  groups: Array<{ relevance: RelevanceLevel; items: T[] }>;
  renderItem: (item: T) => React.ReactNode;
  relevanceLabel: (rel: RelevanceLevel) => string;
  keyOf: (item: T) => string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
        {title}
      </h2>
      <div className="flex flex-col gap-4">
        {groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <div key={g.relevance} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                {relevanceLabel(g.relevance)}
              </span>
              <ul className="flex flex-col gap-0.5">
                {g.items.map((item) => (
                  <li key={keyOf(item)}>{renderItem(item)}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
