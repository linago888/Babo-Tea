import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { AdminSidebar } from "@/components/admin/sidebar";
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
          {/* Mobile nav placeholder */}
          <header className="border-b border-neutral-200 bg-white px-6 py-3 lg:hidden dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <a href="/admin" className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden className="inline-block size-2.5 rounded-full bg-rose-700" />
                <span>{t("title")}</span>
              </a>
              <a href="/" className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("backToSite")}
              </a>
            </div>
          </header>

          <main className="flex-1 px-6 py-8 sm:px-10">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>

          <footer className="border-t border-neutral-200 bg-white px-6 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500">
            {t("footerNote")}
          </footer>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
