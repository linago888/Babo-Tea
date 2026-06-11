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

type StageName = "google" | "rss" | "translate";

interface StageState {
  active: boolean;
  done: number;
  total: number;
  totalCreated: number;
  currentLabel?: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
}

/**
 * 跑全套 — 手動觸發跟 Vercel Cron 一樣的 daily 排程
 * 用串流 NDJSON 拿即時進度（per query / per source / per item）
 */
export function RunDailyCronButton() {
  const t = useTranslations("admin.newsInbox");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<Record<StageName, StageState>>({
    google: { active: false, done: 0, total: 0, totalCreated: 0, status: "pending" },
    rss: { active: false, done: 0, total: 0, totalCreated: 0, status: "pending" },
    translate: { active: false, done: 0, total: 0, totalCreated: 0, status: "pending" },
  });
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyEvent(ev: Record<string, unknown>) {
    const stage = ev.stage as StageName | "complete" | "error";
    if (stage === "complete") {
      setDurationMs((ev.durationMs as number) ?? null);
      return;
    }
    if (stage === "error") {
      setError(String(ev.error ?? "Unknown error"));
      return;
    }
    if (!["google", "rss", "translate"].includes(stage)) return;
    const stageName = stage as StageName;
    const status = ev.status as string;

    setStages((prev) => {
      const next = { ...prev };
      const cur = { ...next[stageName] };
      if (status === "start") {
        cur.active = true;
        cur.status = "running";
        cur.total = (ev.total as number) ?? 0;
        cur.done = 0;
      } else if (status === "progress") {
        cur.active = true;
        cur.status = "running";
        cur.total = (ev.total as number) ?? cur.total;
        cur.done = (ev.done as number) ?? cur.done;
        cur.totalCreated = (ev.totalCreated as number) ?? cur.totalCreated;
        const label = (ev.query ?? ev.source) as string | undefined;
        if (label) cur.currentLabel = label;
      } else if (status === "done") {
        cur.active = false;
        cur.status = "done";
        cur.done = cur.total > 0 ? cur.total : cur.done;
        if (typeof ev.created === "number") cur.totalCreated = ev.created;
        if (typeof ev.translated === "number") cur.totalCreated = ev.translated;
      } else if (status === "skip" || status === "skip-rest") {
        cur.active = false;
        cur.status = "skipped";
      } else if (status === "error" || status === "query-error" || status === "source-error") {
        if (status === "error") {
          cur.active = false;
          cur.status = "error";
        }
      }
      next[stageName] = cur;
      return next;
    });
  }

  async function run() {
    if (!confirm(t("runDailyConfirm"))) return;
    setBusy(true);
    setError(null);
    setDurationMs(null);
    setStages({
      google: { active: false, done: 0, total: 0, totalCreated: 0, status: "pending" },
      rss: { active: false, done: 0, total: 0, totalCreated: 0, status: "pending" },
      translate: { active: false, done: 0, total: 0, totalCreated: 0, status: "pending" },
    });

    try {
      const res = await fetch("/api/admin/news/cron-daily?stream=true", { method: "POST" });
      if (!res.body) {
        setError("No response body — streaming not supported");
        setBusy(false);
        return;
      }
      if (!res.ok && res.status !== 200) {
        const text = await res.text();
        const snippet = text.slice(0, 200).replace(/<[^>]+>/g, "").trim();
        setError(`HTTP ${res.status} — ${snippet}`);
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const ev = JSON.parse(trimmed) as Record<string, unknown>;
            applyEvent(ev);
          } catch {
            /* skip malformed line */
          }
        }
      }

      setBusy(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }

  const hasResult = stages.google.status !== "pending" || stages.rss.status !== "pending" || stages.translate.status !== "pending";

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        title={t("runDailyHint")}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {busy ? `🚀 ${t("runDailyRunning")}` : `🚀 ${t("runDaily")}`}
      </button>

      {(busy || hasResult) ? (
        <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-white p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900 sm:w-[340px]">
          <StageBar
            name="google"
            label={t("stageGoogle")}
            state={stages.google}
            color="violet"
          />
          <StageBar name="rss" label={t("stageRss")} state={stages.rss} color="emerald" />
          <StageBar
            name="translate"
            label={t("stageTranslate")}
            state={stages.translate}
            color="amber"
          />
          {durationMs !== null ? (
            <p className="pt-1 text-right text-[11px] text-neutral-500 dark:text-neutral-400">
              ✓ {(durationMs / 1000).toFixed(1)}s
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="max-w-[340px] text-right text-xs text-rose-700 dark:text-rose-400">⚠ {error}</p>
      ) : null}
    </div>
  );
}

function StageBar({
  name,
  label,
  state,
  color,
}: {
  name: StageName;
  label: string;
  state: StageState;
  color: "violet" | "emerald" | "amber";
}) {
  const pct =
    state.status === "done"
      ? 100
      : state.total > 0
        ? Math.min(100, Math.round((state.done / state.total) * 100))
        : state.status === "running"
          ? 5
          : 0;

  const barColor = {
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  }[color];
  const labelColor = {
    violet: "text-violet-700 dark:text-violet-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
  }[color];

  const statusIcon = {
    pending: "○",
    running: "●",
    done: "✓",
    skipped: "↷",
    error: "✗",
  }[state.status];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[11px] font-medium ${labelColor}`}>
          {statusIcon} {label}
        </span>
        <span className="text-[10px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
          {state.status === "done"
            ? `+${state.totalCreated}`
            : state.total > 0
              ? `${state.done}/${state.total}`
              : state.status === "skipped"
                ? "skipped"
                : ""}
        </span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full ${barColor} transition-[width] duration-300 ease-out ${state.status === "running" ? "opacity-90" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {state.currentLabel && state.status === "running" ? (
        <p className="mt-0.5 truncate text-[10px] text-neutral-500 dark:text-neutral-400">
          {state.currentLabel}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 批次翻譯 — 把收件匣裡缺翻譯的 DRAFT 用 AI 補齊 4 個 locale
 */
export function TranslateBatchButton({ fillBody = false }: { fillBody?: boolean }) {
  const t = useTranslations("admin.newsInbox");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ translated: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/translate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10, fillBody }),
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        const snippet = text.slice(0, 200).replace(/<[^>]+>/g, "").trim();
        setError(`HTTP ${res.status} — ${snippet}`);
        setBusy(false);
        return;
      }
      const typed = data as
        | {
            ok: true;
            summary: { translated: number; errors: Array<{ message: string }> };
          }
        | { ok: false; error?: string };
      if (!typed.ok) {
        setError("error" in typed && typed.error ? typed.error : "Translate failed");
        setBusy(false);
        return;
      }
      setResult({ translated: typed.summary.translated, errors: typed.summary.errors.length });
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
        className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
      >
        {busy ? `✨ ${t("translateRunning")}` : `✨ ${t("translateAll")}`}
      </button>
      {result ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ {t("translated")} {result.translated}
          {result.errors > 0 ? ` · ${result.errors} ${t("errors")}` : ""}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-700 dark:text-rose-400">⚠ {error}</p> : null}
    </div>
  );
}

/**
 * 🐛 Debug — 對單一 Google News URL 跑完整 resolve trace
 * 把每個 fallback 的結果秀出來，讓開發者知道哪一步失敗
 */
export function DebugResolveButton() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!url.trim()) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/debug-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`HTTP ${res.status} — ${text.slice(0, 200)}`);
        setBusy(false);
        return;
      }
      setResult(data);
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
      >
        🐛 偵錯 Google News 解析
      </button>
      {open ? (
        <div className="w-full rounded-lg border border-neutral-200 bg-white p-3 sm:w-[420px] dark:border-neutral-800 dark:bg-neutral-900">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="貼一個 https://news.google.com/rss/articles/CBMi... URL"
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            type="button"
            onClick={run}
            disabled={busy || !url.trim()}
            className="mt-2 w-full rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {busy ? "解析中…" : "跑 resolve trace"}
          </button>
          {error ? (
            <p className="mt-2 text-xs text-rose-700 dark:text-rose-400">⚠ {error}</p>
          ) : null}
          {result !== null ? (
            <pre className="mt-2 max-h-[400px] overflow-auto rounded bg-neutral-50 p-2 text-[10px] leading-tight dark:bg-neutral-800">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
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
