import { notFound } from "next/navigation";

import TaxonomyForm, { type TaxonomyFormInitial } from "@/components/admin/taxonomy-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getAdminLocale()) as Locale;

  const tx = await prisma.taxonomy.findUnique({ where: { id } });
  if (!tx) notFound();

  const parents = await prisma.taxonomy.findMany({
    select: { id: true, kind: true, code: true, labelI18n: true },
    orderBy: [{ kind: "asc" }, { code: "asc" }],
  });
  const parentOptions = parents.map((p) => ({
    id: p.id,
    kind: p.kind,
    label: `${p.code} · ${pickI18n(p.labelI18n, locale, { fallback: p.code })}`,
  }));

  const initial: TaxonomyFormInitial = {
    id: tx.id,
    kind: tx.kind,
    code: tx.code,
    labelI18n: (tx.labelI18n ?? {}) as Record<string, string>,
    parentId: tx.parentId ?? "",
    sortOrder: String(tx.sortOrder),
    status: tx.status,
  };

  return <TaxonomyForm mode="edit" taxonomyId={tx.id} initial={initial} parents={parentOptions} />;
}
