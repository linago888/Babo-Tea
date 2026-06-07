"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

/**
 * Per-row 快速動作：📝 編輯 / ✓ 發布 / 🗑 刪除
 */
export function InboxRowActions({ newsId }: { newsId: string }) {
  const t = useTranslations("admin.newsInbox.actions");
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy("publish");
    setError(null);
    try {
      const res = await fetch(`/api/admin/news/${newsId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Publish failed");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(t("deleteConfirm"))) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/news/${newsId}?hard=true`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Delete failed");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Link
          href={`/admin/news/${newsId}`}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          📝 {t("edit")}
        </Link>
        <button
          type="button"
          onClick={publish}
          disabled={busy !== null}
          className="rounded-md border border-emerald-400 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
        >
          {busy === "publish" ? "…" : `✓ ${t("publish")}`}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
        >
          {busy === "delete" ? "…" : `🗑 ${t("delete")}`}
        </button>
      </div>
      {error ? (
        <span className="max-w-[300px] text-right text-[10px] text-rose-700 dark:text-rose-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/**
 * 從 Google News 搜尋查詢拉取
 */
export function GoogleNewsCrawlButton() {
  const t = useTranslations("admin.newsInbox");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    queries: number;
    created: number;
    skipped: number;
    sourcesCreated: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/search-crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Vercel timeout / 500 HTML page → 顯示真實狀態
        const snippet = text.slice(0, 200).replace(/<[^>]+>/g, "").trim();
        setError(
          `HTTP ${res.status} ${res.statusText} — 可能是 function timeout（Vercel Hobby 上限 60s）。建議先停用部分查詢或縮減 query 範圍。${snippet ? ` 回應片段：${snippet}` : ""}`,
        );
        setBusy(false);
        return;
      }
      const typed = data as
        | {
            ok: true;
            summaries: Array<{
              created: number;
              skipped: number;
              sourcesAutoCreated: number;
              errors: Array<unknown>;
            }>;
          }
        | { ok: false; error?: string };
      if (!typed.ok) {
        setError("error" in typed && typed.error ? typed.error : "Google News crawl failed");
        setBusy(false);
        return;
      }
      const created = typed.summaries.reduce((s, x) => s + x.created, 0);
      const skipped = typed.summaries.reduce((s, x) => s + x.skipped, 0);
      const sourcesCreated = typed.summaries.reduce((s, x) => s + x.sourcesAutoCreated, 0);
      const errors = typed.summaries.reduce((s, x) => s + x.errors.length, 0);
      setResult({ queries: typed.summaries.length, created, skipped, sourcesCreated, errors });
      setBusy(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
      >
        {busy ? `🔎 ${t("googleCrawlRunning")}` : `🔎 ${t("googleCrawl")}`}
      </button>
      {result ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ {result.queries} {t("queries")} · +{result.created} {t("created")} ·{" "}
          {result.skipped} {t("skipped")}
          {result.sourcesCreated > 0 ? ` · +${result.sourcesCreated} ${t("sourcesAuto")}` : ""}
          {result.errors > 0 ? ` · ${result.errors} ${t("errors")}` : ""}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-700 dark:text-rose-400">⚠ {error}</p> : null}
    </div>
  );
}

/**
 * Header 上的「拉取所有來源」按鈕
 */
export function IngestAllButton() {
  const t = useTranslations("admin.newsInbox");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    sources: number;
    created: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/ingest-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            summaries: Array<{ created: number; skipped: number; errors: Array<unknown> }>;
          }
        | { ok: false; error?: string };
      if (!data.ok) {
        setError("error" in data && data.error ? data.error : "Ingest failed");
        setBusy(false);
        return;
      }
      const created = data.summaries.reduce((s, x) => s + x.created, 0);
      const skipped = data.summaries.reduce((s, x) => s + x.skipped, 0);
      const errors = data.summaries.reduce((s, x) => s + x.errors.length, 0);
      setResult({ sources: data.summaries.length, created, skipped, errors });
      setBusy(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-800 disabled:opacity-50 dark:bg-violet-700 dark:hover:bg-violet-600"
      >
        {busy ? `🌐 ${t("ingestAllRunning")}` : `🌐 ${t("ingestAll")}`}
      </button>
      {result ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ {result.sources} {t("sources")} · +{result.created} {t("created")} ·{" "}
          {result.skipped} {t("skipped")}
          {result.errors > 0 ? ` · ${result.errors} ${t("errors")}` : ""}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-700 dark:text-rose-400">⚠ {error}</p> : null}
    </div>
  );
}
