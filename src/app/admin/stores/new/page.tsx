import StoreForm from "@/components/admin/store-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminStoreNewPage() {
  const locale = (await getAdminLocale()) as Locale;
  const [brands, cities] = await Promise.all([
    prisma.brand.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, slug: true, nameI18n: true },
      orderBy: { slug: "asc" },
    }),
    prisma.city.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, slug: true, nameI18n: true, countryCode: true },
      orderBy: { slug: "asc" },
    }),
  ]);
  const brandOptions = brands.map((b) => ({
    id: b.id, label: pickI18n(b.nameI18n, locale, { fallback: b.slug }),
  }));
  const cityOptions = cities.map((c) => ({
    id: c.id,
    label: `${pickI18n(c.nameI18n, locale, { fallback: c.slug })} · ${localizeCountry(c.countryCode, locale)}`,
  }));
  return <StoreForm mode="create" initial={{}} brands={brandOptions} cities={cityOptions} />;
}
