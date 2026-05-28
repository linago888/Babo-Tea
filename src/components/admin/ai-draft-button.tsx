"use client";

import { useState } from "react";

import { type Locale, routing } from "@/i18n/routing";

type Drafts = Record<string, Record<string, string>>; // fields → locales → text

export type AiDraftButtonProps = {
  /** 人類可讀的指令，例如 "Write a 50-80 word marketing description for this brand." */
  instruction: string;
  /** 用 lazy callback 取最新的 context（避免 stale closure，每次 click 時才組） */
  getContext: () => string;
  /** 要生成的 fields，例如 ["text"] 或 ["title", "description"] */
  fields: string[];
  /** 字數上限提示，例如 { title: 60, description: 160 } */
  maxChars?: Record<string, number>;
  /** 拿到 drafts 後的處理 — { fieldName: { locale: text } } */
  onApply: (drafts: Drafts) => void;
  /** 限定產哪幾個 locale，預設全部 */
  locales?: Locale[];
  /** 按鈕標籤 */
  label?: string;
  className?: string;
};

export default function AiDraftButton({
  instruction,
  getContext,
  fields,
  maxChars,
  onApply,
  locales,
  label = "✨ AI 草稿",
  className = "",
}: AiDraftButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch("/api/admin/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          context: getContext(),
          fields,
          locales: locales ?? (routing.locales as readonly string[]),
          maxChars,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; drafts: Drafts }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };
      if (!data.ok) {
        const msg =
          "error" in data && data.error
            ? data.error
            : "errors" in data && data.errors && data.errors.length > 0
              ? `${data.errors[0].path}: ${data.errors[0].message}`
              : "AI request failed";
        setError(msg);
        setLoading(false);
        return;
      }
      onApply(data.drafts);
      setSavedAt(Date.now());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }

  return (
    <div className={`inline-flex flex-col items-end gap-0.5 ${className}`}>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 transition hover:border-violet-400 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900"
      >
        {loading ? <Spinner /> : <span aria-hidden>✨</span>}
        <span>{loading ? "AI 生成中…" : label}</span>
      </button>
      {savedAt ? (
        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">已填入 4 個 locale</span>
      ) : null}
      {error ? (
        <span className="max-w-[300px] truncate text-[10px] text-rose-700 dark:text-rose-400" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className="animate-spin"
      aria-hidden
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="20 8"
      />
    </svg>
  );
}
