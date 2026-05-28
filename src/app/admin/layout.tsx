import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { AdminMobileNav, AdminSidebar } from "@/components/admin/sidebar";
import { getAdminLocale } from "@/lib/admin-i18n";

// Auth handled by proxy.ts middleware (HTTP Basic). 進到這層代表已通過驗證。

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAdminLocale();
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: t("title"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();
  // 取整份 messages 給 client component 用（sidebar 等）
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* 小螢幕：漢堡 + 抽屜 nav */}
          <AdminMobileNav />

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>

          <footer className="border-t border-neutral-200 bg-white px-6 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500">
            {t("footerNote")}
          </footer>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
