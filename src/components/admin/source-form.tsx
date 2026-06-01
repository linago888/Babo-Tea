"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type SourceFormValues = {
  slug: string;
  nameI18n: Record<string, string>;
  domain: string;
  countryCode: string;
  primaryLanguage: string;
  kind:
    | "MAINSTREAM_MEDIA"
    | "TRADE_PRESS"
    | "CORPORATE_PR"
    | "BLOG"
    | "SOCIAL"
    | "AGGREGATOR";
  credibilityScore: string;
  paywall: boolean;
  notes: string;
  rssFeedUrl: string;
  lastCrawledAt: string | null; // ISO string for display only; not editable
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type SourceFormInitial = Partial<SourceFormValues> & { id?: string };

const TABS = ["general", "i18n"] as const;
type Tab = (typeof TABS)[number];

const KINDS: SourceFormValues["kind"][] = [
  "MAINSTREAM_MEDIA",
  "TRADE_PRESS",
  "CORPORATE_PR",
  "BLOG",
  "SOCIAL",
  "AGGREGATOR",
];
const STATUSES: SourceFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function buildInitial(initial: SourceFormInitial): SourceFormValues {
  const locales = routing.locales as readonly Locale[];
  const nameI18n: Record<string, string> = {};
  for (const lc of locales) nameI18n[lc] = initial.nameI18n?.[lc] ?? "";
  return {
    slug: initial.slug ?? "",
    nameI18n,
    domain: initial.domain ?? "",
    countryCode: initial.countryCode ?? "",
    primaryLanguage: initial.primaryLanguage ?? "",
    kind: (initial.kind as SourceFormValues["kind"]) ?? "MAINSTREAM_MEDIA",
    credibilityScore: initial.credibilityScore ?? "",
    paywall: initial.paywall ?? false,
    notes: initial.notes ?? "",
    rssFeedUrl: initial.rssFeedUrl ?? "",
    lastCrawledAt: initial.lastCrawledAt ?? null,
    status: (initial.status as SourceFormValues["status"]) ?? "PUBLISHED",
  };
}

interface IngestSummary {
  sourceId: string;
  sourceSlug: string;
  itemsInFeed: number;
  created: number;
  skipped: number;
  errors: Array<{ url: string; message: string }>;
}

export default function SourceForm({
  mode,
  sourceId,
  initial,
}: {
  mode: "create" | "edit";
  sourceId?: string;
  initial: SourceFormInitial;
}) {
  const tEdit = useTranslations("admin.sources.edit");
  const tFields = useTranslations("admin.sources.edit.fields");
  const tTabs = useTranslations("admin.sources.edit.tabs");
  const tStatus = useTranslations("admin.sources.status");
  const tKind = useTranslations("admin.sources.kind");

  const router = useRouter();
  const [values, setValues] = useState<SourceFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  // RSS 面板用 DB 已儲存的值來判斷顯不顯示；
  // 若使用者在表單中改了 URL 但還沒按儲存，顯示「請先儲存」提示
  const savedRssUrl = (initial.rssFeedUrl ?? "").trim();
  const currentRssUrl = values.rssFeedUrl.trim();
  const rssIsDirty = savedRssUrl !== currentRssUrl;
  const showRssPanel = mode === "edit" && savedRssUrl.length > 0;

  function update<K extends keyof SourceFormValues>(key: K, value: SourceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setTopError(null);

    const nameI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.nameI18n)) {
      if (v && v.trim()) nameI18n[k] = v.trim();
    }

    const payload = {
      slug: values.slug.trim(),
      nameI18n,
      domain: values.domain.trim().toLowerCase(),
      countryCode: values.countryCode.trim() ? values.countryCode.trim().toUpperCase() : null,
      primaryLanguage: values.primaryLanguage.trim(),
      kind: values.kind,
      credibilityScore: values.credibilityScore.trim() ? Number(values.credibilityScore) : null,
      paywall: values.paywall,
      notes: values.notes.trim() || null,
      rssFeedUrl: values.rssFeedUrl.trim() || null,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/sources/${sourceId}` : `/api/admin/sources`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; source: { id: string; slug: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };

      if (!data.ok) {
        if ("errors" in data && data.errors) setErrors(data.errors);
        if ("error" in data && data.error) setTopError(data.error);
        setSubmitting(false);
        return;
      }

      setSavedAt(Date.now());
      setSubmitting(false);
      if (mode === "create") {
        router.replace(`/admin/sources/${data.source.id}`);
      }
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!sourceId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sources/${sourceId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setTopError(data.error ?? "Delete failed");
        setSubmitting(false);
        return;
      }
      router.push("/admin/sources");
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
            href="/admin/sources"
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
              onChange={(e) => update("status", e.target.value as SourceFormValues["status"])}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("domain")} hint={tFields("domainHint")}>
            <input
              type="text"
              required
              value={values.domain}
              onChange={(e) => update("domain", e.target.value)}
              placeholder="nikkei.com"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("countryCode")}>
            <input
              type="text"
              maxLength={2}
              value={values.countryCode}
              onChange={(e) => update("countryCode", e.target.value.toUpperCase())}
              placeholder="JP"
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label={tFields("primaryLanguage")} hint={tFields("primaryLanguageHint")}>
            <input
              type="text"
              required
              value={values.primaryLanguage}
              onChange={(e) => update("primaryLanguage", e.target.value)}
              placeholder="ja"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("kind")}>
            <select
              value={values.kind}
              onChange={(e) => update("kind", e.target.value as SourceFormValues["kind"])}
              className={inputClass}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {tKind(k.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("credibilityScore")} hint={tFields("credibilityHint")}>
            <input
              type="number"
              min={0}
              max={100}
              value={values.credibilityScore}
              onChange={(e) => update("credibilityScore", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center gap-2 self-end pb-1">
            <input
              id="paywall"
              type="checkbox"
              checked={values.paywall}
              onChange={(e) => update("paywall", e.target.checked)}
              className="size-4 rounded border-neutral-400"
            />
            <label htmlFor="paywall" className="text-sm font-medium">
              {tFields("paywall")}
            </label>
          </div>
          <Field label={tFields("notes")}>
            <textarea
              rows={3}
              value={values.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={`${inputClass} resize-y sm:col-span-2`}
            />
          </Field>

          {/* RSS feed — sm:col-span-2 跨整列 */}
          <div className="sm:col-span-2">
            <Field label={tFields("rssFeedUrl")} hint={tFields("rssFeedUrlHint")}>
              <input
                type="url"
                value={values.rssFeedUrl}
                onChange={(e) => update("rssFeedUrl", e.target.value)}
                placeholder="https://example.com/feed.xml"
                className={inputClass}
              />
            </Field>
            {mode === "edit" && currentRssUrl.length > 0 && !showRssPanel ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠ {tFields("rssUnsavedHint")}
              </p>
            ) : null}
            {mode === "edit" && rssIsDirty && showRssPanel ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠ {tFields("rssDirtyHint")}
              </p>
            ) : null}
            {showRssPanel ? (
              <RssIngestPanel
                sourceId={sourceId!}
                lastCrawledAt={values.lastCrawledAt}
                tFields={tFields}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "i18n" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field
            label={`${tFields("nameI18n")} (${localeTab})`}
            hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}
          >
            <input
              type="text"
              value={values.nameI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  nameI18n: { ...v.nameI18n, [localeTab]: e.target.value },
                }))
              }
              required={localeTab === routing.defaultLocale}
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}
    </form>
  );
}

function RssIngestPanel({
  sourceId,
  lastCrawledAt,
  tFields,
}: {
  sourceId: string;
  lastCrawledAt: string | null;
  tFields: (key: string) => string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<IngestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/ingest-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = (await res.json()) as
        | { ok: true; summaries: IngestSummary[] }
        | { ok: false; error?: string };
      if (!data.ok) {
        setError("error" in data && data.error ? data.error : "Ingest failed");
      } else {
        setResult(data.summaries[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            {tFields("rssIngestTitle")}
          </p>
          {lastCrawledAt ? (
            <p className="text-emerald-700 dark:text-emerald-300">
              {tFields("rssLastCrawled")}: {new Date(lastCrawledAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-emerald-700 dark:text-emerald-300">
              {tFields("rssNeverCrawled")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="shrink-0 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {running ? tFields("rssIngestRunning") : tFields("rssIngestNow")}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-rose-700 dark:text-rose-400">⚠ {error}</p>
      ) : null}
      {result ? (
        <div className="mt-2 text-emerald-800 dark:text-emerald-200">
          <p>
            ✓ {tFields("rssIngestResult", )} feed={result.itemsInFeed} ·
            created={result.created} · skipped={result.skipped}{" "}
            {result.errors.length > 0 ? `· errors=${result.errors.length}` : ""}
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-rose-700 dark:text-rose-300">
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="break-all">
                  <span className="font-mono">{e.url}</span> — {e.message}
                </li>
              ))}
              {result.errors.length > 5 ? <li>...及 {result.errors.length - 5} 個其他錯誤</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
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
