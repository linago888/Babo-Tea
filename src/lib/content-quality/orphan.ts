/**
 * Day 7 — Orphan detection
 *
 * 對應 data-model.md §9：orphan = entity 無任何 outbound relation。
 * 編輯團隊看到孤兒列表時知道：這筆資料雖然存在，但沒有任何 join 進整個 graph，
 * 通常代表內容尚未完成（或誤建）。
 *
 * 設計用 Prisma _count + where 一次查詢，避免 N+1。
 */
import type { PrismaClient } from "@/generated/prisma/client";

export interface OrphanReport {
  brands: Array<{ id: string; slug: string; reason: string }>;
  cities: Array<{ id: string; slug: string; reason: string }>;
  drinks: Array<{ id: string; slug: string; reason: string }>;
  news: Array<{ id: string; slug: string; reason: string }>;
  sources: Array<{ id: string; slug: string; reason: string }>;
}

export async function detectOrphans(prisma: PrismaClient): Promise<OrphanReport> {
  const [brands, cities, drinks, news, sources] = await Promise.all([
    // Brand：無 brandDrinks AND 無 brandCities AND 無 newsBrands
    prisma.brand.findMany({
      where: {
        status: { not: "ARCHIVED" },
        brandDrinks: { none: {} },
        brandCities: { none: {} },
        newsBrands: { none: {} },
      },
      select: { id: true, slug: true },
    }),
    // City：無 brandCities AND 無 drinkCities AND 無 newsCities AND 無 brandsHeadquartered
    prisma.city.findMany({
      where: {
        status: { not: "ARCHIVED" },
        brandCities: { none: {} },
        drinkCities: { none: {} },
        newsCities: { none: {} },
        brandsHeadquartered: { none: {} },
      },
      select: { id: true, slug: true },
    }),
    // Drink：無 brandDrinks AND 無 drinkCities AND 無 newsDrinks
    prisma.drink.findMany({
      where: {
        status: { not: "ARCHIVED" },
        brandDrinks: { none: {} },
        drinkCities: { none: {} },
        newsDrinks: { none: {} },
      },
      select: { id: true, slug: true },
    }),
    // News：無 newsBrands AND 無 newsCities AND 無 newsDrinks（spec gating 至少要有 1 個，但本檢查抓漏網）
    prisma.news.findMany({
      where: {
        status: { not: "ARCHIVED" },
        newsBrands: { none: {} },
        newsCities: { none: {} },
        newsDrinks: { none: {} },
      },
      select: { id: true, slug: true },
    }),
    // Source：無 news
    prisma.source.findMany({
      where: {
        status: { not: "ARCHIVED" },
        news: { none: {} },
      },
      select: { id: true, slug: true },
    }),
  ]);

  return {
    brands: brands.map((b) => ({ ...b, reason: "no drinks, cities or news" })),
    cities: cities.map((c) => ({ ...c, reason: "no brands, drinks or news" })),
    drinks: drinks.map((d) => ({ ...d, reason: "no brands, cities or news" })),
    news: news.map((n) => ({ ...n, reason: "no related brands, cities or drinks" })),
    sources: sources.map((s) => ({ ...s, reason: "no news uses this source" })),
  };
}

/**
 * 找需要編輯複查的實體：review_due_at 已過期
 * （依 data-model.md §9，editorial team 應定期複查內容鮮度）
 */
export async function detectReviewDue(prisma: PrismaClient) {
  const now = new Date();
  const where = { status: "PUBLISHED" as const, reviewDueAt: { lte: now } };
  const [brands, cities, drinks, news] = await Promise.all([
    prisma.brand.findMany({
      where,
      select: { id: true, slug: true, reviewDueAt: true },
    }),
    prisma.city.findMany({
      where,
      select: { id: true, slug: true, reviewDueAt: true },
    }),
    prisma.drink.findMany({
      where,
      select: { id: true, slug: true, reviewDueAt: true },
    }),
    prisma.news.findMany({
      where,
      select: { id: true, slug: true, reviewDueAt: true },
    }),
  ]);
  return { brands, cities, drinks, news };
}

/**
 * 找待審 AI 摘要：有 ai_summary_i18n 但 reviewed_by 為 null
 * （ingest pipeline 寫入 → 編輯審核前不對外公開）
 */
export async function detectPendingAiSummaries(prisma: PrismaClient) {
  return prisma.news.findMany({
    where: {
      aiSummaryI18n: { not: { equals: null } },
      aiSummaryReviewedBy: null,
    },
    select: { id: true, slug: true, titleI18n: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });
}
