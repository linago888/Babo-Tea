"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type Values = {
  label: string;
  query: string;
  locale: Locale;
  countryCode: string;
  enabled: boolean;
};

export type SearchQueryFormInitial = Partial<Values> & { id?: string };

export default function SearchQueryForm({
  mode,
  queryId,
  initial,
}: {
  mode: "create" | "edit";
  queryId?: string;
  initial: SearchQueryFormInitial;
}) {
  const t = useTranslations("admin.searchQueries.edit");
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    label: initial.label ?? "",
    query: initial.query ?? "",
    locale: (initial.locale as Locale) ?? routing.defaultLocale,
    countryCode: initial.countryCode ?? "",
    enabled: initial.enabled ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewItems, setPreviewItems] = useState<
    | Array<{
        title: string;
        publisher: string | null;
        publisherUrl: string | null;
        publishedAt: string | null;
        link: string;
      }>
    | null
  >(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function runPreview() {
    setPreviewing(true);
    setPreviewError(null);
    setPreviewItems(null);
    setPreviewCount(null);
    try {
      const res = await fetch("/api/admin/news/search-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: values.query.trim(),
          locale: values.locale,
          countryCode: values.countryCode.trim() ? values.countryCode.trim().toUpperCase() : null,
        }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            itemCount: number;
            items: Array<{
              title: string;
              publisher: string | null;
              publisherUrl: string | null;
              publishedAt: string | null;
              link: string;
            }>;
          }
        | { ok: false; error?: string };
      if (!data.ok) {
        setPreviewError("error" in data && data.error ? data.error : "Preview failed");
        setPreviewing(false);
        return;
      }
      setPreviewItems(data.items);
      setPreviewCount(data.itemCount);
      setPreviewing(false);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Network error");
      setPreviewing(false);
    }
  }

  // 預覽 — 動態組 Google News URL 給編輯看
  const previewUrl = (() => {
    if (!values.query || !values.locale) return null;
    const country = (values.countryCode || guessCountry(values.locale)).toUpperCase();
    const ceidLang = ceidFor(values.locale);
    const params = new URLSearchParams({
      q: values.query,
      hl: values.locale,
      gl: country,
      ceid: `${country}:${ceidLang}`,
    });
    return `https://news.google.com/rss/search?${params.toString()}`;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTopError(null);
    const payload = {
      label: values.label.trim(),
      query: values.query.trim(),
      locale: values.locale,
      countryCode: values.countryCode.trim() ? values.countryCode.trim().toUpperCase() : null,
      enabled: values.enabled,
    };
    const url = mode === "edit" ? `/api/admin/search-queries/${queryId}` : `/api/admin/search-queries`;
    const method = mode === "edit" ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json()) as
        | { ok: true; searchQuery?: { id: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };
      if (!data.ok) {
        const msg = "error" in data && data.error ? data.error :
                    "errors" in data && data.errors?.[0] ? `${data.errors[0].path}: ${data.errors[0].message}` :
                    "Save failed";
        setTopError(msg);
        setSubmitting(false);
        return;
      }
      setSavedAt(Date.now());
      setSubmitting(false);
      if (mode === "create" && data.searchQuery) router.replace(`/admin/search-queries/${data.searchQuery.id}`);
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!queryId || !confirm(t("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/search-queries/${queryId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) { setTopError(data.error ?? "Delete failed"); setSubmitting(false); return; }
      router.push("/admin/search-queries");
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/search-queries" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">{t("back")}</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{mode === "edit" ? t("title") : t("createTitle")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {savedAt ? <span className="text-xs text-emerald-700 dark:text-emerald-400">✓ {t("saved")}</span> : null}
          {mode === "edit" ? (
            <button type="button" onClick={handleDelete} disabled={submitting} className="rounded-md border border-rose-400 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200">{t("deleteButton")}</button>
          ) : null}
          <button type="submit" disabled={submitting} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600">{submitting ? t("saving") : t("saveButton")}</button>
        </div>
      </header>

      {topError ? <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{topError}</div> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="block text-xs font-medium">{t("fields.label")}</span>
          <input type="text" required value={values.label} onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))} placeholder="日本珍珠奶茶展店" className={inputClass} />
          <span className="block text-xs text-neutral-500">{t("fields.labelHint")}</span>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="block text-xs font-medium">{t("fields.query")}</span>
          <input type="text" required value={values.query} onChange={(e) => setValues((v) => ({ ...v, query: e.target.value }))} placeholder="bubble tea OR boba expansion" className={inputClass} />
          <span className="block text-xs text-neutral-500">{t("fields.queryHint")}</span>
        </label>

        <label className="block space-y-1">
          <span className="block text-xs font-medium">{t("fields.locale")}</span>
          <select value={values.locale} onChange={(e) => setValues((v) => ({ ...v, locale: e.target.value as Locale }))} className={inputClass}>
            {(routing.locales as readonly Locale[]).map((lc) => <option key={lc} value={lc}>{lc}</option>)}
          </select>
          <span className="block text-xs text-neutral-500">{t("fields.localeHint")}</span>
        </label>

        <label className="block space-y-1">
          <span className="block text-xs font-medium">{t("fields.countryCode")}</span>
          <input type="text" maxLength={2} value={values.countryCode} onChange={(e) => setValues((v) => ({ ...v, countryCode: e.target.value.toUpperCase() }))} placeholder="JP" className={`${inputClass} uppercase`} />
          <span className="block text-xs text-neutral-500">{t("fields.countryCodeHint")}</span>
        </label>

        <label className="flex items-center gap-2 self-end pb-1 sm:col-span-2">
          <input type="checkbox" checked={values.enabled} onChange={(e) => setValues((v) => ({ ...v, enabled: e.target.checked }))} className="size-4 rounded border-neutral-400" />
          <span className="text-sm font-medium">{t("fields.enabled")}</span>
        </label>
      </div>

      {previewUrl ? (
        <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-xs dark:border-violet-900 dark:bg-violet-950/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-violet-900 dark:text-violet-100">{t("preview.label")}</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 block break-all text-violet-700 hover:underline dark:text-violet-300"
              >
                {previewUrl} ↗
              </a>
              <p className="mt-1 text-violet-700 dark:text-violet-300">{t("preview.hint")}</p>
            </div>
            <button
              type="button"
              onClick={runPreview}
              disabled={previewing || !values.query.trim()}
              className="shrink-0 rounded-md border border-violet-400 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-neutral-900 dark:text-violet-200 dark:hover:bg-neutral-800"
            >
              {previewing ? `${t("preview.fetching")}` : `🔎 ${t("preview.fetch")}`}
            </button>
          </div>

          {previewError ? (
            <p className="mt-2 text-rose-700 dark:text-rose-400">⚠ {previewError}</p>
          ) : null}

          {previewItems !== null ? (
            <div className="mt-3 border-t border-violet-200 pt-3 dark:border-violet-900">
              <p className="mb-2 font-medium text-violet-900 dark:text-violet-100">
                {t("preview.foundCount", { count: previewCount ?? 0 })}
              </p>
              {previewItems.length === 0 ? (
                <p className="text-violet-700 dark:text-violet-300">{t("preview.noItems")}</p>
              ) : (
                <ul className="space-y-2">
                  {previewItems.map((item, i) => (
                    <li
                      key={i}
                      className="rounded border border-violet-200 bg-white p-2 dark:border-violet-900 dark:bg-neutral-900"
                    >
                      <div className="flex flex-wrap items-baseline gap-2 text-[11px] text-neutral-500">
                        {item.publisher ? (
                          <span className="font-medium text-violet-700 dark:text-violet-300">
                            {item.publisher}
                          </span>
                        ) : null}
                        {item.publisherUrl ? (
                          <span className="font-mono text-neutral-500">
                            {new URL(item.publisherUrl).hostname.replace(/^www\./, "")}
                          </span>
                        ) : null}
                        {item.publishedAt ? (
                          <span>· {new Date(item.publishedAt).toLocaleString()}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer noopener nofollow"
                          className="hover:underline"
                        >
                          {item.title || item.link} ↗
                        </a>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

const inputClass = "w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100";

function ceidFor(locale: string): string {
  const lc = locale.toLowerCase();
  if (lc === "zh-tw") return "zh-Hant";
  if (lc === "zh-cn") return "zh-Hans";
  return locale.split("-")[0];
}
function guessCountry(locale: string): string {
  const lc = locale.toLowerCase();
  if (lc.startsWith("zh-tw")) return "TW";
  if (lc.startsWith("zh-cn")) return "CN";
  if (lc.startsWith("ja")) return "JP";
  return "US";
}
