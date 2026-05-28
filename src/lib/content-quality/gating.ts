/**
 * Day 7 — Pre-publish gating
 *
 * 對應 prototype-spec.md §12「發布前 gating 檢查」與 data-model.md §9。
 *
 * 用法（Phase 4 admin / API）：
 *   const result = validateBrandForPublish(data);
 *   if (!result.success) return result.errors;  // 阻擋上稿
 *
 * 設計：每個 entity 一支 validateXForPublish()，回傳 { success, errors[] }。
 * 採 Zod 是因為錯誤訊息結構化 + 之後可整合進 form 驗證。
 */
import { z } from "zod";

import { routing } from "@/i18n/routing";

const I18nString = z.record(
  z.string(),
  z.string().min(1, "Translation cannot be empty"),
);

/** 至少預設 locale 有值 */
const I18nWithDefault = I18nString.refine(
  (v) => typeof v[routing.defaultLocale] === "string" && v[routing.defaultLocale].length > 0,
  { message: `Translation for ${routing.defaultLocale} (default locale) is required` },
);

/** SEO i18n shape：每個 locale 至少要有 title 與 description */
const SeoI18n = z
  .record(
    z.string(),
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    }),
  )
  .refine(
    (v) => {
      const def = v[routing.defaultLocale];
      return def && def.title.length > 0 && def.description.length > 0;
    },
    {
      message: `seo_i18n[${routing.defaultLocale}].title and .description are required`,
    },
  );

// ─────────────────────────────────────────────────────────────
// Brand gating
// ─────────────────────────────────────────────────────────────

export const BrandPublishSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must match [a-z0-9-]"),
  nameI18n: I18nWithDefault,
  countryCode: z.string().length(2),
  businessModel: z.enum(["DIRECT", "FRANCHISE", "HYBRID", "LICENSED"]),
  priceTier: z.enum(["VALUE", "MID", "PREMIUM", "LUXURY"]),
  // SEO 必填
  seoI18n: SeoI18n,
});

export type BrandPublishInput = z.infer<typeof BrandPublishSchema>;

// ─────────────────────────────────────────────────────────────
// City gating
// ─────────────────────────────────────────────────────────────

export const CityPublishSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: I18nWithDefault,
  countryCode: z.string().length(2),
  lat: z.union([z.number(), z.string()]), // Decimal 從 DB 取出是 string
  lng: z.union([z.number(), z.string()]),
  timezone: z.string().min(1),
  seoI18n: SeoI18n,
});

// ─────────────────────────────────────────────────────────────
// Drink gating
// ─────────────────────────────────────────────────────────────

export const DrinkPublishSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: I18nWithDefault,
  category: z.enum([
    "MILK_TEA",
    "FRUIT_TEA",
    "PURE_TEA",
    "CHEESE_TEA",
    "COFFEE_TEA",
    "SMOOTHIE",
    "OTHER",
  ]),
  seoI18n: SeoI18n,
});

// ─────────────────────────────────────────────────────────────
// News gating（最嚴 — 來源必填、至少 1 個關聯）
// ─────────────────────────────────────────────────────────────

export const NewsPublishSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  titleI18n: I18nWithDefault,
  summaryI18n: I18nWithDefault,
  bodyI18n: I18nWithDefault,
  category: z.enum([
    "EXPANSION",
    "LAUNCH",
    "FRANCHISE_INVESTMENT",
    "CITY_MARKET",
    "TREND",
    "SUPPLY_CHAIN",
    "CULTURE",
  ]),
  sourceId: z.string().uuid(),
  sourceUrl: z.string().url(),
  publishedAt: z.date(),
  relationCount: z
    .number()
    .min(1, "News must reference at least one brand, city or drink"),
  seoI18n: SeoI18n,
});

// ─────────────────────────────────────────────────────────────
// 一致回傳格式
// ─────────────────────────────────────────────────────────────

export interface GatingResult {
  success: boolean;
  errors: Array<{ path: string; message: string }>;
}

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): GatingResult {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { success: true, errors: [] };
  return {
    success: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}

export const validateBrandForPublish = (data: unknown) => validate(BrandPublishSchema, data);
export const validateCityForPublish = (data: unknown) => validate(CityPublishSchema, data);
export const validateDrinkForPublish = (data: unknown) => validate(DrinkPublishSchema, data);
export const validateNewsForPublish = (data: unknown) => validate(NewsPublishSchema, data);
