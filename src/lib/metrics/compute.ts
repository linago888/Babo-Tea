/**
 * Day 6：metrics 計算與寫入工具
 *
 * 對應 data-model.md §7：
 * - 原始輸入指標（raw inputs）：news_count_30d、new_store_count_30d 等 — 來自其他表的聚合
 * - 衍生分數（derived scores）：trending_score、market_maturity、popularity_score
 *   = 套用公式於原始輸入
 *
 * Day 6 範疇：只實作 raw input 計算 + upsert。衍生分數需要全體 z-score
 * 與百分位 rebalance，等資料量到一定規模再啟動 job（公式 §7.2 已寫進
 * spec，欄位 schema 也都備好了）。
 *
 * 用法：
 *   import { computeBrandRawMetrics, upsertMetric } from "@/lib/metrics/compute";
 *   const inputs = await computeBrandRawMetrics(prisma, brandId, today);
 *   for (const m of inputs) await upsertMetric(prisma, m);
 */
import type { PrismaClient } from "@/generated/prisma/client";

export type EntityKind = "BRAND" | "CITY" | "DRINK";
export type Metric =
  | "TRENDING_SCORE"
  | "MARKET_MATURITY"
  | "POPULARITY_SCORE"
  | "NEWS_COUNT_30D"
  | "NEW_STORE_COUNT_30D"
  | "NEW_STORE_COUNT_90D"
  | "SOCIAL_MENTION_30D"
  | "SEARCH_VOLUME_30D"
  | "ACTIVE_STORE_COUNT"
  | "DISTINCT_BRAND_COUNT";

export interface MetricRow {
  entityKind: EntityKind;
  entityId: string;
  metric: Metric;
  date: Date; // 取 UTC 當日 00:00:00 即可，DB 是 DATE 型別
  value: number;
  inputs?: Record<string, unknown>;
}

/** 切出 UTC 當天 00:00:00 — 對應 DATE column 的同一天 */
export function toDateOnly(d: Date): Date {
  const dd = new Date(d);
  dd.setUTCHours(0, 0, 0, 0);
  return dd;
}

/** N 天前的 UTC 00:00:00 */
export function daysAgo(n: number, from: Date = new Date()): Date {
  const d = toDateOnly(from);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

/**
 * 寫入或更新一筆 metric。PK 是 (entityKind, entityId, metric, date)，
 * 同一天重跑會覆蓋既有值。
 */
export async function upsertMetric(
  prisma: PrismaClient,
  m: MetricRow,
): Promise<void> {
  await prisma.metricDaily.upsert({
    where: {
      entityKind_entityId_metric_date: {
        entityKind: m.entityKind,
        entityId: m.entityId,
        metric: m.metric,
        date: m.date,
      },
    },
    update: {
      value: m.value.toString(),
      inputs: m.inputs as never,
    },
    create: {
      entityKind: m.entityKind,
      entityId: m.entityId,
      metric: m.metric,
      date: m.date,
      value: m.value.toString(),
      inputs: m.inputs as never,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Raw input 計算 — 直接從其他表聚合
// ─────────────────────────────────────────────────────────────

/**
 * 某品牌過去 N 天被新聞提及的次數
 * 來源：news_brands JOIN news WHERE published_at >= now() - N days
 */
export async function computeBrandNewsCount(
  prisma: PrismaClient,
  brandId: string,
  windowDays: number,
  today: Date = new Date(),
): Promise<number> {
  const since = daysAgo(windowDays, today);
  const count = await prisma.newsBrand.count({
    where: {
      brandId,
      news: { publishedAt: { gte: since } },
    },
  });
  return count;
}

/**
 * 某品牌過去 N 天新開店數
 * 來源：stores WHERE brand_id = X AND opened_at >= now() - N days
 */
export async function computeBrandNewStoreCount(
  prisma: PrismaClient,
  brandId: string,
  windowDays: number,
  today: Date = new Date(),
): Promise<number> {
  const since = daysAgo(windowDays, today);
  return prisma.store.count({
    where: {
      brandId,
      openedAt: { gte: since },
    },
  });
}

/**
 * 某城市當下活躍店數（未關閉）
 */
export async function computeCityActiveStoreCount(
  prisma: PrismaClient,
  cityId: string,
): Promise<number> {
  return prisma.store.count({
    where: { cityId, closedAt: null, status: "PUBLISHED" },
  });
}

/**
 * 某城市當下不同品牌數（用於 market_maturity 公式）
 */
export async function computeCityDistinctBrandCount(
  prisma: PrismaClient,
  cityId: string,
): Promise<number> {
  const rows = await prisma.store.findMany({
    where: { cityId, closedAt: null },
    distinct: ["brandId"],
    select: { brandId: true },
  });
  return rows.length;
}

// ─────────────────────────────────────────────────────────────
// 對外封裝：一次算一個品牌 / 城市的所有 raw inputs
// ─────────────────────────────────────────────────────────────

export async function computeBrandRawMetrics(
  prisma: PrismaClient,
  brandId: string,
  today: Date = new Date(),
): Promise<MetricRow[]> {
  const date = toDateOnly(today);
  const [news30d, newStore30d, newStore90d] = await Promise.all([
    computeBrandNewsCount(prisma, brandId, 30, today),
    computeBrandNewStoreCount(prisma, brandId, 30, today),
    computeBrandNewStoreCount(prisma, brandId, 90, today),
  ]);

  return [
    {
      entityKind: "BRAND",
      entityId: brandId,
      metric: "NEWS_COUNT_30D",
      date,
      value: news30d,
      inputs: { window_days: 30, source: "news_brands × news.published_at" },
    },
    {
      entityKind: "BRAND",
      entityId: brandId,
      metric: "NEW_STORE_COUNT_30D",
      date,
      value: newStore30d,
      inputs: { window_days: 30, source: "stores.opened_at" },
    },
    {
      entityKind: "BRAND",
      entityId: brandId,
      metric: "NEW_STORE_COUNT_90D",
      date,
      value: newStore90d,
      inputs: { window_days: 90, source: "stores.opened_at" },
    },
  ];
}

export async function computeCityRawMetrics(
  prisma: PrismaClient,
  cityId: string,
  today: Date = new Date(),
): Promise<MetricRow[]> {
  const date = toDateOnly(today);
  const [activeStores, distinctBrands] = await Promise.all([
    computeCityActiveStoreCount(prisma, cityId),
    computeCityDistinctBrandCount(prisma, cityId),
  ]);

  return [
    {
      entityKind: "CITY",
      entityId: cityId,
      metric: "ACTIVE_STORE_COUNT",
      date,
      value: activeStores,
      inputs: { source: "stores.closed_at IS NULL AND status='published'" },
    },
    {
      entityKind: "CITY",
      entityId: cityId,
      metric: "DISTINCT_BRAND_COUNT",
      date,
      value: distinctBrands,
      inputs: { source: "stores distinct brand_id where closed_at IS NULL" },
    },
  ];
}

/**
 * 取某實體某指標的最新值（latest row by date desc）
 * Brand / City / Drink 頁顯示 trending_score 就靠這個
 */
export async function getLatestMetric(
  prisma: PrismaClient,
  entityKind: EntityKind,
  entityId: string,
  metric: Metric,
): Promise<{ value: number; date: Date; inputs?: unknown } | null> {
  const row = await prisma.metricDaily.findFirst({
    where: { entityKind, entityId, metric },
    orderBy: { date: "desc" },
  });
  if (!row) return null;
  return { value: Number(row.value), date: row.date, inputs: row.inputs ?? undefined };
}

/**
 * Leaderboard：某指標某天的 top N 實體
 * 城市頁「最熱品牌」、首頁「趨勢飲品」都靠這個
 */
export async function leaderboard(
  prisma: PrismaClient,
  entityKind: EntityKind,
  metric: Metric,
  date: Date,
  limit = 10,
): Promise<Array<{ entityId: string; value: number }>> {
  const rows = await prisma.metricDaily.findMany({
    where: { entityKind, metric, date: toDateOnly(date) },
    orderBy: { value: "desc" },
    take: limit,
    select: { entityId: true, value: true },
  });
  return rows.map((r) => ({ entityId: r.entityId, value: Number(r.value) }));
}
