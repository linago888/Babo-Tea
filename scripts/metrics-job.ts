/**
 * Day 6：metrics daily job 骨架
 *
 * 對所有 published brand / city 各跑一遍 raw input 計算，寫進 metrics_daily。
 * 之後接 Vercel Cron / GitHub Actions 排程每日跑一次。
 *
 * 用法：
 *   pnpm metrics:run              # 跑當下日期
 *   pnpm metrics:run -- --backfill 2026-01-15   # 補算某一天
 *
 * 注意：本 job 只算 raw inputs（news_count_30d、new_store_count_30d、
 * active_store_count、distinct_brand_count 等）。衍生分數
 * （trending_score、market_maturity、popularity_score）目前資料量
 * 不足，暫不啟動；公式見 data-model.md §7.2，欄位 schema 已備。
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  computeBrandRawMetrics,
  computeCityRawMetrics,
  upsertMetric,
} from "../src/lib/metrics/compute";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function parseDate(): Date {
  const idx = process.argv.indexOf("--backfill");
  if (idx >= 0 && process.argv[idx + 1]) {
    const d = new Date(process.argv[idx + 1]);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

async function main() {
  const today = parseDate();
  console.log(`[metrics-job] computing for ${today.toISOString().slice(0, 10)}`);

  const brands = await prisma.brand.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true },
  });
  const cities = await prisma.city.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true },
  });

  console.log(`  ${brands.length} brand(s), ${cities.length} city(ies)`);

  let written = 0;

  for (const b of brands) {
    const rows = await computeBrandRawMetrics(prisma, b.id, today);
    for (const r of rows) {
      await upsertMetric(prisma, r);
      written++;
    }
  }

  for (const c of cities) {
    const rows = await computeCityRawMetrics(prisma, c.id, today);
    for (const r of rows) {
      await upsertMetric(prisma, r);
      written++;
    }
  }

  console.log(`[metrics-job] wrote ${written} rows`);
}

main()
  .catch((e) => {
    console.error("metrics-job failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
