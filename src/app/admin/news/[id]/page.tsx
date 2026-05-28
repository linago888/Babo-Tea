import { notFound } from "next/navigation";

import NewsForm, { type NewsFormInitial } from "@/components/admin/news-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 把 UTC ISO 字串轉成 <input type="datetime-local"> 接受的 "YYYY-MM-DDTHH:mm" 格式
function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export default async function AdminNewsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getAdminLocale()) as Locale;

  const news = await prisma.news.findUnique({ where: { id } });
  if (!news) notFound();

  const sources = await prisma.source.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, slug: true, nameI18n: true, domain: true },
    orderBy: { slug: "asc" },
  });
  const sourceOptions = sources.map((s) => ({
    id: s.id,
    label: `${pickI18n(s.nameI18n, locale, { fallback: s.slug })} · ${s.domain}`,
  }));

  const initial: NewsFormInitial = {
    id: news.id,
    slug: news.slug,
    titleI18n: (news.titleI18n ?? {}) as Record<string, string>,
    summaryI18n: (news.summaryI18n ?? {}) as Record<string, string>,
    bodyI18n: (news.bodyI18n ?? {}) as Record<string, string>,
    aiSummaryI18n: (news.aiSummaryI18n ?? {}) as Record<string, string>,
    aiSummaryReviewedAt: toDatetimeLocal(news.aiSummaryReviewedAt),
    seoI18n: (news.seoI18n ?? {}) as Record<string, { title?: string; description?: string }>,
    category: news.category,
    sourceId: news.sourceId,
    sourceUrl: news.sourceUrl,
    publishedAt: toDatetimeLocal(news.publishedAt),
    heroImageUrl: news.heroImageUrl ?? "",
    editorTags: news.editorTags.join(", "),
    status: news.status,
  };

  return <NewsForm mode="edit" newsId={news.id} initial={initial} sources={sourceOptions} />;
}
