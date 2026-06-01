"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

import AiDraftButton from "./ai-draft-button";
import ImageUploadField from "./image-upload-field";
import NewsCrawlPanel, { type ApplyArgs as CrawlApplyArgs } from "./news-crawl-panel";

type NewsCategory =
  | "EXPANSION"
  | "LAUNCH"
  | "FRANCHISE_INVESTMENT"
  | "CITY_MARKET"
  | "TREND"
  | "SUPPLY_CHAIN"
  | "CULTURE";

type Relevance = "PRIMARY" | "SECONDARY" | "MENTIONED";
type SeoPerLocale = { title?: string; description?: string };

export type RelatedBrandRow = { brandId: string; relevance: Relevance };
export type RelatedCityRow = { cityId: string; relevance: Relevance };
export type RelatedDrinkRow = { drinkId: string; relevance: Relevance };

type NewsFormValues = {
  slug: string;
  titleI18n: Record<string, string>;
  summaryI18n: Record<string, string>;
  bodyI18n: Record<string, string>;
  aiSummaryI18n: Record<string, string>;
  aiSummaryReviewedAt: string;
  seoI18n: Record<string, SeoPerLocale>;
  category: NewsCategory;
  sourceId: string;
  sourceUrl: string;
  publishedAt: string;
  heroImageUrl: string;
  editorTags: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  relatedBrands: RelatedBrandRow[];
  relatedCities: RelatedCityRow[];
  relatedDrinks: RelatedDrinkRow[];
};

export type NewsFormInitial = Partial<NewsFormValues> & { id?: string };

type Option = { id: string; label: string };

const TABS = [
  "general",
  "i18n",
  "seo",
  "advanced",
  "relatedBrands",
  "relatedCities",
  "relatedDrinks",
] as const;
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
const RELEVANCES: Relevance[] = ["PRIMARY", "SECONDARY", "MENTIONED"];

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
    relatedBrands: initial.relatedBrands ?? [],
    relatedCities: initial.relatedCities ?? [],
    relatedDrinks: initial.relatedDrinks ?? [],
  };
}

function buildNewsContext(v: NewsFormValues): string {
  const lines: string[] = [];
  lines.push(`Slug: ${v.slug || "(none)"}`);
  const anyTitle = Object.entries(v.titleI18n).find(([, val]) => val.trim());
  if (anyTitle) lines.push(`Title (${anyTitle[0]}): ${anyTitle[1]}`);
  lines.push(`Category: ${v.category}`);
  if (v.publishedAt) lines.push(`Published at: ${v.publishedAt}`);
  if (v.sourceUrl) lines.push(`Original source URL: ${v.sourceUrl}`);
  if (v.editorTags.trim()) lines.push(`Editor tags: ${v.editorTags}`);
  const anySummary = Object.entries(v.summaryI18n).find(([, val]) => val.trim());
  if (anySummary) lines.push(`Existing summary (${anySummary[0]}): ${anySummary[1]}`);
  const anyBody = Object.entries(v.bodyI18n).find(([, val]) => val.trim());
  if (anyBody) {
    // body 可能很長，截短
    const snippet = anyBody[1].slice(0, 800);
    lines.push(`Existing body (${anyBody[0]}, may be truncated):\n${snippet}`);
  }
  return lines.join("\n");
}

export default function NewsForm({
  mode,
  newsId,
  initial,
  sources,
  brands,
  cities,
  drinks,
}: {
  mode: "create" | "edit";
  newsId?: string;
  initial: NewsFormInitial;
  sources: Option[];
  brands: Option[];
  cities: Option[];
  drinks: Option[];
}) {
  const tEdit = useTranslations("admin.news.edit");
  const tFields = useTranslations("admin.news.edit.fields");
  const tTabs = useTranslations("admin.news.edit.tabs");
  const tStatus = useTranslations("admin.news.status");
  const tCategory = useTranslations("admin.news.category");
  const tRel = useTranslations("admin.relations");
  const tRelev = useTranslations("admin.relations.relevanceLevel");

  const router = useRouter();
  const [values, setValues] = useState<NewsFormValues>(() => buildInitial(initial));
  const [tab, setTab] = useState<Tab>("general");
  const [localeTab, setLocaleTab] = useState<Locale>(routing.locales[0]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);
  const [topError, setTopError] = useState<string | null>(null);

  const [pickerBrand, setPickerBrand] = useState("");
  const [pickerCity, setPickerCity] = useState("");
  const [pickerDrink, setPickerDrink] = useState("");

  const locales = routing.locales as readonly Locale[];

  const brandsById = new Map(brands.map((b) => [b.id, b.label]));
  const citiesById = new Map(cities.map((c) => [c.id, c.label]));
  const drinksById = new Map(drinks.map((d) => [d.id, d.label]));

  function update<K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toIsoUtc(local: string): string | null {
    if (!local) return null;
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
      if (v.description && String(v.description).trim()) entry.description = String(v.description).trim();
      if (Object.keys(entry).length > 0) seoI18n[k] = entry;
    }

    const editorTags = values.editorTags.split(",").map((s) => s.trim()).filter(Boolean);

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
      ...(mode === "edit"
        ? {
            relatedBrands: values.relatedBrands,
            relatedCities: values.relatedCities,
            relatedDrinks: values.relatedDrinks,
          }
        : {}),
    };

    const url = mode === "edit" ? `/api/admin/news/${newsId}` : `/api/admin/news`;
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
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
      if (!data.ok) { setTopError(data.error ?? "Delete failed"); setSubmitting(false); return; }
      router.push("/admin/news"); router.refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  const visibleTabs = TABS.filter(
    (t) => mode === "edit" || (t !== "relatedBrands" && t !== "relatedCities" && t !== "relatedDrinks"),
  );

  function handleCrawlApply(args: CrawlApplyArgs) {
    setValues((v) => ({
      ...v,
      sourceUrl: args.sourceUrl,
      publishedAt: args.publishedAt ?? v.publishedAt,
      heroImageUrl: args.heroImageUrl ?? v.heroImageUrl,
      sourceId: args.sourceId ?? v.sourceId,
      titleI18n: { ...v.titleI18n, ...args.titleI18n },
      summaryI18n: { ...v.summaryI18n, ...args.summaryI18n },
      bodyI18n: { ...v.bodyI18n, ...args.bodyI18n },
    }));
    if (args.sourceSuggest && !args.sourceId) {
      setTopError(
        `已套用內容，但找不到 domain "${args.sourceSuggest.domain}" 對應的來源。請先到 /admin/sources/new 建立來源（建議 slug: ${args.sourceSuggest.slug}、name: ${args.sourceSuggest.name}），再回來這頁選擇。`,
      );
    } else {
      setTopError(null);
    }
    setTab("i18n"); // 跳到 i18n tab 讓編輯馬上看到翻譯結果
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/news" className="text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">{tEdit("back")}</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{mode === "edit" ? tEdit("title") : tEdit("createTitle")}</h1>
          {mode === "edit" && initial.slug ? <p className="mt-0.5 font-mono text-xs text-neutral-500">{initial.slug}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {savedAt ? <span className="text-xs text-emerald-700 dark:text-emerald-400">✓ {tEdit("saved")}</span> : null}
          {mode === "edit" ? <button type="button" onClick={handleDelete} disabled={submitting} className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950">{tEdit("deleteButton")}</button> : null}
          <button type="submit" disabled={submitting} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50 dark:bg-rose-700 dark:hover:bg-rose-600">{submitting ? tEdit("saving") : tEdit("saveButton")}</button>
        </div>
      </header>

      {mode === "create" ? <NewsCrawlPanel onApply={handleCrawlApply} /> : null}

      {topError ? <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">{topError}</div> : null}
      {errors.length > 0 ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm dark:border-rose-800 dark:bg-rose-950">
          <p className="font-medium text-rose-800 dark:text-rose-200">{tEdit("validationErrors")}</p>
          <ul className="mt-1 list-inside list-disc text-rose-700 dark:text-rose-300">
            {errors.map((e, i) => <li key={i}><span className="font-mono">{e.path}</span> — {e.message}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {visibleTabs.map((key) => {
          const label =
            key === "relatedBrands" ? tRel("relatedBrands") :
            key === "relatedCities" ? tRel("relatedCities") :
            key === "relatedDrinks" ? tRel("relatedDrinks") :
            tTabs(key);
          return (
            <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === key ? "border-rose-600 text-rose-700 dark:text-rose-400" : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>{label}</button>
          );
        })}
      </div>

      {/* General */}
      {tab === "general" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={tFields("slug")} hint={tFields("slugHint")}>
            <input type="text" required value={values.slug} onChange={(e) => update("slug", e.target.value)} pattern="[a-z0-9-]+" className={inputClass} />
          </Field>
          <Field label={tFields("status")}>
            <select value={values.status} onChange={(e) => update("status", e.target.value as NewsFormValues["status"])} className={inputClass}>
              {STATUSES.map((s) => <option key={s} value={s}>{tStatus(s.toLowerCase())}</option>)}
            </select>
          </Field>
          <Field label={tFields("category")}>
            <select value={values.category} onChange={(e) => update("category", e.target.value as NewsCategory)} className={inputClass}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{tCategory(c.toLowerCase())}</option>)}
            </select>
          </Field>
          <Field label={tFields("sourceId")}>
            <select required value={values.sourceId} onChange={(e) => update("sourceId", e.target.value)} className={inputClass}>
              <option value="">—</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label={tFields("sourceUrl")} hint={tFields("sourceUrlHint")}>
            <input type="url" value={values.sourceUrl} onChange={(e) => update("sourceUrl", e.target.value)} placeholder="https://…" className={inputClass} />
          </Field>
          <Field label={tFields("publishedAt")} hint={tFields("publishedAtHint")}>
            <input type="datetime-local" required value={values.publishedAt} onChange={(e) => update("publishedAt", e.target.value)} className={inputClass} />
          </Field>
          <Field label={tFields("heroImageUrl")}>
            <ImageUploadField value={values.heroImageUrl} onChange={(url) => update("heroImageUrl", url)} prefix="news/hero" />
          </Field>
          <Field label={tFields("editorTags")} hint={tFields("editorTagsHint")}>
            <input type="text" value={values.editorTags} onChange={(e) => update("editorTags", e.target.value)} placeholder="opening, premium, asia" className={inputClass} />
          </Field>
        </div>
      ) : null}

      {/* i18n */}
      {tab === "i18n" ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
            <div className="flex gap-2">
              <AiDraftButton
                instruction="Write a 2-sentence (40-60 word) editorial summary of this news article. Highlight WHO, WHAT, WHERE, WHEN. Factual, no hype."
                fields={["text"]}
                getContext={() => buildNewsContext(values)}
                onApply={(drafts) => {
                  const localeDrafts = drafts.text ?? {};
                  setValues((v) => ({ ...v, summaryI18n: { ...v.summaryI18n, ...localeDrafts } }));
                }}
                label="AI 補完 摘要"
              />
              <AiDraftButton
                instruction="Write the full news body in Markdown. 3-5 paragraphs. Lead paragraph: who/what/where/when. Body: context, quotes if available, business implication. Use ## for section subheadings if useful. Do NOT invent quotes or numbers not in the context."
                fields={["text"]}
                getContext={() => buildNewsContext(values)}
                onApply={(drafts) => {
                  const localeDrafts = drafts.text ?? {};
                  setValues((v) => ({ ...v, bodyI18n: { ...v.bodyI18n, ...localeDrafts } }));
                }}
                label="AI 補完 本文"
              />
            </div>
          </div>
          <Field label={`${tFields("titleI18n")} (${localeTab})`} hint={localeTab === routing.defaultLocale ? "Required for default locale" : undefined}>
            <input type="text" value={values.titleI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, titleI18n: { ...v.titleI18n, [localeTab]: e.target.value } }))} required={localeTab === routing.defaultLocale} className={inputClass} />
          </Field>
          <Field label={`${tFields("summaryI18n")} (${localeTab})`}>
            <textarea rows={3} value={values.summaryI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, summaryI18n: { ...v.summaryI18n, [localeTab]: e.target.value } }))} className={`${inputClass} resize-y`} />
          </Field>
          <Field label={`${tFields("bodyI18n")} (${localeTab})`} hint={tFields("bodyHint")}>
            <textarea rows={14} value={values.bodyI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, bodyI18n: { ...v.bodyI18n, [localeTab]: e.target.value } }))} className={`${inputClass} resize-y font-mono text-xs`} spellCheck={false} />
          </Field>
        </div>
      ) : null}

      {/* SEO */}
      {tab === "seo" ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
            <AiDraftButton
              instruction="Generate SEO meta title (50-60 chars, news-style) and description (140-160 chars) for this news article."
              fields={["title", "description"]}
              maxChars={{ title: 60, description: 160 }}
              getContext={() => buildNewsContext(values)}
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
            <input type="text" value={(values.seoI18n[localeTab]?.title as string) ?? ""} onChange={(e) => setValues((v) => ({ ...v, seoI18n: { ...v.seoI18n, [localeTab]: { ...(v.seoI18n[localeTab] ?? {}), title: e.target.value } } }))} maxLength={120} className={inputClass} />
          </Field>
          <Field label={`${tFields("seoDescription")} (${localeTab})`}>
            <textarea rows={3} value={(values.seoI18n[localeTab]?.description as string) ?? ""} onChange={(e) => setValues((v) => ({ ...v, seoI18n: { ...v.seoI18n, [localeTab]: { ...(v.seoI18n[localeTab] ?? {}), description: e.target.value } } }))} maxLength={300} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      ) : null}

      {/* Advanced (AI summary) */}
      {tab === "advanced" ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <LocaleTabs locales={locales} active={localeTab} onChange={setLocaleTab} />
            <AiDraftButton
              instruction="Generate a short auto-summary (30-50 words) for this news article. Plain text, neutral tone, summarising the key fact."
              fields={["text"]}
              getContext={() => buildNewsContext(values)}
              onApply={(drafts) => {
                const localeDrafts = drafts.text ?? {};
                setValues((v) => ({ ...v, aiSummaryI18n: { ...v.aiSummaryI18n, ...localeDrafts } }));
              }}
              label="AI 生成草稿"
            />
          </div>
          <Field label={`${tFields("aiSummary")} (${localeTab})`} hint={tFields("aiSummaryHint")}>
            <textarea rows={6} value={values.aiSummaryI18n[localeTab] ?? ""} onChange={(e) => setValues((v) => ({ ...v, aiSummaryI18n: { ...v.aiSummaryI18n, [localeTab]: e.target.value } }))} className={`${inputClass} resize-y`} />
          </Field>
          <Field label={tFields("aiReviewedAt")} hint={tFields("aiReviewedAtHint")}>
            <input type="datetime-local" value={values.aiSummaryReviewedAt} onChange={(e) => update("aiSummaryReviewedAt", e.target.value)} className={inputClass} />
          </Field>
        </div>
      ) : null}

      {/* Related Brands */}
      {tab === "relatedBrands" && mode === "edit" ? (
        <RelationTagList
          options={brands.filter((b) => !values.relatedBrands.some((r) => r.brandId === b.id))}
          rows={values.relatedBrands.map((r) => ({ id: r.brandId, label: brandsById.get(r.brandId) ?? r.brandId, relevance: r.relevance }))}
          picker={pickerBrand} setPicker={setPickerBrand}
          onAdd={() => { if (!pickerBrand) return; setValues((v) => ({ ...v, relatedBrands: [...v.relatedBrands, { brandId: pickerBrand, relevance: "MENTIONED" }] })); setPickerBrand(""); }}
          onRemove={(i) => setValues((v) => ({ ...v, relatedBrands: v.relatedBrands.filter((_, idx) => idx !== i) }))}
          onRelevance={(i, r) => setValues((v) => ({ ...v, relatedBrands: v.relatedBrands.map((row, idx) => idx === i ? { ...row, relevance: r } : row) }))}
          tRel={tRel} tRelev={tRelev}
        />
      ) : null}
      {tab === "relatedCities" && mode === "edit" ? (
        <RelationTagList
          options={cities.filter((c) => !values.relatedCities.some((r) => r.cityId === c.id))}
          rows={values.relatedCities.map((r) => ({ id: r.cityId, label: citiesById.get(r.cityId) ?? r.cityId, relevance: r.relevance }))}
          picker={pickerCity} setPicker={setPickerCity}
          onAdd={() => { if (!pickerCity) return; setValues((v) => ({ ...v, relatedCities: [...v.relatedCities, { cityId: pickerCity, relevance: "MENTIONED" }] })); setPickerCity(""); }}
          onRemove={(i) => setValues((v) => ({ ...v, relatedCities: v.relatedCities.filter((_, idx) => idx !== i) }))}
          onRelevance={(i, r) => setValues((v) => ({ ...v, relatedCities: v.relatedCities.map((row, idx) => idx === i ? { ...row, relevance: r } : row) }))}
          tRel={tRel} tRelev={tRelev}
        />
      ) : null}
      {tab === "relatedDrinks" && mode === "edit" ? (
        <RelationTagList
          options={drinks.filter((d) => !values.relatedDrinks.some((r) => r.drinkId === d.id))}
          rows={values.relatedDrinks.map((r) => ({ id: r.drinkId, label: drinksById.get(r.drinkId) ?? r.drinkId, relevance: r.relevance }))}
          picker={pickerDrink} setPicker={setPickerDrink}
          onAdd={() => { if (!pickerDrink) return; setValues((v) => ({ ...v, relatedDrinks: [...v.relatedDrinks, { drinkId: pickerDrink, relevance: "MENTIONED" }] })); setPickerDrink(""); }}
          onRemove={(i) => setValues((v) => ({ ...v, relatedDrinks: v.relatedDrinks.filter((_, idx) => idx !== i) }))}
          onRelevance={(i, r) => setValues((v) => ({ ...v, relatedDrinks: v.relatedDrinks.map((row, idx) => idx === i ? { ...row, relevance: r } : row) }))}
          tRel={tRel} tRelev={tRelev}
        />
      ) : null}
    </form>
  );
}

function RelationTagList({
  options, rows, picker, setPicker, onAdd, onRemove, onRelevance, tRel, tRelev,
}: {
  options: Option[];
  rows: Array<{ id: string; label: string; relevance: Relevance }>;
  picker: string;
  setPicker: (s: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onRelevance: (idx: number, r: Relevance) => void;
  tRel: (k: string) => string;
  tRelev: (k: string) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={picker} onChange={(e) => setPicker(e.target.value)} className={inputClass}>
          <option value="">—</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <button type="button" onClick={onAdd} disabled={!picker} className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
          {tRel("addRelation")}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">{tRel("empty")}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {rows.map((row, i) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex-1 text-sm">{row.label}</span>
              <label className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500">{tRel("relevance")}:</span>
                <select value={row.relevance} onChange={(e) => onRelevance(i, e.target.value as Relevance)} className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                  {RELEVANCES.map((r) => <option key={r} value={r}>{tRelev(r.toLowerCase())}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => onRemove(i)} className="text-xs text-rose-700 hover:underline dark:text-rose-400">
                {tRel("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100";

function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
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
