"use client";

/**
 * /admin/news-inbox 專用的 error boundary。
 * Next.js 在 server component 或 client component 拋例外時會渲染這個元件，
 * 而不是顯示空白 / 瀏覽器的「無法顯示網頁」。
 */
import { useEffect } from "react";

export default function NewsInboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[news-inbox] error:", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-rose-300 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/50">
      <h1 className="text-xl font-bold text-rose-900 dark:text-rose-100">
        ⚠ 新聞收件匣載入失敗
      </h1>
      <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
        後台拋出例外。完整訊息：
      </p>
      <pre className="mt-3 max-h-[400px] overflow-auto rounded bg-rose-100 p-3 text-xs text-rose-900 dark:bg-rose-900 dark:text-rose-100">
        {error.message}
        {error.digest ? `\n\nDigest: ${error.digest}` : ""}
        {error.stack ? `\n\n${error.stack.slice(0, 2000)}` : ""}
      </pre>
      <p className="mt-3 text-xs text-rose-700 dark:text-rose-400">
        最常見原因：
      </p>
      <ul className="mt-1 list-inside list-disc text-xs text-rose-700 dark:text-rose-400">
        <li>sql/008_news_search_queries.sql 還沒在 Supabase 跑 — 看 Vercel function logs 是不是 P2021</li>
        <li>有一筆 News 的 source 已被硬刪導致 FK 失效（不太可能因為有 Restrict 約束）</li>
        <li>Supabase pooler 暫時連不上</li>
      </ul>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600"
      >
        重試
      </button>
    </div>
  );
}
