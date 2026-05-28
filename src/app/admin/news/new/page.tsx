import NewsForm from "@/components/admin/news-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminNewsNewPage() {
  const locale = (await getAdminLocale()) as Locale;
  const sources = await prisma.source.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, slug: true, nameI18n: true, domain: true },
    orderBy: { slug: "asc" },
  });
  const sourceOptions = sources.map((s) => ({
    id: s.id,
    label: `${pickI18n(s.nameI18n, locale, { fallback: s.slug })} · ${s.domain}`,
  }));
  return <NewsForm mode="create" initial={{}} sources={sourceOptions} />;
}
