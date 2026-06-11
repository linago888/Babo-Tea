"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface SelectionCtx {
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  setMany: (ids: string[], selected: boolean) => void;
  count: number;
}

const Ctx = createContext<SelectionCtx | null>(null);

/**
 * Provider 包整個 inbox 列表。內部用 Set<string> 追蹤勾選的 news id。
 * 提供：
 *   - checkbox 元件（每一筆）
 *   - 全選 / 取消全選工具列
 *   - 批次刪除按鈕
 *
 * allIds 由 server 算出後傳進來；批次刪除 client 端做樂觀 UI（router.refresh）。
 */
export function InboxSelectionProvider({
  allIds,
  children,
}: {
  allIds: string[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setMany = useCallback((ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const value = useMemo<SelectionCtx>(
    () => ({ isSelected, toggle, setMany, count: selected.size }),
    [isSelected, toggle, setMany, selected],
  );

  return (
    <Ctx.Provider value={value}>
      <BulkActionBar allIds={allIds} selected={selected} setMany={setMany} />
      {children}
    </Ctx.Provider>
  );
}

function useSelection(): SelectionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("InboxRowCheckbox must be inside InboxSelectionProvider");
  return v;
}

/** 每一筆 row 用的 checkbox */
export function InboxRowCheckbox({ id }: { id: string }) {
  const { isSelected, toggle } = useSelection();
  const checked = isSelected(id);
  return (
    <label className="flex h-full shrink-0 cursor-pointer items-center pr-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => toggle(id)}
        className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-rose-600 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800"
        aria-label={`Select row ${id}`}
      />
    </label>
  );
}

function BulkActionBar({
  allIds,
  selected,
  setMany,
}: {
  allIds: string[];
  selected: Set<string>;
  setMany: (ids: string[], on: boolean) => void;
}) {
  const t = useTranslations("admin.newsInbox.bulk");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setMany(allIds, !allSelected);
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(t("confirmDelete", { count: ids.length }))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, hard: true }),
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`HTTP ${res.status} — ${text.slice(0, 150)}`);
        setBusy(false);
        return;
      }
      const typed = data as { ok: boolean; affected?: number; error?: string };
      if (!typed.ok) {
        setError(typed.error ?? "Delete failed");
        setBusy(false);
        return;
      }
      // 樂觀 UI：清空 selection 然後 refresh server data
      setMany(ids, false);
      setBusy(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
          className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-rose-600 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <span className="font-medium">{t("selectAll")}</span>
        {selected.size > 0 ? (
          <span className="rounded-full bg-rose-100 px-2 text-xs font-mono tabular-nums text-rose-800 dark:bg-rose-950 dark:text-rose-200">
            {selected.size}
          </span>
        ) : null}
      </label>

      <button
        type="button"
        onClick={deleteSelected}
        disabled={selected.size === 0 || busy}
        className="ml-auto rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
      >
        {busy
          ? `🗑 ${t("deletingRunning")}`
          : selected.size > 0
            ? `🗑 ${t("deleteSelected", { count: selected.size })}`
            : `🗑 ${t("deleteSelectedEmpty")}`}
      </button>

      {error ? (
        <p className="basis-full text-xs text-rose-700 dark:text-rose-400">⚠ {error}</p>
      ) : null}
    </div>
  );
}
