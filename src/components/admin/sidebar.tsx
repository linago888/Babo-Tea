"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function useNavGroups(): NavGroup[] {
  const t = useTranslations("admin.nav");
  return [
    {
      label: t("dashboard"),
      items: [{ label: t("overview"), href: "/admin" }],
    },
    {
      label: t("content"),
      items: [
        { label: t("brands"), href: "/admin/brands" },
        { label: t("cities"), href: "/admin/cities" },
        { label: t("drinks"), href: "/admin/drinks" },
        { label: t("news"), href: "/admin/news" },
        { label: t("newsInbox"), href: "/admin/news-inbox" },
        { label: t("stores"), href: "/admin/stores" },
        { label: t("companies"), href: "/admin/companies" },
        { label: t("sources"), href: "/admin/sources" },
        { label: t("taxonomies"), href: "/admin/taxonomies" },
      ],
    },
    {
      label: t("quality"),
      items: [
        { label: t("qualityDashboard"), href: "/admin/quality" },
        { label: t("metrics"), href: "/admin/metrics" },
        { label: t("searchLog"), href: "/admin/search-log" },
      ],
    },
  ];
}

/**
 * 桌面 + 平板 sidebar (≥ md / 768px)
 */
export function AdminSidebar() {
  const tSoon = useTranslations("admin");
  const pathname = usePathname();
  const groups = useNavGroups();

  return (
    <aside className="hidden border-r border-neutral-200 bg-white sm:flex sm:w-52 sm:flex-col md:w-56 lg:w-60 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 px-5 py-5 dark:border-neutral-800">
        <Link href="/admin" className="flex items-center gap-2 text-base font-semibold">
          <span aria-hidden className="inline-block size-3 rounded-full bg-rose-700" />
          <span>Admin</span>
        </Link>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Global Boba Graph</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {groups.map((g) => (
          <NavGroupBlock key={g.label} group={g} pathname={pathname} tSoonSoon={tSoon("soon")} />
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

/**
 * 小螢幕專用 (< md / 768px)：漢堡按鈕 + 抽屜選單
 */
export function AdminMobileNav() {
  const t = useTranslations("admin");
  const tSoon = useTranslations("admin");
  const pathname = usePathname();
  const groups = useNavGroups();
  const [open, setOpen] = useState(false);

  // 切換路徑後自動關閉
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 抽屜開時鎖 body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:hidden dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {/* 漢堡 icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M2 4h14M2 9h14M2 14h14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className="inline-block size-2.5 rounded-full bg-rose-700" />
          <span>{t("title")}</span>
        </Link>

        <Link
          href="/"
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          {t("backToSite")}
        </Link>
      </header>

      {/* 抽屜 + 遮罩 */}
      {open ? (
        <div className="fixed inset-0 z-40 sm:hidden">
          {/* 背景遮罩 */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-neutral-900/50"
          />
          {/* 抽屜本體 */}
          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <Link href="/admin" className="flex items-center gap-2 text-base font-semibold">
                <span aria-hidden className="inline-block size-3 rounded-full bg-rose-700" />
                <span>Admin</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2 2l10 10M12 2L2 12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-4">
              {groups.map((g) => (
                <NavGroupBlock
                  key={g.label}
                  group={g}
                  pathname={pathname}
                  tSoonSoon={tSoon("soon")}
                />
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
          </div>
        </div>
      ) : null}
    </>
  );
}

function NavGroupBlock({
  group,
  pathname,
  tSoonSoon,
}: {
  group: NavGroup;
  pathname: string;
  tSoonSoon: string;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
        {group.label}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {group.items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          if (item.disabled) {
            return (
              <li key={item.href}>
                <span
                  className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-1.5 text-sm text-neutral-400 dark:text-neutral-600"
                  title="Coming soon"
                >
                  <span>{item.label}</span>
                  <span className="text-[9px]">{tSoonSoon}</span>
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
  );
}
