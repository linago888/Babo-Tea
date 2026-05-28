import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_JP, Noto_Sans_SC, Noto_Sans_TC } from "next/font/google";

import { AdminMobileNav, AdminSidebar } from "@/components/admin/sidebar";
import { ThemeScript } from "@/components/theme-script";
import { type Locale, localeMetadata } from "@/i18n/routing";
import { getAdminLocale } from "@/lib/admin-i18n";

import "../globals.css";

// 與 [locale]/layout.tsx 一致的字型設定
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const notoTC = Noto_Sans_TC({
  variable: "--font-noto-tc",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});
const notoSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});
const notoJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

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
  const locale = (await getAdminLocale()) as Locale;
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: "admin" });
  const meta = localeMetadata[locale];

  const fontClasses = [
    geistSans.variable,
    geistMono.variable,
    notoTC.variable,
    notoSC.variable,
    notoJP.variable,
  ].join(" ");

  return (
    <html lang={meta.bcp47} dir={meta.direction} className={`${fontClasses} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="flex min-h-screen">
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
      </body>
    </html>
  );
}
