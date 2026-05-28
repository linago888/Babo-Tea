"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type TaxonomyKind =
  | "TEA_BASE"
  | "MILK_TYPE"
  | "TOPPING"
  | "SWEETENER"
  | "FLAVOR_TAG"
  | "POSITIONING_TAG";

type TaxonomyFormValues = {
  kind: TaxonomyKind;
  code: string;
  labelI18n: Record<string, string>;
  parentId: string;
  sortOrder: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type TaxonomyFormInitial = Partial<TaxonomyFormValues> & { id?: string };

type ParentOption = { id: string; kind: TaxonomyKind; label: string };

const KINDS: TaxonomyKind[] = [
  "TEA_BASE",
  "MILK_TYPE",
  "TOPPING",
  "SWEETENER",
  "FLAVOR_TAG",
  "POSITIONING_TAG",
];
const STATUSES: TaxonomyFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const TABS = ["general", "i18n"] as const;
type Tab = (typeof TABS)[number];

function buildInitial(initial: TaxonomyFormInitial): TaxonomyFormValues {
  const locales = routing.locales as readonly Locale[];
  const labelI18n: Record<string, string> = {};
  for (const lc of locales) labelI18n[lc] = initial.labelI18n?.[lc] ?? "";
  return {
    kind: (initial.kind as TaxonomyKind) ?? "TEA_BASE",
    code: initial.code ?? "",
    labelI18n,
    parentId: initial.parentId ?? "",
    sortOrder: initial.sortOrder ?? "0",
    status: (initial.status as TaxonomyFormValues["status"]) ?? "PUBLISHED",
  };
}

export default function TaxonomyForm({
  mode,
  taxonomyId,
  initial,
  parents,
}: {
  mode: "create" | "edit";
  taxonomyId?: string;
  initial: TaxonomyFormInitial;
  parents: ParentOption[];
}) {
  const tEdit = useTranslations("admin.taxonomies.edit");
  const tFields = useTranslations("admin.taxonomies.edit.fields");
  const tTabs = useTranslations("admin.taxonomies.edit.tabs");
  const tStatus = useTranslations("admin.taxonomies.status");
  const tKind = useTranslations("admin.taxonomies.kind");

  const router = useRouter();
  const [values, setValues] = useState<TaxonomyFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  // 父詞彙必須是同 kind
  const eligibleParents = useMemo(
    () => parents.filter((p) => p.kind === values.kind && p.id !== taxonomyId),
    [parents, values.kind, taxonomyId],
  );

  function update<K extends keyof TaxonomyFormValues>(key: K, value: TaxonomyFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setTopError(null);

    const labelI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.labelI18n)) {
      if (v && v.trim()) labelI18n[k] = v.trim();
    }

    const payload = {
      kind: values.kind,
      code: values.code.trim(),
      labelI18n,
      parentId: values.parentId || null,
      sortOrder: values.sortOrder.trim() ? Number(values.sortOrder) : 0,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/taxonomies/${taxonomyId}` : `/api/admin/taxonomies`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; taxonomy: { id: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };

      if (!data.ok) {
        if ("errors" in data && data.errors) setErrors(data.errors);
        if ("error" in data && data.error) setTopError(data.error);
        setSubmitting(false);
        return;
      }

      setSavedAt(Date.now());
      setSubmitting(false);
      if (mode === "create") router.replace(`/admin/taxonomies/${data.taxonomy.id}`);
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!taxonomyId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/taxonomies/${taxonomyId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setTopError(data.error ?? "Delete failed");
        setSubmitting(false);
        return;
      }
      router.push("/admin/taxonomies");
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
            href="/admin/taxonomies"
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {tEdit("back")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {mode === "edit" ? tEdit("title") : tEdit("createTitle")}
          </h1>
          {mode === "edit" && initial.code ? (
            <p className="mt-0.5 font-mono text-xs text-neutral-500">
              {tKind(values.kind.toLowerCase())} / {initial.code}
            </p>
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
          <Field label={tFields("kind")} hint={tFields("kindHint")}>
            <select
              value={values.kind}
              onChange={(e) => {
                update("kind", e.target.value as TaxonomyKind);
                update("parentId", ""); // reset parent on kind change
              }}
              className={inputClass}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {tKind(k.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("status")}>
            <select
              value={values.status}
              onChange={(e) => update("status", e.target.value as TaxonomyFormValues["status"])}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("code")} hint={tFields("codeHint")}>
            <input
              type="text"
              required
              value={values.code}
              onChange={(e) => update("code", e.target.value)}
              pattern="[a-z0-9-]+"
              placeholder="black"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("sortOrder")} hint={tFields("sortOrderHint")}>
            <input
              type="number"
              value={values.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("parentId")} hint={tFields("parentHint")}>
            <select
              value={values.parentId}
              onChange={(e) => update("parentId", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {eligibleParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {tab === "i18n" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field
            label={`${tFields("labelI18n")} (${localeTab})`}
            hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}
          >
            <input
              type="text"
              value={values.labelI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  labelI18n: { ...v.labelI18n, [localeTab]: e.target.value },
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
