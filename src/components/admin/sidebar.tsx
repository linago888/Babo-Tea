"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const t = useTranslations("admin.nav");
  const tSoon = useTranslations("admin");
  const pathname = usePathname();

  const groups: NavGroup[] = [
    {
      label: t("dashboard"),
      items: [{ label: t("overview"), href: "/admin" }],
    },
    {
      label: t("content"),
      items: [
        { label: t("brands"), href: "/admin/brands" },
        { label: t("cities"), href: "/admin/cities", disabled: true },
        { label: t("drinks"), href: "/admin/drinks", disabled: true },
        { label: t("news"), href: "/admin/news", disabled: true },
        { label: t("sources"), href: "/admin/sources", disabled: true },
        { label: t("taxonomies"), href: "/admin/taxonomies", disabled: true },
      ],
    },
    {
      label: t("quality"),
      items: [
        { label: t("qualityDashboard"), href: "/admin/quality" },
      ],
    },
  ];

  return (
    <aside className="hidden border-r border-neutral-200 bg-white lg:flex lg:w-60 lg:flex-col dark:border-neutral-800 dark:bg-neutral-900">
      <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/admin" className="flex items-center gap-2 text-base font-semibold">
          <span aria-hidden className="inline-block size-3 rounded-full bg-rose-700" />
          <span>Admin</span>
        </Link>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Global Boba Graph
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <h3 className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
              {g.label}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <span
                        className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-1.5 text-sm text-neutral-400 dark:text-neutral-600"
                        title="Coming soon"
                      >
                        <span>{item.label}</span>
                        <span className="text-[9px]">{tSoon("soon")}</span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center rounded-md px-3 py-1.5 text-sm transition ${
                        active
                          ? "bg-rose-50 font-medium text-rose-900 dark:bg-rose-950 dark:text-rose-200"
                          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 px-3 py-3 text-xs dark:border-neutral-800">
        <Link
          href="/"
          className="block rounded-md px-3 py-1.5 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
        >
          {tSoon("backToSite")}
        </Link>
      </div>
    </aside>
  );
}
