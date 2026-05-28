import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin · Global Boba Graph",
  description: "Internal editorial dashboard.",
  robots: { index: false, follow: false }, // 防止 search engine 收錄
};

// Auth handled by proxy.ts middleware (HTTP Basic). 進到這層代表已通過驗證。

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className="inline-block size-2.5 rounded-full bg-rose-700" />
            <span>Admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              Overview
            </Link>
            <Link
              href="/admin/quality"
              className="rounded-md px-3 py-1.5 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              Content quality
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-50">
              ← Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>

      <footer className="border-t border-neutral-200 bg-white px-6 py-4 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500">
        <div className="mx-auto max-w-7xl">
          Editorial console · Payload v3 admin (full CRUD) lands in Phase 4.5
        </div>
      </footer>
    </div>
  );
}
