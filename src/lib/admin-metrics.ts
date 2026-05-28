/**
 * Phase 5D — /admin/metrics 用的查詢 helpers
 *
 * metrics_daily 已有資料（由 scripts/metrics-job.ts 寫入），
 * 這裡只負責高效查 "top N by latest value" + 對應的 30 天時間序列。
 *
 * 查詢策略（兩段查 + app-side join）：
 *   1. DISTINCT ON (entity_id) 拿每個 entity 在該 metric 的「最新值」
 *      在 metrics_daily 索引 (entity_kind, entity_id, metric, date DESC) 上跑超快
 *   2. 對 top N 個 entity 一次拉 30 天時間序列（IN 查詢，索引同上）
 *   3. 再用 prisma.brand/city/drink.findMany 補實體名稱
 */
import { prisma } from "@/lib/prisma";

export type MetricEntityKind = "brand" | "city" | "drink";

export interface TopEntityPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface TopEntity {
  id: string;
  slug: string;
  nameI18n: unknown;
  latest: number;
  previous: number | null; // 7 天前值（用於算 Δ）
  series: TopEntityPoint[]; // 30 天，由舊到新
}

const ENTITY_KIND_MAP: Record<
  MetricEntityKind,
  "brand" | "city" | "drink"
> = {
  brand: "brand",
  city: "city",
  drink: "drink",
};

export async function getTopByMetric(
  kind: MetricEntityKind,
  metric: string, // e.g. 'trending_score'
  options: { limit?: number; days?: number } = {},
): Promise<TopEntity[]> {
  const limit = options.limit ?? 8;
  const days = options.days ?? 30;

  // 1. 每個 entity 的最新值（DISTINCT ON 是 Postgres 神器）
  const latest = await prisma.$queryRaw<
    Array<{ entity_id: string; value: string; date: Date }>
  >`
    SELECT DISTINCT ON (entity_id) entity_id, value::text, date
    FROM metrics_daily
    WHERE entity_kind = ${kind}::metric_entity_kind
      AND metric = ${metric}::metric_kind
    ORDER BY entity_id, date DESC
  `;

  if (latest.length === 0) return [];

  // Top N
  const top = latest
    .map((r) => ({ entityId: r.entity_id, value: Number(r.value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const entityIds = top.map((t) => t.entityId);

  // 2. 30 天時間序列（一次查全部）
  const seriesRows = await prisma.$queryRaw<
    Array<{ entity_id: string; date: Date; value: string }>
  >`
    SELECT entity_id, date, value::text
    FROM metrics_daily
    WHERE entity_kind = ${kind}::metric_entity_kind
      AND metric = ${metric}::metric_kind
      AND entity_id = ANY(${entityIds}::uuid[])
      AND date >= CURRENT_DATE - (${days}::int) * INTERVAL '1 day'
    ORDER BY entity_id, date ASC
  `;

  // 3. 實體名稱
  const kindKey = ENTITY_KIND_MAP[kind];
  let entitiesById = new Map<string, { id: string; slug: string; nameI18n: unknown }>();
  if (kindKey === "brand") {
    const brands = await prisma.brand.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, slug: true, nameI18n: true },
    });
    entitiesById = new Map(brands.map((b) => [b.id, b]));
  } else if (kindKey === "city") {
    const cities = await prisma.city.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, slug: true, nameI18n: true },
    });
    entitiesById = new Map(cities.map((c) => [c.id, c]));
  } else {
    const drinks = await prisma.drink.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, slug: true, nameI18n: true },
    });
    entitiesById = new Map(drinks.map((d) => [d.id, d]));
  }

  // 4. 組裝
  const seriesByEntity = new Map<string, TopEntityPoint[]>();
  for (const row of seriesRows) {
    const key = row.date.toISOString().slice(0, 10);
    const arr = seriesByEntity.get(row.entity_id) ?? [];
    arr.push({ date: key, value: Number(row.value) });
    seriesByEntity.set(row.entity_id, arr);
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenAgoKey = sevenDaysAgo.toISOString().slice(0, 10);

  return top
    .map((t) => {
      const entity = entitiesById.get(t.entityId);
      if (!entity) return null;
      const series = seriesByEntity.get(t.entityId) ?? [];
      // 找 7 天前的值（最接近的）
      const previousRow = [...series]
        .reverse()
        .find((p) => p.date <= sevenAgoKey);
      return {
        id: entity.id,
        slug: entity.slug,
        nameI18n: entity.nameI18n,
        latest: t.value,
        previous: previousRow?.value ?? null,
        series,
      };
    })
    .filter((x): x is TopEntity => x !== null);
}
