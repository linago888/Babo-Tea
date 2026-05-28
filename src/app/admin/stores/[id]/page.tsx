import { notFound } from "next/navigation";

import StoreForm, { type StoreFormInitial } from "@/components/admin/store-form";
import { getAdminLocale } from "@/lib/admin-i18n";
import { type Locale } from "@/i18n/routing";
import { localizeCountry, pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function AdminStoreEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = (await getAdminLocale()) as Locale;
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) notFound();

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

  const initial: StoreFormInitial = {
    id: store.id,
    brandId: store.brandId,
    cityId: store.cityId,
    nameI18n: (store.nameI18n ?? {}) as Record<string, string>,
    addressI18n: (store.addressI18n ?? {}) as Record<string, string>,
    lat: store.lat.toString(),
    lng: store.lng.toString(),
    phone: store.phone ?? "",
    openingHoursText: store.openingHours !== null ? JSON.stringify(store.openingHours, null, 2) : "",
    isFlagship: store.isFlagship,
    franchise: store.franchise,
    openedAt: toDateInput(store.openedAt),
    closedAt: toDateInput(store.closedAt),
    externalIdsText: store.externalIds !== null ? JSON.stringify(store.externalIds, null, 2) : "",
    status: store.status,
  };

  return <StoreForm mode="edit" storeId={store.id} initial={initial} brands={brandOptions} cities={cityOptions} />;
}
