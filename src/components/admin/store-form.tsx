"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type StoreFormValues = {
  brandId: string;
  cityId: string;
  nameI18n: Record<string, string>;
  addressI18n: Record<string, string>;
  lat: string;
  lng: string;
  phone: string;
  openingHoursText: string; // JSON
  isFlagship: boolean;
  franchise: boolean;
  openedAt: string; // YYYY-MM-DD
  closedAt: string;
  externalIdsText: string; // JSON
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type StoreFormInitial = Partial<StoreFormValues> & { id?: string };

type Option = { id: string; label: string };

const TABS = ["general", "i18n", "advanced"] as const;
type Tab = (typeof TABS)[number];
const STATUSES: StoreFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function buildInitial(initial: StoreFormInitial): StoreFormValues {
  const locales = routing.locales as readonly Locale[];
  const nameI18n: Record<string, string> = {};
  const addressI18n: Record<string, string> = {};
  for (const lc of locales) {
    nameI18n[lc] = initial.nameI18n?.[lc] ?? "";
    addressI18n[lc] = initial.addressI18n?.[lc] ?? "";
  }
  return {
    brandId: initial.brandId ?? "",
    cityId: initial.cityId ?? "",
    nameI18n,
    addressI18n,
    lat: initial.lat ?? "",
    lng: initial.lng ?? "",
    phone: initial.phone ?? "",
    openingHoursText: initial.openingHoursText ?? "",
    isFlagship: initial.isFlagship ?? false,
    franchise: initial.franchise ?? false,
    openedAt: initial.openedAt ?? "",
    closedAt: initial.closedAt ?? "",
    externalIdsText: initial.externalIdsText ?? "",
    status: (initial.status as StoreFormValues["status"]) ?? "DRAFT",
  };
}

export default function StoreForm({
  mode, storeId, initial, brands, cities,
}: {
  mode: "create" | "edit";
  storeId?: string;
  initial: StoreFormInitial;
  brands: Option[];
  cities: Option[];
}) {
  const tEdit = useTranslations("admin.stores.edit");
  const tFields = useTranslations("admin.stores.edit.fields");
  const tTabs = useTranslations("admin.stores.edit.tabs");
  const tStatus = useTranslations("admin.stores.status");

  const router = useRouter();
  const [values, setValues] = useState<StoreFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  function update<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setErrors([]); setTopError(null);

    const nameI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.nameI18n)) if (v && v.trim()) nameI18n[k] = v.trim();
    const addressI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.addressI18n)) if (v && v.trim()) addressI18n[k] = v.trim();

    let openingHours: unknown = null;
    if (values.openingHoursText.trim()) {
      try { openingHours = JSON.parse(values.openingHoursText); }
      catch { setTopError(`${tFields("openingHours")}: invalid JSON`); setSubmitting(false); return; }
    }
    let externalIds: unknown = null;
    if (values.externalIdsText.trim()) {
      try { externalIds = JSON.parse(values.externalIdsText); }
      catch { setTopError(`${tFields("externalIds")}: invalid JSON`); setSubmitting(false); return; }
    }

    const payload = {
      brandId: values.brandId,
      cityId: values.cityId,
      nameI18n: Object.keys(nameI18n).length ? nameI18n : null,
      addressI18n,
      lat: Number(values.lat),
      lng: Number(values.lng),
      phone: values.phone.trim() || null,
      openingHours,
      isFlagship: values.isFlagship,
      franchise: values.franchise,
      openedAt: values.openedAt || null,
      closedAt: values.closedAt || null,
      externalIds,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/stores/${storeId}` : `/api/admin/stores`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; store: { id: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };
      if (!data.ok) {
        if ("errors" in data && data.errors) setErrors(data.errors);
        if ("error" in data && data.error) setTopError(data.error);
        setSubmitting(false); return;
      }
      setSavedAt(Date.now()); setSubmitting(false);
      if (mode === "create") router.replace(`/admin/stores/${data.store.id}`);
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!storeId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/stores/${storeId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) { setTopError(data.error ?? "Delete failed"); setSubmitting(false); return; }
      router.push("/admin/stores"); router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/stores" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">{tEdit("back")}</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{mode === "edit" ? tEdit("title") : tEdit("createTitle")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {savedAt ? <span className="text-xs text-emerald-700 dark:text-emerald-400">✓ {tEdit("saved")}</span> : null}
          {mode === "edit" ? <button type="button" onClick={handleDelete} disabled={submitting} className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950">{tEdit("deleteButton")}</button> : null}
          <button type="submit" disabled={submitting} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600">{submitting ? tEdit("saving") : tEdit("saveButton")}</button>
        </div>
      </header>

      {topError ? <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{topError}</div> : null}
      {errors.length > 0 ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm dark:border-rose-800 dark:bg-rose-950">
          <p className="font-medium text-rose-800 dark:text-rose-200">{tEdit("validationErrors")}</p>
          <ul className="mt-1 list-inside list-disc text-rose-700 dark:text-rose-300">
            {errors.map((e, i) => <li key={i}><span className="font-mono">{e.path}</span> — {e.message}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((key) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === key ? "border-rose-600 text-rose-700 dark:text-rose-400" : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>{tTabs(key)}</button>
        ))}
      </div>

      {tab === "general" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("brandId")}>
            <select required value={values.brandId} onChange={(e) => update("brandId", e.target.value)} className={inputClass}>
              <option value="">—</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </Field>
          <Field label={tFields("cityId")}>
            <select required value={values.cityId} onChange={(e) => update("cityId", e.target.value)} className={inputClass}>
              <option value="">—</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label={tFields("status")}>
            <select value={values.status} onChange={(e) => update("status", e.target.value as StoreFormValues["status"])} className={inputClass}>
              {STATUSES.map((s) => <option key={s} value={s}>{tStatus(s.toLowerCase())}</option>)}
            </select>
          </Field>
          <Field label={tFields("phone")} hint={tFields("phoneHint")}>
            <input type="tel" value={values.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+886-2-12345678" className={inputClass} />
          </Field>
          <Field label={tFields("lat")} hint={tFields("coordHint")}>
            <input type="number" step="0.000001" required value={values.lat} onChange={(e) => update("lat", e.target.value)} className={inputClass} />
          </Field>
          <Field label={tFields("lng")} hint={tFields("coordHint")}>
            <input type="number" step="0.000001" required value={values.lng} onChange={(e) => update("lng", e.target.value)} className={inputClass} />
          </Field>
          <Field label={tFields("openedAt")}>
            <input type="date" value={values.openedAt} onChange={(e) => update("openedAt", e.target.value)} className={inputClass} />
          </Field>
          <Field label={tFields("closedAt")} hint={tFields("closedAtHint")}>
            <input type="date" value={values.closedAt} onChange={(e) => update("closedAt", e.target.value)} className={inputClass} />
          </Field>
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values.isFlagship} onChange={(e) => update("isFlagship", e.target.checked)} className="size-4 rounded border-neutral-400" />
              {tFields("isFlagship")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values.franchise} onChange={(e) => update("franchise", e.target.checked)} className="size-4 rounded border-neutral-400" />
              {tFields("franchise")}
            </label>
          </div>
        </div>
      ) : null}

      {tab === "i18n" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field label={`${tFields("nameI18n")} (${localeTab})`}>
            <input type="text" value={values.nameI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, nameI18n: { ...v.nameI18n, [localeTab]: e.target.value } }))} className={inputClass} />
          </Field>
          <Field label={`${tFields("addressI18n")} (${localeTab})`} hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}>
            <input type="text" value={values.addressI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, addressI18n: { ...v.addressI18n, [localeTab]: e.target.value } }))} required={localeTab === routing.defaultLocale} className={inputClass} />
          </Field>
        </div>
      ) : null}

      {tab === "advanced" ? (
        <div className="space-y-4">
          <Field label={tFields("openingHours")} hint={tFields("openingHoursHint")}>
            <textarea rows={8} value={values.openingHoursText} onChange={(e) => update("openingHoursText", e.target.value)} className={`${inputClass} font-mono text-xs resize-y`} spellCheck={false} placeholder={`[\n  { "@type": "OpeningHoursSpecification",\n    "dayOfWeek": "Monday",\n    "opens": "11:00", "closes": "21:00" }\n]`} />
          </Field>
          <Field label={tFields("externalIds")} hint={tFields("externalIdsHint")}>
            <textarea rows={5} value={values.externalIdsText} onChange={(e) => update("externalIdsText", e.target.value)} className={`${inputClass} font-mono text-xs resize-y`} spellCheck={false} placeholder={`{\n  "google_place_id": "ChIJ...",\n  "yelp_id": "..."\n}`} />
          </Field>
        </div>
      ) : null}
    </form>
  );
}

const inputClass = "w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-neutral-500 dark:text-neutral-500">{hint}</span> : null}
    </label>
  );
}

function LocaleTabs({ locales, active, onChange }: { locales: readonly Locale[]; active: Locale; onChange: (lc: Locale) => void }) {
  return (
    <div className="flex gap-1 rounded-md bg-neutral-100 p-1 dark:bg-neutral-800">
      {locales.map((lc) => (
        <button key={lc} type="button" onClick={() => onChange(lc)} className={`rounded px-3 py-1 text-xs font-medium transition ${active === lc ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>{lc}</button>
      ))}
    </div>
  );
}
