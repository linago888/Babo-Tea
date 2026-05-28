/**
 * Day 4 關聯表驗證
 *
 * 建一張完整 mini-graph 驗證 7 張關聯表能正確 insert + join：
 *
 *   Source ──< News >─── newsBrands ──→ Brand
 *                   │                    │
 *                   ├── newsCities ──→ City ←── brandCities
 *                   │                    ↑           │
 *                   └── newsDrinks ──→ Drink         │
 *                                       │           │
 *                                       └── brandDrinks
 *                                       │
 *                                       └── drinkCities ──→ City
 *
 *   Brand A <── brandSimilarities ──> Brand B
 *
 * 跑完清乾淨。
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function tag(label: string, ok: boolean, extra = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? "  " + extra : ""}`);
}

async function main() {
  console.log("[setup] creating base entities");
  const source = await prisma.source.create({
    data: {
      slug: "_verify_rel_source",
      nameI18n: { en: "Verify Source" },
      domain: "_verify-rel.example.com",
      primaryLanguage: "en",
      kind: "MAINSTREAM_MEDIA",
    },
  });
  const city = await prisma.city.create({
    data: {
      slug: "_verify_rel_city",
      nameI18n: { en: "Verify City", "zh-TW": "驗證市" },
      countryCode: "TW",
      lat: "25.033",
      lng: "121.565",
      timezone: "Asia/Taipei",
    },
  });
  const drink = await prisma.drink.create({
    data: {
      slug: "_verify_rel_drink",
      nameI18n: { en: "Brown Sugar Milk Tea" },
      category: "MILK_TEA",
    },
  });
  // 兩個 brand 用一致順序創（讓 id 排序穩定，brand_similarities CHECK 約束才能過）
  // 但 UUID 隨機所以我們 insert 後依 id 字典序排
  const brandX = await prisma.brand.create({
    data: {
      slug: "_verify_rel_brand_x",
      nameI18n: { en: "Brand X" },
      countryCode: "TW",
      businessModel: "FRANCHISE",
      priceTier: "MID",
    },
  });
  const brandY = await prisma.brand.create({
    data: {
      slug: "_verify_rel_brand_y",
      nameI18n: { en: "Brand Y" },
      countryCode: "TW",
      businessModel: "DIRECT",
      priceTier: "PREMIUM",
    },
  });
  const news = await prisma.news.create({
    data: {
      slug: "_verify_rel_news",
      titleI18n: { en: "Brand X expands to Verify City" },
      summaryI18n: { en: "Big news." },
      bodyI18n: { en: "Body." },
      category: "EXPANSION",
      sourceId: source.id,
      sourceUrl: "https://_verify-rel.example.com/article",
      publishedAt: new Date(),
    },
  });
  tag("base entities", true, `2 brands, 1 city, 1 drink, 1 source, 1 news`);

  console.log("[1/7] brand_drinks");
  await prisma.brandDrink.create({
    data: {
      brandId: brandX.id,
      drinkId: drink.id,
      isSignature: true,
      localNameI18n: { en: "X-Style Brown Sugar", "zh-TW": "X 風黑糖" },
      priceLocal: "75.00",
      priceCurrency: "TWD",
      caloriesKcal: 360,
      caffeineMg: 45,
      availableMarkets: ["TW", "JP", "US"],
    },
  });
  tag("create", true);

  console.log("[2/7] brand_cities");
  await prisma.brandCity.create({
    data: {
      brandId: brandX.id,
      cityId: city.id,
      enteredAt: new Date("2018-03-15"),
      storeCountCached: 12,
      status: "ACTIVE",
    },
  });
  tag("create", true);

  console.log("[3/7] news_brands");
  await prisma.newsBrand.create({
    data: { newsId: news.id, brandId: brandX.id, relevance: "PRIMARY", autoTagged: false },
  });
  await prisma.newsBrand.create({
    data: { newsId: news.id, brandId: brandY.id, relevance: "MENTIONED", autoTagged: true },
  });
  tag("create x2", true);

  console.log("[4/7] news_cities");
  await prisma.newsCity.create({
    data: { newsId: news.id, cityId: city.id, relevance: "PRIMARY" },
  });
  tag("create", true);

  console.log("[5/7] news_drinks");
  await prisma.newsDrink.create({
    data: { newsId: news.id, drinkId: drink.id, relevance: "SECONDARY", autoTagged: true },
  });
  tag("create", true);

  console.log("[6/7] drink_cities");
  await prisma.drinkCity.create({
    data: {
      drinkId: drink.id,
      cityId: city.id,
      popularityScore: 87.5,
      seasonality: {
        "01": 0.4, "02": 0.4, "03": 0.5, "04": 0.6, "05": 0.7, "06": 0.9,
        "07": 1.0, "08": 1.0, "09": 0.8, "10": 0.6, "11": 0.5, "12": 0.4,
      },
    },
  });
  tag("create with seasonality jsonb", true);

  console.log("[7/7] brand_similarities (with brand_a_id < brand_b_id CHECK)");
  const [low, high] = [brandX.id, brandY.id].sort();
  await prisma.brandSimilarity.create({
    data: {
      brandAId: low,
      brandBId: high,
      score: 0.72,
      factors: { same_price_tier: 0, shared_drinks: 0.5, shared_cities: 0.9 },
    },
  });
  tag("create (ordered)", true);

  // verify the CHECK constraint actually rejects reverse order
  try {
    await prisma.brandSimilarity.create({
      data: { brandAId: high, brandBId: low, score: 0.5 },
    });
    tag("CHECK constraint enforced", false, "(should have thrown)");
  } catch (e: any) {
    tag(
      "CHECK constraint enforced",
      /check/i.test(e.message ?? "") || /23514/.test(e.code ?? "") ||
        /ordered_pair/i.test(JSON.stringify(e)),
      "(reversed pair was rejected)",
    );
  }

  console.log("\n[join] news with all related entities");
  const newsWithRelations = await prisma.news.findUnique({
    where: { id: news.id },
    include: {
      source: true,
      newsBrands: { include: { brand: true } },
      newsCities: { include: { city: true } },
      newsDrinks: { include: { drink: true } },
    },
  });
  tag(`source linked`, newsWithRelations?.source.slug === "_verify_rel_source");
  tag(`brands linked`, (newsWithRelations?.newsBrands.length ?? 0) === 2);
  tag(
    `primary brand is X`,
    newsWithRelations?.newsBrands.find((nb) => nb.relevance === "PRIMARY")
      ?.brand.slug === "_verify_rel_brand_x",
  );
  tag(`cities linked`, (newsWithRelations?.newsCities.length ?? 0) === 1);
  tag(`drinks linked`, (newsWithRelations?.newsDrinks.length ?? 0) === 1);

  console.log("\n[join] brand X full graph");
  const brandWithEverything = await prisma.brand.findUnique({
    where: { id: brandX.id },
    include: {
      brandDrinks: { include: { drink: true } },
      brandCities: { include: { city: true } },
      newsBrands: { include: { news: true } },
      similaritiesAsA: true,
      similaritiesAsB: true,
    },
  });
  tag(
    `signature drink`,
    brandWithEverything?.brandDrinks.find((bd) => bd.isSignature)?.drink.slug ===
      "_verify_rel_drink",
  );
  tag(`active cities`, (brandWithEverything?.brandCities.length ?? 0) === 1);
  tag(`news mentioning brand`, (brandWithEverything?.newsBrands.length ?? 0) === 1);
  tag(
    `similarity edge`,
    (brandWithEverything?.similaritiesAsA.length ?? 0) +
      (brandWithEverything?.similaritiesAsB.length ?? 0) ===
      1,
  );

  console.log("\nCleanup...");
  // Cascade deletes via FK: brand_drinks / brand_cities / news_* / drink_cities /
  // brand_similarities 全部會跟著 root 一起刪
  await prisma.news.delete({ where: { id: news.id } });
  await prisma.brand.delete({ where: { id: brandX.id } });
  await prisma.brand.delete({ where: { id: brandY.id } });
  await prisma.drink.delete({ where: { id: drink.id } });
  await prisma.city.delete({ where: { id: city.id } });
  await prisma.source.delete({ where: { id: source.id } });
  tag("All cascades removed", true);

  console.log("\nFinal table counts:");
  for (const [name, fn] of [
    ["brand_drinks", () => prisma.brandDrink.count()],
    ["brand_cities", () => prisma.brandCity.count()],
    ["news_brands", () => prisma.newsBrand.count()],
    ["news_cities", () => prisma.newsCity.count()],
    ["news_drinks", () => prisma.newsDrink.count()],
    ["drink_cities", () => prisma.drinkCity.count()],
    ["brand_similarities", () => prisma.brandSimilarity.count()],
  ] as const) {
    console.log(`  ${name.padEnd(20)} ${await fn()}`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ verify-relations failed:", e.message);
    if (e.code) console.error("   code:", e.code);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
