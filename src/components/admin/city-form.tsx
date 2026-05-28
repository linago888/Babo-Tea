"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type SeoPerLocale = { title?: string; description?: string };

type CityFormValues = {
  slug: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  seoI18n: Record<string, SeoPerLocale>;
  countryCode: string;
  adminRegion: string;
  lat: string;
  lng: string;
  timezone: string;
  population: string;
  avgPriceLocal: string;
  avgPriceCurrency: string;
  marketMaturity: "" | "EMERGING" | "GROWING" | "MATURE" | "SATURATED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type CityFormInitial = Partial<CityFormValues> & { id?: string };

const TABS = ["general", "i18n", "seo"] as const;
type Tab = (typeof TABS)[number];
const STATUSES: CityFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const MATURITIES: ("EMERGING" | "GROWING" | "MATURE" | "SATURATED")[] = [
  "EMERGING",
  "GROWING",
  "MATURE",
  "SATURATED",
];

function buildInitial(initial: CityFormInitial): CityFormValues {
  const locales = routing.locales as readonly Locale[];
  const nameI18n: Record<string, string> = {};
  const descriptionI18n: Record<string, string> = {};
  const seoI18n: Record<string, SeoPerLocale> = {};
  for (const lc of locales) {
    nameI18n[lc] = initial.nameI18n?.[lc] ?? "";
    descriptionI18n[lc] = initial.descriptionI18n?.[lc] ?? "";
    seoI18n[lc] = initial.seoI18n?.[lc] ?? {};
  }
  return {
    slug: initial.slug ?? "",
    nameI18n,
    descriptionI18n,
    seoI18n,
    countryCode: initial.countryCode ?? "",
    adminRegion: initial.adminRegion ?? "",
    lat: initial.lat ?? "",
    lng: initial.lng ?? "",
    timezone: initial.timezone ?? "",
    population: initial.population ?? "",
    avgPriceLocal: initial.avgPriceLocal ?? "",
    avgPriceCurrency: initial.avgPriceCurrency ?? "",
    marketMaturity: (initial.marketMaturity as CityFormValues["marketMaturity"]) ?? "",
    status: (initial.status as CityFormValues["status"]) ?? "DRAFT",
  };
}

export default function CityForm({
  mode,
  cityId,
  initial,
}: {
  mode: "create" | "edit";
  cityId?: string;
  initial: CityFormInitial;
}) {
  const tEdit = useTranslations("admin.cities.edit");
  const tFields = useTranslations("admin.cities.edit.fields");
  const tTabs = useTranslations("admin.cities.edit.tabs");
  const tStatus = useTranslations("admin.cities.status");
  const tMaturity = useTranslations("admin.cities.marketMaturity");

  const router = useRouter();
  const [values, setValues] = useState<CityFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  function update<K extends keyof CityFormValues>(key: K, value: CityFormValues[K]) {
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
    const descriptionI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.descriptionI18n)) {
      if (v && v.trim()) descriptionI18n[k] = v.trim();
    }
    const seoI18n: Record<string, SeoPerLocale> = {};
    for (const [k, v] of Object.entries(values.seoI18n)) {
      const entry: SeoPerLocale = {};
      if (v.title && String(v.title).trim()) entry.title = String(v.title).trim();
      if (v.description && String(v.description).trim()) entry.description = String(v.description).trim();
      if (Object.keys(entry).length > 0) seoI18n[k] = entry;
    }

    const payload = {
      slug: values.slug.trim(),
      nameI18n,
      descriptionI18n: Object.keys(descriptionI18n).length ? descriptionI18n : null,
      seoI18n: Object.keys(seoI18n).length ? seoI18n : null,
      countryCode: values.countryCode.trim().toUpperCase(),
      adminRegion: values.adminRegion.trim() || null,
      lat: Number(values.lat),
      lng: Number(values.lng),
      timezone: values.timezone.trim(),
      population: values.population.trim() ? Number(values.population) : null,
      avgPriceLocal: values.avgPriceLocal.trim() ? Number(values.avgPriceLocal) : null,
      avgPriceCurrency: values.avgPriceCurrency.trim() || null,
      marketMaturity: values.marketMaturity || null,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/cities/${cityId}` : `/api/admin/cities`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; city: { id: string; slug: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };

      if (!data.ok) {
        if ("errors" in data && data.errors) setErrors(data.errors);
        if ("error" in data && data.error) setTopError(data.error);
        setSubmitting(false);
        return;
      }
      setSavedAt(Date.now());
      setSubmitting(false);
      if (mode === "create") router.replace(`/admin/cities/${data.city.id}`);
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!cityId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/cities/${cityId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setTopError(data.error ?? "Delete failed");
        setSubmitting(false);
        return;
      }
      router.push("/admin/cities");
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
            href="/admin/cities"
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
              onChange={(e) => update("status", e.target.value as CityFormValues["status"])}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tFields("countryCode")}>
            <input
              type="text"
              required
              maxLength={2}
              value={values.countryCode}
              onChange={(e) => update("countryCode", e.target.value.toUpperCase())}
              placeholder="TW"
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label={tFields("adminRegion")} hint={tFields("adminRegionHint")}>
            <input
              type="text"
              value={values.adminRegion}
              onChange={(e) => update("adminRegion", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("lat")} hint={tFields("coordHint")}>
            <input
              type="number"
              step="0.000001"
              required
              value={values.lat}
              onChange={(e) => update("lat", e.target.value)}
              placeholder="25.0330"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("lng")} hint={tFields("coordHint")}>
            <input
              type="number"
              step="0.000001"
              required
              value={values.lng}
              onChange={(e) => update("lng", e.target.value)}
              placeholder="121.5654"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("timezone")} hint={tFields("timezoneHint")}>
            <input
              type="text"
              required
              value={values.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              placeholder="Asia/Taipei"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("population")}>
            <input
              type="number"
              min={0}
              value={values.population}
              onChange={(e) => update("population", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("avgPriceLocal")}>
            <input
              type="number"
              step="0.01"
              min={0}
              value={values.avgPriceLocal}
              onChange={(e) => update("avgPriceLocal", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("avgPriceCurrency")}>
            <input
              type="text"
              maxLength={3}
              value={values.avgPriceCurrency}
              onChange={(e) => update("avgPriceCurrency", e.target.value.toUpperCase())}
              placeholder="TWD"
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label={tFields("marketMaturity")}>
            <select
              value={values.marketMaturity}
              onChange={(e) =>
                update("marketMaturity", e.target.value as CityFormValues["marketMaturity"])
              }
              className={inputClass}
            >
              <option value="">—</option>
              {MATURITIES.map((m) => (
                <option key={m} value={m}>
                  {tMaturity(m.toLowerCase())}
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
          <Field label={`${tFields("descriptionI18n")} (${localeTab})`}>
            <textarea
              rows={6}
              value={values.descriptionI18n[localeTab] ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  descriptionI18n: { ...v.descriptionI18n, [localeTab]: e.target.value },
                }))
              }
              className={`${inputClass} resize-y`}
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
