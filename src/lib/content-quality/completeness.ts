/**
 * Day 7 — Content completeness scoring
 *
 * 對應 data-model.md §9：completeness_score (0-100)
 *
 * 設計：每個 entity 列出一組 (check, weight)，filled 的權重加總 / 全部權重 × 100。
 * 權重決定哪些欄位最重要：
 *   - 必填（已被 DB 強制非空）→ weight=0 不列（不算分）
 *   - i18n 欄位：每個 locale 算一筆，缺多語照 spec 應該降分
 *   - 關聯：≥ 1 筆 brandDrink/brandCity 等是內容飽和度重要訊號
 *   - SEO 欄位：title + description 各算一份
 *
 * 結果應由 worker 寫回 brands/cities/drinks/news.completeness_score。
 */
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

interface Check {
  label: string;
  weight: number;
  filled: boolean;
}

function score(checks: Check[]): { score: number; missing: string[] } {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const filled = checks
    .filter((c) => c.filled)
    .reduce((sum, c) => sum + c.weight, 0);
  const missing = checks.filter((c) => !c.filled).map((c) => c.label);
  return {
    score: totalWeight === 0 ? 0 : Math.round((filled / totalWeight) * 100),
    missing,
  };
}

function hasI18nLocale(field: unknown, locale: Locale): boolean {
  if (!field || typeof field !== "object") return false;
  const v = (field as Record<string, unknown>)[locale];
  return typeof v === "string" && v.length > 0;
}

function hasNestedSeoField(field: unknown, locale: Locale, key: string): boolean {
  if (!field || typeof field !== "object") return false;
  const locObj = (field as Record<string, unknown>)[locale];
  if (!locObj || typeof locObj !== "object") return false;
  const v = (locObj as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0;
}

function isNonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

function isNonEmptyObject(v: unknown): boolean {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
}

// ─────────────────────────────────────────────────────────────
// Brand
// ─────────────────────────────────────────────────────────────

export interface BrandForScoring {
  nameI18n: unknown;
  descriptionI18n?: unknown;
  seoI18n?: unknown;
  foundedYear?: number | null;
  headquartersCityId?: string | null;
  positioningTags?: string[];
  socialHandles?: unknown;
  officialWebsite?: string | null;
  logoUrl?: string | null;
  brandDrinks?: Array<{ isSignature: boolean }>;
  brandCities?: Array<unknown>;
  newsBrands?: Array<unknown>;
  brandCompanies?: Array<unknown>;
}

export function scoreBrand(b: BrandForScoring) {
  const checks: Check[] = [
    // i18n 名稱 — 4 locale 各 3pt
    ...routing.locales.map((loc) => ({
      label: `name_i18n[${loc}]`,
      weight: 3,
      filled: hasI18nLocale(b.nameI18n, loc),
    })),
    // i18n 描述 — 4 locale 各 4pt（描述比名稱重要，因為是頁面主體）
    ...routing.locales.map((loc) => ({
      label: `description_i18n[${loc}]`,
      weight: 4,
      filled: hasI18nLocale(b.descriptionI18n, loc),
    })),
    // 基本資料
    { label: "founded_year", weight: 4, filled: !!b.foundedYear },
    { label: "headquarters_city_id", weight: 4, filled: !!b.headquartersCityId },
    { label: "positioning_tags", weight: 4, filled: isNonEmptyArray(b.positioningTags) },
    { label: "official_website", weight: 3, filled: !!b.officialWebsite },
    { label: "social_handles", weight: 3, filled: isNonEmptyObject(b.socialHandles) },
    { label: "logo_url", weight: 5, filled: !!b.logoUrl },
    // SEO（預設 locale）
    {
      label: "seo_i18n[default].title",
      weight: 6,
      filled: hasNestedSeoField(b.seoI18n, routing.defaultLocale, "title"),
    },
    {
      label: "seo_i18n[default].description",
      weight: 6,
      filled: hasNestedSeoField(b.seoI18n, routing.defaultLocale, "description"),
    },
    // 關聯
    {
      label: "≥1 signature drink",
      weight: 8,
      filled: !!b.brandDrinks?.some((bd) => bd.isSignature),
    },
    {
      label: "≥1 active city",
      weight: 8,
      filled: (b.brandCities?.length ?? 0) > 0,
    },
    {
      label: "≥1 news mention",
      weight: 4,
      filled: (b.newsBrands?.length ?? 0) > 0,
    },
    {
      label: "≥1 parent company",
      weight: 3,
      filled: (b.brandCompanies?.length ?? 0) > 0,
    },
  ];
  return score(checks);
}

// ─────────────────────────────────────────────────────────────
// City
// ─────────────────────────────────────────────────────────────

export interface CityForScoring {
  nameI18n: unknown;
  descriptionI18n?: unknown;
  seoI18n?: unknown;
  adminRegion?: string | null;
  population?: number | null;
  avgPriceLocal?: unknown;
  avgPriceCurrency?: string | null;
  marketMaturity?: string | null;
  brandCities?: Array<unknown>;
  drinkCities?: Array<unknown>;
  newsCities?: Array<unknown>;
}

export function scoreCity(c: CityForScoring) {
  const checks: Check[] = [
    ...routing.locales.map((loc) => ({
      label: `name_i18n[${loc}]`,
      weight: 3,
      filled: hasI18nLocale(c.nameI18n, loc),
    })),
    ...routing.locales.map((loc) => ({
      label: `description_i18n[${loc}]`,
      weight: 5,
      filled: hasI18nLocale(c.descriptionI18n, loc),
    })),
    { label: "admin_region", weight: 3, filled: !!c.adminRegion },
    { label: "population", weight: 4, filled: !!c.population },
    {
      label: "avg_price",
      weight: 5,
      filled: !!c.avgPriceLocal && !!c.avgPriceCurrency,
    },
    { label: "market_maturity", weight: 5, filled: !!c.marketMaturity },
    {
      label: "seo_i18n[default].title",
      weight: 6,
      filled: hasNestedSeoField(c.seoI18n, routing.defaultLocale, "title"),
    },
    {
      label: "seo_i18n[default].description",
      weight: 6,
      filled: hasNestedSeoField(c.seoI18n, routing.defaultLocale, "description"),
    },
    {
      label: "≥1 active brand",
      weight: 10,
      filled: (c.brandCities?.length ?? 0) > 0,
    },
    {
      label: "≥3 popular drinks",
      weight: 6,
      filled: (c.drinkCities?.length ?? 0) >= 3,
    },
    {
      label: "≥1 news mention",
      weight: 4,
      filled: (c.newsCities?.length ?? 0) > 0,
    },
  ];
  return score(checks);
}

// ─────────────────────────────────────────────────────────────
// Drink
// ─────────────────────────────────────────────────────────────

export interface DrinkForScoring {
  nameI18n: unknown;
  descriptionI18n?: unknown;
  seoI18n?: unknown;
  teaBase?: string[];
  milkType?: string | null;
  toppings?: string[];
  sweetener?: string | null;
  temperature?: string[];
  typicalSugarLevels?: number[];
  caloriesKcalMin?: number | null;
  caloriesKcalMax?: number | null;
  caffeineMgMin?: number | null;
  caffeineMgMax?: number | null;
  flavorProfile?: unknown;
  brandDrinks?: Array<unknown>;
  drinkCities?: Array<unknown>;
  newsDrinks?: Array<unknown>;
}

export function scoreDrink(d: DrinkForScoring) {
  const checks: Check[] = [
    ...routing.locales.map((loc) => ({
      label: `name_i18n[${loc}]`,
      weight: 3,
      filled: hasI18nLocale(d.nameI18n, loc),
    })),
    ...routing.locales.map((loc) => ({
      label: `description_i18n[${loc}]`,
      weight: 4,
      filled: hasI18nLocale(d.descriptionI18n, loc),
    })),
    // 配方
    { label: "tea_base", weight: 3, filled: isNonEmptyArray(d.teaBase) },
    { label: "milk_type", weight: 3, filled: !!d.milkType },
    { label: "toppings", weight: 3, filled: isNonEmptyArray(d.toppings) },
    { label: "sweetener", weight: 3, filled: !!d.sweetener },
    { label: "temperature", weight: 2, filled: isNonEmptyArray(d.temperature) },
    {
      label: "typical_sugar_levels",
      weight: 2,
      filled: isNonEmptyArray(d.typicalSugarLevels),
    },
    // 營養（用 != null 同時排除 null 與 undefined）
    {
      label: "calories range",
      weight: 4,
      filled: d.caloriesKcalMin != null && d.caloriesKcalMax != null,
    },
    {
      label: "caffeine range",
      weight: 3,
      filled: d.caffeineMgMin != null && d.caffeineMgMax != null,
    },
    {
      label: "flavor_profile",
      weight: 6,
      filled: isNonEmptyObject(d.flavorProfile),
    },
    // SEO
    {
      label: "seo_i18n[default].title",
      weight: 5,
      filled: hasNestedSeoField(d.seoI18n, routing.defaultLocale, "title"),
    },
    {
      label: "seo_i18n[default].description",
      weight: 5,
      filled: hasNestedSeoField(d.seoI18n, routing.defaultLocale, "description"),
    },
    // 關聯
    {
      label: "≥1 brand carries it",
      weight: 10,
      filled: (d.brandDrinks?.length ?? 0) > 0,
    },
    {
      label: "≥1 city popularity score",
      weight: 4,
      filled: (d.drinkCities?.length ?? 0) > 0,
    },
    {
      label: "≥1 news mention",
      weight: 3,
      filled: (d.newsDrinks?.length ?? 0) > 0,
    },
  ];
  return score(checks);
}

// ─────────────────────────────────────────────────────────────
// News
// ─────────────────────────────────────────────────────────────

export interface NewsForScoring {
  titleI18n: unknown;
  summaryI18n: unknown;
  bodyI18n: unknown;
  seoI18n?: unknown;
  heroImageUrl?: string | null;
  editorTags?: string[];
  sourceUrl?: string | null;
  newsBrands?: Array<unknown>;
  newsCities?: Array<unknown>;
  newsDrinks?: Array<unknown>;
}

export function scoreNews(n: NewsForScoring) {
  const totalRelations =
    (n.newsBrands?.length ?? 0) +
    (n.newsCities?.length ?? 0) +
    (n.newsDrinks?.length ?? 0);

  const checks: Check[] = [
    ...routing.locales.map((loc) => ({
      label: `title_i18n[${loc}]`,
      weight: 3,
      filled: hasI18nLocale(n.titleI18n, loc),
    })),
    ...routing.locales.map((loc) => ({
      label: `summary_i18n[${loc}]`,
      weight: 4,
      filled: hasI18nLocale(n.summaryI18n, loc),
    })),
    ...routing.locales.map((loc) => ({
      label: `body_i18n[${loc}]`,
      weight: 5,
      filled: hasI18nLocale(n.bodyI18n, loc),
    })),
    { label: "source_url", weight: 4, filled: !!n.sourceUrl },
    { label: "hero_image_url", weight: 4, filled: !!n.heroImageUrl },
    { label: "editor_tags", weight: 3, filled: isNonEmptyArray(n.editorTags) },
    {
      label: "seo_i18n[default].title",
      weight: 5,
      filled: hasNestedSeoField(n.seoI18n, routing.defaultLocale, "title"),
    },
    {
      label: "seo_i18n[default].description",
      weight: 5,
      filled: hasNestedSeoField(n.seoI18n, routing.defaultLocale, "description"),
    },
    {
      label: "≥1 related entity",
      weight: 8,
      filled: totalRelations >= 1,
    },
    {
      label: "≥3 related entities (SEO internal links)",
      weight: 6,
      filled: totalRelations >= 3,
    },
  ];
  return score(checks);
}
