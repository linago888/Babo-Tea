"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type NewsCategory =
  | "EXPANSION"
  | "LAUNCH"
  | "FRANCHISE_INVESTMENT"
  | "CITY_MARKET"
  | "TREND"
  | "SUPPLY_CHAIN"
  | "CULTURE";

type SeoPerLocale = { title?: string; description?: string };

type NewsFormValues = {
  slug: string;
  titleI18n: Record<string, string>;
  summaryI18n: Record<string, string>;
  bodyI18n: Record<string, string>;
  aiSummaryI18n: Record<string, string>;
  aiSummaryReviewedAt: string; // ISO datetime-local input
  seoI18n: Record<string, SeoPerLocale>;
  category: NewsCategory;
  sourceId: string;
  sourceUrl: string;
  publishedAt: string; // ISO datetime-local input
  heroImageUrl: string;
  editorTags: string; // comma-separated
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type NewsFormInitial = Partial<NewsFormValues> & { id?: string };

type SourceOption = { id: string; label: string };

const TABS = ["general", "i18n", "seo", "advanced"] as const;
type Tab = (typeof TABS)[number];
const CATEGORIES: NewsCategory[] = [
  "EXPANSION",
  "LAUNCH",
  "FRANCHISE_INVESTMENT",
  "CITY_MARKET",
  "TREND",
  "SUPPLY_CHAIN",
  "CULTURE",
];
const STATUSES: NewsFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function buildInitial(initial: NewsFormInitial): NewsFormValues {
  const locales = routing.locales as readonly Locale[];
  const titleI18n: Record<string, string> = {};
  const summaryI18n: Record<string, string> = {};
  const bodyI18n: Record<string, string> = {};
  const aiSummaryI18n: Record<string, string> = {};
  const seoI18n: Record<string, SeoPerLocale> = {};
  for (const lc of locales) {
    titleI18n[lc] = initial.titleI18n?.[lc] ?? "";
    summaryI18n[lc] = initial.summaryI18n?.[lc] ?? "";
    bodyI18n[lc] = initial.bodyI18n?.[lc] ?? "";
    aiSummaryI18n[lc] = initial.aiSummaryI18n?.[lc] ?? "";
    seoI18n[lc] = initial.seoI18n?.[lc] ?? {};
  }
  return {
    slug: initial.slug ?? "",
    titleI18n,
    summaryI18n,
    bodyI18n,
    aiSummaryI18n,
    aiSummaryReviewedAt: initial.aiSummaryReviewedAt ?? "",
    seoI18n,
    category: (initial.category as NewsCategory) ?? "TREND",
    sourceId: initial.sourceId ?? "",
    sourceUrl: initial.sourceUrl ?? "",
    publishedAt: initial.publishedAt ?? "",
    heroImageUrl: initial.heroImageUrl ?? "",
    editorTags: initial.editorTags ?? "",
    status: (initial.status as NewsFormValues["status"]) ?? "DRAFT",
  };
}

export default function NewsForm({
  mode,
  newsId,
  initial,
  sources,
}: {
  mode: "create" | "edit";
  newsId?: string;
  initial: NewsFormInitial;
  sources: SourceOption[];
}) {
  const tEdit = useTranslations("admin.news.edit");
  const tFields = useTranslations("admin.news.edit.fields");
  const tTabs = useTranslations("admin.news.edit.tabs");
  const tStatus = useTranslations("admin.news.status");
  const tCategory = useTranslations("admin.news.category");

  const router = useRouter();
  const [values, setValues] = useState<NewsFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  function update<K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toIsoUtc(local: string): string | null {
    if (!local) return null;
    // datetime-local 給出無時區的字串，轉成 ISO with Z
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setTopError(null);

    const stripped = (obj: Record<string, string>) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) if (v && v.trim()) out[k] = v.trim();
      return out;
    };

    const titleI18n = stripped(values.titleI18n);
    const summaryI18n = stripped(values.summaryI18n);
    const bodyI18n = stripped(values.bodyI18n);
    const aiSummaryI18n = stripped(values.aiSummaryI18n);

    const seoI18n: Record<string, SeoPerLocale> = {};
    for (const [k, v] of Object.entries(values.seoI18n)) {
      const entry: SeoPerLocale = {};
      if (v.title && String(v.title).trim()) entry.title = String(v.title).trim();
      if (v.description && String(v.description).trim())
        entry.description = String(v.description).trim();
      if (Object.keys(entry).length > 0) seoI18n[k] = entry;
    }

    const editorTags = values.editorTags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const publishedAt = toIsoUtc(values.publishedAt);
    if (!publishedAt) {
      setTopError(`${tFields("publishedAt")}: invalid datetime`);
      setSubmitting(false);
      return;
    }

    const payload = {
      slug: values.slug.trim(),
      titleI18n,
      summaryI18n,
      bodyI18n,
      aiSummaryI18n: Object.keys(aiSummaryI18n).length ? aiSummaryI18n : null,
      aiSummaryReviewedAt: toIsoUtc(values.aiSummaryReviewedAt),
      seoI18n: Object.keys(seoI18n).length ? seoI18n : null,
      category: values.category,
      sourceId: values.sourceId,
      sourceUrl: values.sourceUrl.trim(),
      publishedAt,
      heroImageUrl: values.heroImageUrl.trim() || null,
      editorTags,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/news/${newsId}` : `/api/admin/news`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; news: { id: string; slug: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };

      if (!data.ok) {
        if ("errors" in data && data.errors) setErrors(data.errors);
        if ("error" in data && data.error) setTopError(data.error);
        setSubmitting(false);
        return;
      }
      setSavedAt(Date.now());
      setSubmitting(false);
      if (mode === "create") router.replace(`/admin/news/${data.news.id}`);
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!newsId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/news/${newsId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setTopError(data.error ?? "Delete failed");
        setSubmitting(false);
        return;
      }
      router.push("/admin/news");
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
          <Link
            href="/admin/news"
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {tEdit("back")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {mode === "edit" ? tEdit("title") : tEdit("createTitle")}
          </h1>
          {mode === "edit" && initial.slug ? (
            <p className="mt-0.5 font-mono text-xs text-neutral-500">{initial.slug}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {savedAt ? (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              ✓ {tEdit("saved")}
            </span>
          ) : null}
          {mode === "edit" ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
            >
              {tEdit("deleteButton")}
            </button>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600"
          >
            {submitting ? tEdit("saving") : tEdit("saveButton")}
          </button>
        </div>
      </header>

      {topError ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {topError}
        </div>
      ) : null}
      {errors.length > 0 ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm dark:border-rose-800 dark:bg-rose-950">
          <p className="font-medium text-rose-800 dark:text-rose-200">
            {tEdit("validationErrors")}
          </p>
          <ul className="mt-1 list-inside list-disc text-rose-700 dark:text-rose-300">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="font-mono">{e.path}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? "border-rose-600 text-rose-700 dark:text-rose-400"
                : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            }`}
          >
            {tTabs(key)}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("slug")} hint={tFields("slugHint")}>
            <input
              type="text"
              required
              value={values.slug}
              onChange={(e) => update("slug", e.target.value)}
              pattern="[a-z0-9-]+"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("status")}>
            <select
              value={values.status}
              onChange={(e) => update("status", e.target.value as NewsFormValues["status"])}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("category")}>
            <select
              value={values.category}
              onChange={(e) => update("category", e.target.value as NewsCategory)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCategory(c.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("sourceId")}>
            <select
              required
              value={values.sourceId}
              onChange={(e) => update("sourceId", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("sourceUrl")} hint={tFields("sourceUrlHint")}>
            <input
              type="url"
              value={values.sourceUrl}
              onChange={(e) => update("sourceUrl", e.target.value)}
              placeholder="https://…"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("publishedAt")} hint={tFields("publishedAtHint")}>
            <input
              type="datetime-local"
              required
              value={values.publishedAt}
              onChange={(e) => update("publishedAt", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("heroImageUrl")}>
            <input
              type="url"
              value={values.heroImageUrl}
              onChange={(e) => update("heroImageUrl", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("editorTags")} hint={tFields("editorTagsHint")}>
            <input
              type="text"
              value={values.editorTags}
              onChange={(e) => update("editorTags", e.target.value)}
              placeholder="opening, premium, asia"
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}

      {tab === "i18n" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field
            label={`${tFields("titleI18n")} (${localeTab})`}
            hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}
          >
            <input
              type="text"
              value={values.titleI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  titleI18n: { ...v.titleI18n, [localeTab]: e.target.value },
                }))
              }
              required={localeTab === routing.defaultLocale}
              className={inputClass}
            />
          </Field>
          <Field label={`${tFields("summaryI18n")} (${localeTab})`}>
            <textarea
              rows={3}
              value={values.summaryI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  summaryI18n: { ...v.summaryI18n, [localeTab]: e.target.value },
                }))
              }
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field label={`${tFields("bodyI18n")} (${localeTab})`} hint={tFields("bodyHint")}>
            <textarea
              rows={14}
              value={values.bodyI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  bodyI18n: { ...v.bodyI18n, [localeTab]: e.target.value },
                }))
              }
              className={`${inputClass} resize-y font-mono text-xs`}
              spellCheck={false}
            />
          </Field>
        </div>
      ) : null}

      {tab === "seo" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field label={`${tFields("seoTitle")} (${localeTab})`}>
            <input
              type="text"
              value={(values.seoI18n[localeTab]?.title as string) ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  seoI18n: {
                    ...v.seoI18n,
                    [localeTab]: { ...(v.seoI18n[localeTab] ?? {}), title: e.target.value },
                  },
                }))
              }
              maxLength={120}
              className={inputClass}
            />
          </Field>
          <Field label={`${tFields("seoDescription")} (${localeTab})`}>
            <textarea
              rows={3}
              value={(values.seoI18n[localeTab]?.description as string) ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  seoI18n: {
                    ...v.seoI18n,
                    [localeTab]: {
                      ...(v.seoI18n[localeTab] ?? {}),
                      description: e.target.value,
                    },
                  },
                }))
              }
              maxLength={300}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      ) : null}

      {tab === "advanced" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field label={`${tFields("aiSummary")} (${localeTab})`} hint={tFields("aiSummaryHint")}>
            <textarea
              rows={6}
              value={values.aiSummaryI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  aiSummaryI18n: { ...v.aiSummaryI18n, [localeTab]: e.target.value },
                }))
              }
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field
            label={tFields("aiReviewedAt")}
            hint={tFields("aiReviewedAtHint")}
          >
            <input
              type="datetime-local"
              value={values.aiSummaryReviewedAt}
              onChange={(e) => update("aiSummaryReviewedAt", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs text-neutral-500 dark:text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

function LocaleTabs({
  locales,
  active,
  onChange,
}: {
  locales: readonly Locale[];
  active: Locale;
  onChange: (lc: Locale) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md bg-neutral-100 p-1 dark:bg-neutral-800">
      {locales.map((lc) => (
        <button
          key={lc}
          type="button"
          onClick={() => onChange(lc)}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            active === lc
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          }`}
        >
          {lc}
        </button>
      ))}
    </div>
  );
}
