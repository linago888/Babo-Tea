import TaxonomyForm from "@/components/admin/taxonomy-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomyNewPage() {
  const locale = (await getAdminLocale()) as Locale;
  const parents = await prisma.taxonomy.findMany({
    select: { id: true, kind: true, code: true, labelI18n: true },
    orderBy: [{ kind: "asc" }, { code: "asc" }],
  });
  const parentOptions = parents.map((p) => ({
    id: p.id,
    kind: p.kind,
    label: `${p.code} · ${pickI18n(p.labelI18n, locale, { fallback: p.code })}`,
  }));
  return <TaxonomyForm mode="create" initial={{}} parents={parentOptions} />;
}
