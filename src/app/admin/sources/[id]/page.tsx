import { notFound } from "next/navigation";

import SourceForm, { type SourceFormInitial } from "@/components/admin/source-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSourceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) notFound();

  const initial: SourceFormInitial = {
    id: source.id,
    slug: source.slug,
    nameI18n: (source.nameI18n ?? {}) as Record<string, string>,
    domain: source.domain,
    countryCode: source.countryCode ?? "",
    primaryLanguage: source.primaryLanguage,
    kind: source.kind,
    credibilityScore: source.credibilityScore !== null ? String(source.credibilityScore) : "",
    paywall: source.paywall,
    notes: source.notes ?? "",
    rssFeedUrl: source.rssFeedUrl ?? "",
    lastCrawledAt: source.lastCrawledAt ? source.lastCrawledAt.toISOString() : null,
    status: source.status,
  };

  return <SourceForm mode="edit" sourceId={source.id} initial={initial} />;
}
