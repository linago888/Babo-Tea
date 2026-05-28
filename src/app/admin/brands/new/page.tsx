import BrandForm from "@/components/admin/brand-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBrandNewPage() {
  const locale = (await getAdminLocale()) as Locale;

  const cities = await prisma.city.findMany({
    select: { id: true, nameI18n: true, countryCode: true },
    orderBy: { slug: "asc" },
  });

  const cityOptions = cities.map((c) => ({
    id: c.id,
    label: `${pickI18n(c.nameI18n, locale) || c.id} · ${localizeCountry(c.countryCode, locale)}`,
  }));

  // 在 create mode 下 relation tabs 不顯示，可以傳空陣列
  return (
    <BrandForm mode="create" initial={{}} cities={cityOptions} drinks={[]} companies={[]} />
  );
}
