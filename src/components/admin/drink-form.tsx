"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

import AiDraftButton from "./ai-draft-button";

type DrinkCategory =
  | "MILK_TEA"
  | "FRUIT_TEA"
  | "PURE_TEA"
  | "CHEESE_TEA"
  | "COFFEE_TEA"
  | "SMOOTHIE"
  | "OTHER";
type Temp = "HOT" | "ICED" | "BLENDED";
type SeoPerLocale = { title?: string; description?: string };

type DrinkFormValues = {
  slug: string;
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  seoI18n: Record<string, SeoPerLocale>;
  category: DrinkCategory;
  teaBase: string; // comma-separated
  milkType: string;
  toppings: string;
  sweetener: string;
  temperature: Temp[];
  typicalSugarLevels: string; // comma-separated numbers
  caloriesKcalMin: string;
  caloriesKcalMax: string;
  caffeineMgMin: string;
  caffeineMgMax: string;
  flavorProfileText: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type DrinkFormInitial = Partial<DrinkFormValues> & { id?: string };

const TABS = ["general", "recipe", "nutrition", "i18n", "seo"] as const;
type Tab = (typeof TABS)[number];
const CATEGORIES: DrinkCategory[] = [
  "MILK_TEA",
  "FRUIT_TEA",
  "PURE_TEA",
  "CHEESE_TEA",
  "COFFEE_TEA",
  "SMOOTHIE",
  "OTHER",
];
const TEMPS: Temp[] = ["HOT", "ICED", "BLENDED"];
const STATUSES: DrinkFormValues["status"][] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function buildInitial(initial: DrinkFormInitial): DrinkFormValues {
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
    category: (initial.category as DrinkCategory) ?? "MILK_TEA",
    teaBase: initial.teaBase ?? "",
    milkType: initial.milkType ?? "",
    toppings: initial.toppings ?? "",
    sweetener: initial.sweetener ?? "",
    temperature: initial.temperature ?? [],
    typicalSugarLevels: initial.typicalSugarLevels ?? "",
    caloriesKcalMin: initial.caloriesKcalMin ?? "",
    caloriesKcalMax: initial.caloriesKcalMax ?? "",
    caffeineMgMin: initial.caffeineMgMin ?? "",
    caffeineMgMax: initial.caffeineMgMax ?? "",
    flavorProfileText: initial.flavorProfileText ?? "",
    status: (initial.status as DrinkFormValues["status"]) ?? "DRAFT",
  };
}

function buildDrinkContext(v: DrinkFormValues): string {
  const lines: string[] = [];
  lines.push(`Slug: ${v.slug || "(none)"}`);
  const anyName = Object.entries(v.nameI18n).find(([, val]) => val.trim())?.[1];
  if (anyName) lines.push(`Drink name: ${anyName}`);
  lines.push(`Category: ${v.category}`);
  if (v.teaBase.trim()) lines.push(`Tea base: ${v.teaBase}`);
  if (v.milkType) lines.push(`Milk: ${v.milkType}`);
  if (v.toppings.trim()) lines.push(`Toppings: ${v.toppings}`);
  if (v.sweetener) lines.push(`Sweetener: ${v.sweetener}`);
  if (v.temperature.length > 0) lines.push(`Available temperatures: ${v.temperature.join(", ")}`);
  if (v.typicalSugarLevels.trim()) lines.push(`Typical sugar levels: ${v.typicalSugarLevels}%`);
  if (v.caloriesKcalMin || v.caloriesKcalMax) {
    lines.push(`Calories range: ${v.caloriesKcalMin || "?"}–${v.caloriesKcalMax || "?"} kcal`);
  }
  if (v.caffeineMgMin || v.caffeineMgMax) {
    lines.push(`Caffeine range: ${v.caffeineMgMin || "?"}–${v.caffeineMgMax || "?"} mg`);
  }
  if (v.flavorProfileText.trim()) lines.push(`Flavor profile: ${v.flavorProfileText}`);
  const anyDesc = Object.entries(v.descriptionI18n).find(([, val]) => val.trim());
  if (anyDesc) lines.push(`Existing description (${anyDesc[0]}): ${anyDesc[1]}`);
  return lines.join("\n");
}

export default function DrinkForm({
  mode,
  drinkId,
  initial,
}: {
  mode: "create" | "edit";
  drinkId?: string;
  initial: DrinkFormInitial;
}) {
  const tEdit = useTranslations("admin.drinks.edit");
  const tFields = useTranslations("admin.drinks.edit.fields");
  const tTabs = useTranslations("admin.drinks.edit.tabs");
  const tStatus = useTranslations("admin.drinks.status");
  const tCategory = useTranslations("admin.drinks.category");
  const tTemp = useTranslations("admin.drinks.temperature");

  const router = useRouter();
  const [values, setValues] = useState<DrinkFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const locales = routing.locales as readonly Locale[];

  function update<K extends keyof DrinkFormValues>(key: K, value: DrinkFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleTemp(t: Temp) {
    setValues((v) => ({
      ...v,
      temperature: v.temperature.includes(t)
        ? v.temperature.filter((x) => x !== t)
        : [...v.temperature, t],
    }));
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

    let flavorProfile: unknown = null;
    if (values.flavorProfileText.trim()) {
      try {
        flavorProfile = JSON.parse(values.flavorProfileText);
      } catch {
        setTopError(`${tFields("flavorProfile")}: invalid JSON`);
        setSubmitting(false);
        return;
      }
    }

    const teaBase = values.teaBase.split(",").map((s) => s.trim()).filter(Boolean);
    const toppings = values.toppings.split(",").map((s) => s.trim()).filter(Boolean);
    const typicalSugarLevels = values.typicalSugarLevels
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    const payload = {
      slug: values.slug.trim(),
      nameI18n,
      descriptionI18n: Object.keys(descriptionI18n).length ? descriptionI18n : null,
      seoI18n: Object.keys(seoI18n).length ? seoI18n : null,
      category: values.category,
      teaBase,
      milkType: values.milkType.trim() || null,
      toppings,
      sweetener: values.sweetener.trim() || null,
      temperature: values.temperature,
      typicalSugarLevels,
      caloriesKcalMin: values.caloriesKcalMin.trim() ? Number(values.caloriesKcalMin) : null,
      caloriesKcalMax: values.caloriesKcalMax.trim() ? Number(values.caloriesKcalMax) : null,
      caffeineMgMin: values.caffeineMgMin.trim() ? Number(values.caffeineMgMin) : null,
      caffeineMgMax: values.caffeineMgMax.trim() ? Number(values.caffeineMgMax) : null,
      flavorProfile,
      status: values.status,
    };

    const url = mode === "edit" ? `/api/admin/drinks/${drinkId}` : `/api/admin/drinks`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | { ok: true; drink: { id: string; slug: string } }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };

      if (!data.ok) {
        if ("errors" in data && data.errors) setErrors(data.errors);
        if ("error" in data && data.error) setTopError(data.error);
        setSubmitting(false);
        return;
      }
      setSavedAt(Date.now());
      setSubmitting(false);
      if (mode === "create") router.replace(`/admin/drinks/${data.drink.id}`);
      router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!drinkId) return;
    if (!confirm(tEdit("deleteConfirm"))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/drinks/${drinkId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setTopError(data.error ?? "Delete failed");
        setSubmitting(false);
        return;
      }
      router.push("/admin/drinks");
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
            href="/admin/drinks"
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
              onChange={(e) => update("status", e.target.value as DrinkFormValues["status"])}
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
              onChange={(e) => update("category", e.target.value as DrinkCategory)}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCategory(c.toLowerCase())}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {tab === "recipe" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("teaBase")} hint={tFields("teaBaseHint")}>
            <input
              type="text"
              value={values.teaBase}
              onChange={(e) => update("teaBase", e.target.value)}
              placeholder="black, oolong"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("milkType")} hint={tFields("milkTypeHint")}>
            <input
              type="text"
              value={values.milkType}
              onChange={(e) => update("milkType", e.target.value)}
              placeholder="fresh-milk"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("toppings")} hint={tFields("toppingsHint")}>
            <input
              type="text"
              value={values.toppings}
              onChange={(e) => update("toppings", e.target.value)}
              placeholder="tapioca, pudding"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("sweetener")} hint={tFields("sweetenerHint")}>
            <input
              type="text"
              value={values.sweetener}
              onChange={(e) => update("sweetener", e.target.value)}
              placeholder="brown-sugar"
              className={inputClass}
            />
          </Field>
          <Field label={tFields("temperature")}>
            <div className="flex gap-3 pt-1">
              {TEMPS.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={values.temperature.includes(t)}
                    onChange={() => toggleTemp(t)}
                    className="size-4 rounded border-neutral-400"
                  />
                  {tTemp(t.toLowerCase())}
                </label>
              ))}
            </div>
          </Field>
          <Field label={tFields("typicalSugarLevels")} hint={tFields("sugarLevelsHint")}>
            <input
              type="text"
              value={values.typicalSugarLevels}
              onChange={(e) => update("typicalSugarLevels", e.target.value)}
              placeholder="0, 30, 50, 70, 100"
              className={inputClass}
            />
          </Field>
        </div>
      ) : null}

      {tab === "nutrition" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("caloriesKcalMin")}>
            <input
              type="number"
              min={0}
              value={values.caloriesKcalMin}
              onChange={(e) => update("caloriesKcalMin", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("caloriesKcalMax")}>
            <input
              type="number"
              min={0}
              value={values.caloriesKcalMax}
              onChange={(e) => update("caloriesKcalMax", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("caffeineMgMin")}>
            <input
              type="number"
              min={0}
              value={values.caffeineMgMin}
              onChange={(e) => update("caffeineMgMin", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label={tFields("caffeineMgMax")}>
            <input
              type="number"
              min={0}
              value={values.caffeineMgMax}
              onChange={(e) => update("caffeineMgMax", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label={tFields("flavorProfile")}
            hint={tFields("flavorProfileHint")}
          >
            <textarea
              rows={6}
              value={values.flavorProfileText}
              onChange={(e) => update("flavorProfileText", e.target.value)}
              placeholder={`{\n  "sweet": 4,\n  "milky": 3,\n  "bitter": 1\n}`}
              className={`${inputClass} resize-y font-mono text-xs sm:col-span-2`}
              spellCheck={false}
            />
          </Field>
        </div>
      ) : null}

      {tab === "i18n" ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
            <AiDraftButton
              instruction="Write a 60-100 word description of this bubble tea drink. Cover the flavour, mouthfeel, signature ingredients. Useful for someone deciding whether to order it."
              fields={["text"]}
              getContext={() => buildDrinkContext(values)}
              onApply={(drafts) => {
                const localeDrafts = drafts.text ?? {};
                setValues((v) => ({ ...v, descriptionI18n: { ...v.descriptionI18n, ...localeDrafts } }));
              }}
              label="AI 補完 4 個 locale"
            />
          </div>
          <Field
            label={`${tFields("nameI18n")} (${localeTab})`}
            hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}
          >
            <input type="text" value={values.nameI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, nameI18n: { ...v.nameI18n, [localeTab]: e.target.value } }))} required={localeTab === routing.defaultLocale} className={inputClass} />
          </Field>
          <Field label={`${tFields("descriptionI18n")} (${localeTab})`}>
            <textarea rows={6} value={values.descriptionI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, descriptionI18n: { ...v.descriptionI18n, [localeTab]: e.target.value } }))} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      ) : null}

      {tab === "seo" ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
            <AiDraftButton
              instruction="Generate SEO meta title (50-60 chars) and description (140-160 chars) for this bubble tea drink encyclopedia page."
              fields={["title", "description"]}
              maxChars={{ title: 60, description: 160 }}
              getContext={() => buildDrinkContext(values)}
              onApply={(drafts) => {
                setValues((v) => {
                  const newSeo: Record<string, { title?: string; description?: string }> = { ...v.seoI18n };
                  for (const lc of routing.locales) {
                    const title = drafts.title?.[lc];
                    const description = drafts.description?.[lc];
                    newSeo[lc] = { ...(newSeo[lc] ?? {}), ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}) };
                  }
                  return { ...v, seoI18n: newSeo };
                });
              }}
              label="AI 補完 SEO"
            />
          </div>
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
