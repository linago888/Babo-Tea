"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type SeoPerLocale = { title?: string; description?: string; faq?: unknown };

type BrandFormValues = {
  slug: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  seoI18n: Record<string, SeoPerLocale>;
  countryCode: string;
  foundedYear: string; // raw form input — converted on submit
  headquartersCityId: string;
  businessModel: "DIRECT" | "FRANCHISE" | "HYBRID" | "LICENSED";
  priceTier: "VALUE" | "MID" | "PREMIUM" | "LUXURY";
  positioningTags: string; // comma-separated raw input
  officialWebsite: string;
  logoUrl: string;
  socialHandlesText: string; // raw JSON text
  verified: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type CityOption = { id: string; label: string };

export type BrandFormInitial = Partial<BrandFormValues> & { id?: string };

type Props = {
  mode: "create" | "edit";
  brandId?: string;
  initial: BrandFormInitial;
  cities: CityOption[];
};

const TABS = ["general", "i18n", "seo", "advanced"] as const;
type Tab = (typeof TABS)[number];

const BUSINESS_MODELS: BrandFormValues["businessModel"][] = [
  "DIRECT",
  "FRANCHISE",
  "HYBRID",
  "LICENSED",
];
const PRICE_TIERS: BrandFormValues["priceTier"][] = ["VALUE", "MID", "PREMIUM", "LUXURY"];
const STATUSES: BrandFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function buildInitial(initial: BrandFormInitial): BrandFormValues {
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
    foundedYear: initial.foundedYear ?? "",
    headquartersCityId: initial.headquartersCityId ?? "",
    businessModel: (initial.businessModel as BrandFormValues["businessModel"]) ?? "DIRECT",
    priceTier: (initial.priceTier as BrandFormValues["priceTier"]) ?? "MID",
    positioningTags: initial.positioningTags ?? "",
    officialWebsite: initial.officialWebsite ?? "",
    logoUrl: initial.logoUrl ?? "",
    socialHandlesText: initial.socialHandlesText ?? "",
    verified: initial.verified ?? false,
    status: (initial.status as BrandFormValues["status"]) ?? "DRAFT",
  };
}

export default function BrandForm({ mode, brandId, initial, cities }: Props) {
  const t = useTranslations("admin.brands");
  const tEdit = useTranslations("admin.brands.edit");
  const tFields = useTranslations("admin.brands.edit.fields");
  const tTabs = useTranslations("admin.brands.edit.tabs");
  const tStatus = useTranslations("admin.brands.status");
  const tBM = useTranslations("brandList.model");
  const tPT = useTranslations("brandList.tier");

  const router = useRouter();
  const [values, setValues] = useState<BrandFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  function update<K extends keyof BrandFormValues>(key: K, value: BrandFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function updateNameI18n(lc: Locale, val: string) {
    setValues((v) => ({ ...v, nameI18n: { ...v.nameI18n, [lc]: val } }));
  }
  function updateDescI18n(lc: Locale, val: string) {
    setValues((v) => ({ ...v, descriptionI18n: { ...v.descriptionI18n, [lc]: val } }));
  }
  function updateSeo(lc: Locale, field: "title" | "description", val: string) {
    setValues((v) => ({
      ...v,
      seoI18n: { ...v.seoI18n, [lc]: { ...(v.seoI18n[lc] ?? {}), [field]: val } },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setTopError(null);

    // 整理 payload — 移除空 i18n 鍵以保持資料整潔
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
      if (v.faq) entry.faq = v.faq;
      if (Object.keys(entry).length > 0) seoI18n[k] = entry;
    }

    let socialHandles: unknown = null;
    if (values.socialHandlesText.trim()) {
      try {
        socialHandles = JSON.parse(values.socialHandlesText);
      } catch {
        setTopError(`${tFields("socialHandles")}: invalid JSON`);
        setSubmitting(false);
        return;
      }
    }

    const positioningTags = values.positioningTags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const foundedYearNum = values.foundedYear.trim() ? Number(values.foundedYear) : null;

    const payload = {
      slug: values.slug.trim(),
      nameI18n,
      descriptionI18n: Object.keys(descriptionI18n).length ? descriptionI18n : null,
      seoI18n: Object.keys(seoI18n).length ? seoI18n : null,
      countryCode: values.countryCode.trim().toUpperCase(),
      foundedYear: foundedYearNum,
      headquartersCityId: values.headquartersCityId || null,
      businessModel: values.businessModel,
      priceTier: values.priceTier,
      positioningTags,
      officialWebsite: values.officialWebsite.trim() || null,
      logoUrl: values.logoUrl.trim() || null,
      socialHandles,
      verified: values.verified,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/brands/${brandId}` : `/api/admin/brands`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; brand: { id: string; slug: string } }
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
        router.replace(`/admin/brands/${data.brand.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!brandId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setTopError(data.error ?? "Delete failed");
        setSubmitting(false);
        return;
      }
      router.push("/admin/brands");
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
            href="/admin/brands"
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

      {/* Tabs */}
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

      {/* General */}
      {tab === "general" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("slug")} hint={tFields("slugHint")}>
            <input
              type="text"
              required
              value={values.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="my-brand"
              pattern="[a-z0-9-]+"
              className={inputClass}
            />
          </Field>

          <Field label={tFields("status")}>
            <select
              value={values.status}
              onChange={(e) => update("status", e.target.value as BrandFormValues["status"])}
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

          <Field label={tFields("foundedYear")}>
            <input
              type="number"
              min={1800}
              max={2100}
              value={values.foundedYear}
              onChange={(e) => update("foundedYear", e.target.value)}
              placeholder="2010"
              className={inputClass}
            />
          </Field>

          <Field label={tFields("headquartersCity")}>
            <select
              value={values.headquartersCityId}
              onChange={(e) => update("headquartersCityId", e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={tFields("businessModel")}>
            <select
              value={values.businessModel}
              onChange={(e) =>
                update("businessModel", e.target.value as BrandFormValues["businessModel"])
              }
              className={inputClass}
            >
              {BUSINESS_MODELS.map((m) => (
                <option key={m} value={m}>
                  {tBM(m.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>

          <Field label={tFields("priceTier")}>
            <select
              value={values.priceTier}
              onChange={(e) => update("priceTier", e.target.value as BrandFormValues["priceTier"])}
              className={inputClass}
            >
              {PRICE_TIERS.map((p) => (
                <option key={p} value={p}>
                  {tPT(p.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>

          <Field label={tFields("officialWebsite")}>
            <input
              type="url"
              value={values.officialWebsite}
              onChange={(e) => update("officialWebsite", e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </Field>

          <Field label={tFields("logoUrl")}>
            <input
              type="url"
              value={values.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="https://…/logo.png"
              className={inputClass}
            />
          </Field>

          <Field label={tFields("positioningTags")} hint={tFields("positioningHint")}>
            <input
              type="text"
              value={values.positioningTags}
              onChange={(e) => update("positioningTags", e.target.value)}
              placeholder="fruit-tea, premium"
              className={inputClass}
            />
          </Field>

          <div className="flex items-center gap-2 self-end pb-1 sm:col-span-2">
            <input
              id="verified"
              type="checkbox"
              checked={values.verified}
              onChange={(e) => update("verified", e.target.checked)}
              className="size-4 rounded border-neutral-400"
            />
            <label htmlFor="verified" className="text-sm font-medium">
              {tFields("verified")}
            </label>
          </div>
        </div>
      ) : null}

      {/* i18n */}
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
              onChange={(e) => updateNameI18n(localeTab, e.target.value)}
              required={localeTab === routing.defaultLocale}
              className={inputClass}
            />
          </Field>
          <Field label={`${tFields("descriptionI18n")} (${localeTab})`}>
            <textarea
              rows={6}
              value={values.descriptionI18n[localeTab] ?? ""}
              onChange={(e) => updateDescI18n(localeTab, e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      ) : null}

      {/* SEO */}
      {tab === "seo" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field label={`${tFields("seoTitle")} (${localeTab})`}>
            <input
              type="text"
              value={(values.seoI18n[localeTab]?.title as string) ?? ""}
              onChange={(e) => updateSeo(localeTab, "title", e.target.value)}
              maxLength={120}
              className={inputClass}
            />
          </Field>
          <Field label={`${tFields("seoDescription")} (${localeTab})`}>
            <textarea
              rows={3}
              value={(values.seoI18n[localeTab]?.description as string) ?? ""}
              onChange={(e) => updateSeo(localeTab, "description", e.target.value)}
              maxLength={300}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      ) : null}

      {/* Advanced */}
      {tab === "advanced" ? (
        <div className="space-y-4">
          <Field label={tFields("socialHandles")}>
            <textarea
              rows={6}
              value={values.socialHandlesText}
              onChange={(e) => update("socialHandlesText", e.target.value)}
              placeholder={`{\n  "instagram": "handle",\n  "tiktok": "handle"\n}`}
              className={`${inputClass} font-mono text-xs`}
              spellCheck={false}
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
