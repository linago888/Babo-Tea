import { notFound } from "next/navigation";

import SearchQueryForm, { type SearchQueryFormInitial } from "@/components/admin/search-query-form";
import { type Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSearchQueryEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.newsSearchQuery.findUnique({ where: { id } });
  if (!q) notFound();

  const initial: SearchQueryFormInitial = {
    id: q.id,
    label: q.label,
    query: q.query,
    locale: q.locale as Locale,
    countryCode: q.countryCode ?? "",
    enabled: q.enabled,
  };
  return <SearchQueryForm mode="edit" queryId={q.id} initial={initial} />;
}
