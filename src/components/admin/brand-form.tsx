"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type SeoPerLocale = { title?: string; description?: string; faq?: unknown };

type BrandCityStatus = "ACTIVE" | "EXITED" | "RUMORED";
type CompanyRelation =
  | "OWNER"
  | "PARENT"
  | "LICENSOR"
  | "FRANCHISOR"
  | "INVESTOR"
  | "FORMER_OWNER";

export type SignatureDrinkRow = { drinkId: string; isSignature: boolean };
export type BrandCityRow = { cityId: string; status: BrandCityStatus; enteredAt: string };
export type BrandCompanyRow = {
  companyId: string;
  relation: CompanyRelation;
  since: string;
  until: string;
  notes: string;
};

type BrandFormValues = {
  slug: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  seoI18n: Record<string, SeoPerLocale>;
  countryCode: string;
  foundedYear: string;
  headquartersCityId: string;
  businessModel: "DIRECT" | "FRANCHISE" | "HYBRID" | "LICENSED";
  priceTier: "VALUE" | "MID" | "PREMIUM" | "LUXURY";
  positioningTags: string;
  officialWebsite: string;
  logoUrl: string;
  socialHandlesText: string;
  verified: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  signatureDrinks: SignatureDrinkRow[];
  cities: BrandCityRow[];
  companies: BrandCompanyRow[];
};

type Option = { id: string; label: string };

export type BrandFormInitial = Partial<BrandFormValues> & { id?: string };

type Props = {
  mode: "create" | "edit";
  brandId?: string;
  initial: BrandFormInitial;
  cities: Option[];
  drinks: Option[];
  companies: Option[];
};

const TABS = [
  "general",
  "i18n",
  "seo",
  "advanced",
  "signatureDrinks",
  "brandCities",
  "brandCompanies",
] as const;
type Tab = (typeof TABS)[number];

const BUSINESS_MODELS: BrandFormValues["businessModel"][] = [
  "DIRECT",
  "FRANCHISE",
  "HYBRID",
  "LICENSED",
];
const PRICE_TIERS: BrandFormValues["priceTier"][] = ["VALUE", "MID", "PREMIUM", "LUXURY"];
const STATUSES: BrandFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const CITY_STATUSES: BrandCityStatus[] = ["ACTIVE", "EXITED", "RUMORED"];
const COMPANY_RELATIONS: CompanyRelation[] = [
  "OWNER",
  "PARENT",
  "LICENSOR",
  "FRANCHISOR",
  "INVESTOR",
  "FORMER_OWNER",
];

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
    signatureDrinks: initial.signatureDrinks ?? [],
    cities: initial.cities ?? [],
    companies: initial.companies ?? [],
  };
}

export default function BrandForm({
  mode,
  brandId,
  initial,
  cities: cityOptions,
  drinks: drinkOptions,
  companies: companyOptions,
}: Props) {
  const tEdit = useTranslations("admin.brands.edit");
  const tFields = useTranslations("admin.brands.edit.fields");
  const tTabs = useTranslations("admin.brands.edit.tabs");
  const tStatus = useTranslations("admin.brands.status");
  const tBM = useTranslations("brandList.model");
  const tPT = useTranslations("brandList.tier");
  const tRel = useTranslations("admin.relations");
  const tBCS = useTranslations("admin.relations.brandCityStatus");
  const tCR = useTranslations("admin.relations.companyRelation");

  const router = useRouter();
  const [values, setValues] = useState<BrandFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  // 新增 relation 用的 dropdown 暫存
  const [pickerDrink, setPickerDrink] = useState("");
  const [pickerCity, setPickerCity] = useState("");
  const [pickerCompany, setPickerCompany] = useState("");

  const locales = routing.locales as readonly Locale[];

  function update<K extends keyof BrandFormValues>(key: K, value: BrandFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // 用來查 dropdown label 給已加入的 row 顯示
  const drinksById = new Map(drinkOptions.map((d) => [d.id, d.label]));
  const citiesById = new Map(cityOptions.map((c) => [c.id, c.label]));
  const companiesById = new Map(companyOptions.map((c) => [c.id, c.label]));

  function addSignatureDrink() {
    if (!pickerDrink) return;
    if (values.signatureDrinks.some((r) => r.drinkId === pickerDrink)) return;
    setValues((v) => ({
      ...v,
      signatureDrinks: [...v.signatureDrinks, { drinkId: pickerDrink, isSignature: false }],
    }));
    setPickerDrink("");
  }
  function addBrandCity() {
    if (!pickerCity) return;
    if (values.cities.some((r) => r.cityId === pickerCity)) return;
    setValues((v) => ({
      ...v,
      cities: [...v.cities, { cityId: pickerCity, status: "ACTIVE", enteredAt: "" }],
    }));
    setPickerCity("");
  }
  function addBrandCompany() {
    if (!pickerCompany) return;
    const today = new Date().toISOString().slice(0, 10);
    setValues((v) => ({
      ...v,
      companies: [
        ...v.companies,
        { companyId: pickerCompany, relation: "PARENT", since: today, until: "", notes: "" },
      ],
    }));
    setPickerCompany("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setTopError(null);

    const nameI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.nameI18n)) if (v && v.trim()) nameI18n[k] = v.trim();
    const descriptionI18n: Record<string, string> = {};
    for (const [k, v] of Object.entries(values.descriptionI18n)) if (v && v.trim()) descriptionI18n[k] = v.trim();
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

    // Brand company since required
    for (const c of values.companies) {
      if (!c.since) {
        setTopError(`${tRel("companies")}: "since" is required`);
        setSubmitting(false);
        return;
      }
    }

    const positioningTags = values.positioningTags.split(",").map((s) => s.trim()).filter(Boolean);
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
      // Relations 只在 edit mode 送（PUT 接收，POST 不接收）
      ...(mode === "edit"
        ? {
            signatureDrinks: values.signatureDrinks,
            cities: values.cities.map((c) => ({
              cityId: c.cityId,
              status: c.status,
              enteredAt: c.enteredAt || null,
            })),
            companies: values.companies.map((c) => ({
              companyId: c.companyId,
              relation: c.relation,
              since: c.since,
              until: c.until || null,
              notes: c.notes || null,
            })),
          }
        : {}),
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
      }
      router.refresh();
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

  // 編輯模式才顯示 relation tabs（create 模式還沒有 brandId）
  const visibleTabs = TABS.filter(
    (t) => mode === "edit" || (t !== "signatureDrinks" && t !== "brandCities" && t !== "brandCompanies"),
  );

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
          <p className="font-medium text-rose-800 dark:text-rose-200">{tEdit("validationErrors")}</p>
          <ul className="mt-1 list-inside list-disc text-rose-700 dark:text-rose-300">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="font-mono">{e.path}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {visibleTabs.map((key) => {
          const label =
            key === "signatureDrinks"
              ? tRel("signatureDrinks")
              : key === "brandCities"
                ? tRel("cities")
                : key === "brandCompanies"
                  ? tRel("companies")
                  : tTabs(key);
          return (
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
              {label}
            </button>
          );
        })}
      </div>

      {/* General */}
      {tab === "general" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("slug")} hint={tFields("slugHint")}>
            <input type="text" required value={values.slug} onChange={(e) => update("slug", e.target.value)} placeholder="my-brand" pattern="[a-z0-9-]+" className={inputClass} />
          </Field>
          <Field label={tFields("status")}>
            <select value={values.status} onChange={(e) => update("status", e.target.value as BrandFormValues["status"])} className={inputClass}>
              {STATUSES.map((s) => <option key={s} value={s}>{tStatus(s.toLowerCase())}</option>)}
            </select>
          </Field>
          <Field label={tFields("countryCode")}>
            <input type="text" required maxLength={2} value={values.countryCode} onChange={(e) => update("countryCode", e.target.value.toUpperCase())} placeholder="TW" className={`${inputClass} uppercase`} />
          </Field>
          <Field label={tFields("foundedYear")}>
            <input type="number" min={1800} max={2100} value={values.foundedYear} onChange={(e) => update("foundedYear", e.target.value)} placeholder="2010" className={inputClass} />
          </Field>
          <Field label={tFields("headquartersCity")}>
            <select value={values.headquartersCityId} onChange={(e) => update("headquartersCityId", e.target.value)} className={inputClass}>
              <option value="">—</option>
              {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label={tFields("businessModel")}>
            <select value={values.businessModel} onChange={(e) => update("businessModel", e.target.value as BrandFormValues["businessModel"])} className={inputClass}>
              {BUSINESS_MODELS.map((m) => <option key={m} value={m}>{tBM(m.toLowerCase())}</option>)}
            </select>
          </Field>
          <Field label={tFields("priceTier")}>
            <select value={values.priceTier} onChange={(e) => update("priceTier", e.target.value as BrandFormValues["priceTier"])} className={inputClass}>
              {PRICE_TIERS.map((p) => <option key={p} value={p}>{tPT(p.toLowerCase())}</option>)}
            </select>
          </Field>
          <Field label={tFields("officialWebsite")}>
            <input type="url" value={values.officialWebsite} onChange={(e) => update("officialWebsite", e.target.value)} placeholder="https://example.com" className={inputClass} />
          </Field>
          <Field label={tFields("logoUrl")}>
            <input type="url" value={values.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://…/logo.png" className={inputClass} />
          </Field>
          <Field label={tFields("positioningTags")} hint={tFields("positioningHint")}>
            <input type="text" value={values.positioningTags} onChange={(e) => update("positioningTags", e.target.value)} placeholder="fruit-tea, premium" className={inputClass} />
          </Field>
          <div className="flex items-center gap-2 self-end pb-1 sm:col-span-2">
            <input id="verified" type="checkbox" checked={values.verified} onChange={(e) => update("verified", e.target.checked)} className="size-4 rounded border-neutral-400" />
            <label htmlFor="verified" className="text-sm font-medium">{tFields("verified")}</label>
          </div>
        </div>
      ) : null}

      {/* i18n */}
      {tab === "i18n" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field label={`${tFields("nameI18n")} (${localeTab})`} hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}>
            <input type="text" value={values.nameI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, nameI18n: { ...v.nameI18n, [localeTab]: e.target.value } }))} required={localeTab === routing.defaultLocale} className={inputClass} />
          </Field>
          <Field label={`${tFields("descriptionI18n")} (${localeTab})`}>
            <textarea rows={6} value={values.descriptionI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, descriptionI18n: { ...v.descriptionI18n, [localeTab]: e.target.value } }))} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      ) : null}

      {/* SEO */}
      {tab === "seo" ? (
        <div className="space-y-4">
          <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
          <Field label={`${tFields("seoTitle")} (${localeTab})`}>
            <input type="text" value={(values.seoI18n[localeTab]?.title as string) ?? ""} onChange={(e) => setValues((v) => ({ ...v, seoI18n: { ...v.seoI18n, [localeTab]: { ...(v.seoI18n[localeTab] ?? {}), title: e.target.value } } }))} maxLength={120} className={inputClass} />
          </Field>
          <Field label={`${tFields("seoDescription")} (${localeTab})`}>
            <textarea rows={3} value={(values.seoI18n[localeTab]?.description as string) ?? ""} onChange={(e) => setValues((v) => ({ ...v, seoI18n: { ...v.seoI18n, [localeTab]: { ...(v.seoI18n[localeTab] ?? {}), description: e.target.value } } }))} maxLength={300} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      ) : null}

      {/* Advanced */}
      {tab === "advanced" ? (
        <div className="space-y-4">
          <Field label={tFields("socialHandles")}>
            <textarea rows={6} value={values.socialHandlesText} onChange={(e) => update("socialHandlesText", e.target.value)} placeholder={`{\n  "instagram": "handle",\n  "tiktok": "handle"\n}`} className={`${inputClass} font-mono text-xs`} spellCheck={false} />
          </Field>
        </div>
      ) : null}

      {/* Signature Drinks */}
      {tab === "signatureDrinks" && mode === "edit" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select value={pickerDrink} onChange={(e) => setPickerDrink(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {drinkOptions
                .filter((d) => !values.signatureDrinks.some((r) => r.drinkId === d.id))
                .map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <button type="button" onClick={addSignatureDrink} disabled={!pickerDrink} className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              {tRel("addRelation")}
            </button>
          </div>
          {values.signatureDrinks.length === 0 ? (
            <p className="text-sm text-neutral-500">{tRel("empty")}</p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {values.signatureDrinks.map((row, i) => (
                <li key={row.drinkId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex-1 text-sm">{drinksById.get(row.drinkId) ?? row.drinkId}</span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={row.isSignature} onChange={(e) => setValues((v) => ({ ...v, signatureDrinks: v.signatureDrinks.map((r, idx) => idx === i ? { ...r, isSignature: e.target.checked } : r) }))} className="size-3.5 rounded border-neutral-400" />
                    {tRel("isSignature")}
                  </label>
                  <button type="button" onClick={() => setValues((v) => ({ ...v, signatureDrinks: v.signatureDrinks.filter((_, idx) => idx !== i) }))} className="text-xs text-rose-700 hover:underline dark:text-rose-400">
                    {tRel("remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Brand Cities */}
      {tab === "brandCities" && mode === "edit" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select value={pickerCity} onChange={(e) => setPickerCity(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {cityOptions
                .filter((c) => !values.cities.some((r) => r.cityId === c.id))
                .map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button type="button" onClick={addBrandCity} disabled={!pickerCity} className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              {tRel("addRelation")}
            </button>
          </div>
          {values.cities.length === 0 ? (
            <p className="text-sm text-neutral-500">{tRel("empty")}</p>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {values.cities.map((row, i) => (
                <li key={row.cityId} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2">
                  <span className="text-sm">{citiesById.get(row.cityId) ?? row.cityId}</span>
                  <select value={row.status} onChange={(e) => setValues((v) => ({ ...v, cities: v.cities.map((r, idx) => idx === i ? { ...r, status: e.target.value as BrandCityStatus } : r) }))} className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                    {CITY_STATUSES.map((s) => <option key={s} value={s}>{tBCS(s.toLowerCase())}</option>)}
                  </select>
                  <input type="date" value={row.enteredAt} onChange={(e) => setValues((v) => ({ ...v, cities: v.cities.map((r, idx) => idx === i ? { ...r, enteredAt: e.target.value } : r) }))} title={tRel("enteredAt")} className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" />
                  <button type="button" onClick={() => setValues((v) => ({ ...v, cities: v.cities.filter((_, idx) => idx !== i) }))} className="text-xs text-rose-700 hover:underline dark:text-rose-400">
                    {tRel("remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Brand Companies */}
      {tab === "brandCompanies" && mode === "edit" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select value={pickerCompany} onChange={(e) => setPickerCompany(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button type="button" onClick={addBrandCompany} disabled={!pickerCompany} className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
              {tRel("addRelation")}
            </button>
          </div>
          {values.companies.length === 0 ? (
            <p className="text-sm text-neutral-500">{tRel("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {values.companies.map((row, i) => (
                <li key={i} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex-1 text-sm font-medium">{companiesById.get(row.companyId) ?? row.companyId}</span>
                    <button type="button" onClick={() => setValues((v) => ({ ...v, companies: v.companies.filter((_, idx) => idx !== i) }))} className="text-xs text-rose-700 hover:underline dark:text-rose-400">
                      {tRel("remove")}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="block text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">{tRel("relevance")}</span>
                      <select value={row.relation} onChange={(e) => setValues((v) => ({ ...v, companies: v.companies.map((r, idx) => idx === i ? { ...r, relation: e.target.value as CompanyRelation } : r) }))} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                        {COMPANY_RELATIONS.map((r) => <option key={r} value={r}>{tCR(r.toLowerCase())}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">{tRel("since")}</span>
                      <input type="date" required value={row.since} onChange={(e) => setValues((v) => ({ ...v, companies: v.companies.map((r, idx) => idx === i ? { ...r, since: e.target.value } : r) }))} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" />
                    </label>
                    <label className="block text-xs">
                      <span className="text-neutral-600 dark:text-neutral-400">{tRel("until")}</span>
                      <input type="date" value={row.until} onChange={(e) => setValues((v) => ({ ...v, companies: v.companies.map((r, idx) => idx === i ? { ...r, until: e.target.value } : r) }))} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
