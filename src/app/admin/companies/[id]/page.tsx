import { notFound } from "next/navigation";

import CompanyForm, { type CompanyFormInitial } from "@/components/admin/company-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCompanyEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.company.findUnique({ where: { id } });
  if (!c) notFound();

  const initial: CompanyFormInitial = {
    id: c.id, slug: c.slug,
    nameI18n: (c.nameI18n ?? {}) as Record<string, string>,
    descriptionI18n: (c.descriptionI18n ?? {}) as Record<string, string>,
    countryCode: c.countryCode,
    foundedYear: c.foundedYear !== null ? String(c.foundedYear) : "",
    stockTicker: c.stockTicker ?? "",
    website: c.website ?? "",
    status: c.status,
  };

  return <CompanyForm mode="edit" companyId={c.id} initial={initial} />;
}
