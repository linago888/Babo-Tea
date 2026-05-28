/**
 * Day 6 metrics_daily 驗證
 *
 * 1. 建一個有「最近新聞」「最近新開店」的品牌 + 一個城市
 * 2. 跑 compute → upsert，確認 raw input 數字正確
 * 3. 同一天再跑一次：upsert 應覆蓋而不重複
 * 4. getLatestMetric 抓最近值
 * 5. leaderboard 排序正確
 * 6. polymorphic 驗證：刪 brand 後 metrics_daily 不會 cascade（要 app 層清）
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  computeBrandRawMetrics,
  computeCityRawMetrics,
  daysAgo,
  getLatestMetric,
  leaderboard,
  toDateOnly,
  upsertMetric,
} from "../src/lib/metrics/compute";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function tag(label: string, ok: boolean, extra = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? "  " + extra : ""}`);
}

async function main() {
  const today = new Date();

  console.log("[setup] 建品牌 + 城市 + 來源 + 2 篇新聞（近 30d 內）+ 1 家新店");
  const source = await prisma.source.create({
    data: {
      slug: "_verify_metrics_source",
      nameI18n: { en: "Verify Source" },
      domain: "_verify-m.example.com",
      primaryLanguage: "en",
      kind: "MAINSTREAM_MEDIA",
    },
  });
  const city = await prisma.city.create({
    data: {
      slug: "_verify_metrics_city",
      nameI18n: { en: "Verify City" },
      countryCode: "TW",
      lat: "25.0",
      lng: "121.5",
      timezone: "Asia/Taipei",
      status: "PUBLISHED",
    },
  });
  const brand = await prisma.brand.create({
    data: {
      slug: "_verify_metrics_brand",
      nameI18n: { en: "Verify Brand" },
      countryCode: "TW",
      businessModel: "DIRECT",
      priceTier: "MID",
      status: "PUBLISHED",
    },
  });
  // 一篇近 5 天前的新聞、一篇 60 天前的新聞（30d window 內只該算到 1 篇）
  const recentNews = await prisma.news.create({
    data: {
      slug: "_verify_recent",
      titleI18n: { en: "Recent" },
      summaryI18n: { en: "S" },
      bodyI18n: { en: "B" },
      category: "EXPANSION",
      sourceId: source.id,
      sourceUrl: "https://_verify-m.example.com/r",
      publishedAt: daysAgo(5, today),
    },
  });
  const oldNews = await prisma.news.create({
    data: {
      slug: "_verify_old",
      titleI18n: { en: "Old" },
      summaryI18n: { en: "S" },
      bodyI18n: { en: "B" },
      category: "EXPANSION",
      sourceId: source.id,
      sourceUrl: "https://_verify-m.example.com/o",
      publishedAt: daysAgo(60, today),
    },
  });
  await prisma.newsBrand.create({
    data: { newsId: recentNews.id, brandId: brand.id, relevance: "PRIMARY" },
  });
  await prisma.newsBrand.create({
    data: { newsId: oldNews.id, brandId: brand.id, relevance: "PRIMARY" },
  });
  // 一家新開店（10d 前），一家舊店（200d 前）
  await prisma.store.create({
    data: {
      brandId: brand.id,
      cityId: city.id,
      addressI18n: { en: "Addr A" },
      lat: "25.01",
      lng: "121.51",
      openedAt: daysAgo(10, today),
      status: "PUBLISHED",
    },
  });
  await prisma.store.create({
    data: {
      brandId: brand.id,
      cityId: city.id,
      addressI18n: { en: "Addr B" },
      lat: "25.02",
      lng: "121.52",
      openedAt: daysAgo(200, today),
      status: "PUBLISHED",
    },
  });
  tag("setup ok", true, "2 news (1 in 30d), 2 stores (1 in 30d)");

  console.log("[1/5] computeBrandRawMetrics → 數字正確？");
  const brandRows = await computeBrandRawMetrics(prisma, brand.id, today);
  const news30d = brandRows.find((r) => r.metric === "NEWS_COUNT_30D")?.value;
  const store30d = brandRows.find((r) => r.metric === "NEW_STORE_COUNT_30D")?.value;
  const store90d = brandRows.find((r) => r.metric === "NEW_STORE_COUNT_90D")?.value;
  tag(`NEWS_COUNT_30D = 1`, news30d === 1, `got ${news30d}`);
  tag(`NEW_STORE_COUNT_30D = 1`, store30d === 1, `got ${store30d}`);
  tag(`NEW_STORE_COUNT_90D = 1`, store90d === 1, `got ${store90d}`);

  console.log("[2/5] upsert 寫入 + getLatestMetric 抓回");
  for (const r of brandRows) await upsertMetric(prisma, r);
  const latest = await getLatestMetric(prisma, "BRAND", brand.id, "NEWS_COUNT_30D");
  tag(`latest NEWS_COUNT_30D = 1`, latest?.value === 1, `${JSON.stringify(latest)}`);

  console.log("[3/5] 同一天再 upsert → 應覆蓋而非新增（PK 保護）");
  await upsertMetric(prisma, {
    entityKind: "BRAND",
    entityId: brand.id,
    metric: "NEWS_COUNT_30D",
    date: toDateOnly(today),
    value: 99, // 故意丟錯誤值
  });
  const afterOverride = await getLatestMetric(prisma, "BRAND", brand.id, "NEWS_COUNT_30D");
  tag(`upsert 覆蓋成功，value=99`, afterOverride?.value === 99);
  // 還原
  for (const r of brandRows) await upsertMetric(prisma, r);

  console.log("[4/5] City raw metrics + leaderboard");
  const cityRows = await computeCityRawMetrics(prisma, city.id, today);
  for (const r of cityRows) await upsertMetric(prisma, r);
  const active = cityRows.find((r) => r.metric === "ACTIVE_STORE_COUNT")?.value;
  const distinct = cityRows.find((r) => r.metric === "DISTINCT_BRAND_COUNT")?.value;
  tag(`ACTIVE_STORE_COUNT = 2`, active === 2, `got ${active}`);
  tag(`DISTINCT_BRAND_COUNT = 1`, distinct === 1, `got ${distinct}`);

  const board = await leaderboard(prisma, "BRAND", "NEWS_COUNT_30D", today, 5);
  tag(`leaderboard 有此品牌`, board.some((r) => r.entityId === brand.id));

  console.log("[5/5] polymorphic 設計：刪 brand → metrics_daily 留著（無 cascade）");
  const beforeDelete = await prisma.metricDaily.count({
    where: { entityKind: "BRAND", entityId: brand.id },
  });
  // 必須先刪掉 newsBrands / stores（有 FK），再刪 brand
  await prisma.newsBrand.deleteMany({ where: { brandId: brand.id } });
  await prisma.store.deleteMany({ where: { brandId: brand.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  const afterDelete = await prisma.metricDaily.count({
    where: { entityKind: "BRAND", entityId: brand.id },
  });
  tag(
    `polymorphic：brand 刪除後 metrics_daily 仍有 ${beforeDelete} 筆殘留（無 cascade）`,
    afterDelete === beforeDelete && beforeDelete > 0,
  );

  console.log("\nCleanup（手動清殘留 metrics + 其他）");
  await prisma.metricDaily.deleteMany({
    where: { OR: [{ entityId: brand.id }, { entityId: city.id }] },
  });
  await prisma.news.delete({ where: { id: recentNews.id } });
  await prisma.news.delete({ where: { id: oldNews.id } });
  await prisma.city.delete({ where: { id: city.id } });
  await prisma.source.delete({ where: { id: source.id } });
  tag("cleanup done", true);

  console.log("\nFinal metrics_daily count:", await prisma.metricDaily.count());
}

main()
  .catch((e) => {
    console.error("\n❌ verify-metrics failed:", e.message);
    if (e.code) console.error("   code:", e.code);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
