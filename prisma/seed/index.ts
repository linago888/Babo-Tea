/**
 * Phase 1.5 seed runner
 *
 * 對應 prototype-spec.md §14 第 3 週 vertical slice：
 *   5 cities × 10 brands × 15 drinks × 10 news + 全關聯
 *
 * 設計：
 * - Idempotent：每張表都 upsert by slug / 複合鍵，重跑得到相同結果
 * - 關聯表先 delete by parent id，再插入，確保不堆疊
 * - 跑完輸出每張表的 count 供確認
 *
 * 用法：pnpm seed
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { brands as brandSeeds } from "./data/brands";
import { cities as citySeeds } from "./data/cities";
import { drinks as drinkSeeds } from "./data/drinks";
import { news as newsSeeds } from "./data/news";
import { sources as sourceSeeds } from "./data/sources";
import { taxonomies as taxonomySeeds } from "./data/taxonomies";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  console.log("=== Phase 1.5 seed start ===\n");

  // ── 1. Taxonomies ───────────────────────────
  console.log(`[1/8] taxonomies (${taxonomySeeds.length})`);
  for (const t of taxonomySeeds) {
    await prisma.taxonomy.upsert({
      where: { kind_code: { kind: t.kind, code: t.code } },
      update: { labelI18n: t.labelI18n as never },
      create: {
        kind: t.kind,
        code: t.code,
        labelI18n: t.labelI18n as never,
      },
    });
  }

  // ── 2. Cities ───────────────────────────────
  console.log(`[2/8] cities (${citySeeds.length})`);
  const cityIdBySlug = new Map<string, string>();
  for (const c of citySeeds) {
    const row = await prisma.city.upsert({
      where: { slug: c.slug },
      update: {
        nameI18n: c.nameI18n as never,
        countryCode: c.countryCode,
        adminRegion: c.adminRegion,
        lat: c.lat,
        lng: c.lng,
        timezone: c.timezone,
        population: c.population,
        avgPriceLocal: c.avgPriceLocal,
        avgPriceCurrency: c.avgPriceCurrency,
        marketMaturity: c.marketMaturity,
        descriptionI18n: c.descriptionI18n as never,
        status: "PUBLISHED",
      },
      create: {
        slug: c.slug,
        nameI18n: c.nameI18n as never,
        countryCode: c.countryCode,
        adminRegion: c.adminRegion,
        lat: c.lat,
        lng: c.lng,
        timezone: c.timezone,
        population: c.population,
        avgPriceLocal: c.avgPriceLocal,
        avgPriceCurrency: c.avgPriceCurrency,
        marketMaturity: c.marketMaturity,
        descriptionI18n: c.descriptionI18n as never,
        status: "PUBLISHED",
      },
    });
    cityIdBySlug.set(c.slug, row.id);
  }

  // ── 3. Brands ───────────────────────────────
  console.log(`[3/8] brands (${brandSeeds.length})`);
  const brandIdBySlug = new Map<string, string>();
  for (const b of brandSeeds) {
    const hqCityId = b.headquartersCitySlug
      ? cityIdBySlug.get(b.headquartersCitySlug) ?? null
      : null;
    const row = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {
        nameI18n: b.nameI18n as never,
        countryCode: b.countryCode,
        foundedYear: b.foundedYear,
        headquartersCityId: hqCityId,
        businessModel: b.businessModel,
        priceTier: b.priceTier,
        positioningTags: b.positioningTags,
        descriptionI18n: b.descriptionI18n as never,
        officialWebsite: b.officialWebsite,
        socialHandles: (b.socialHandles ?? null) as never,
        status: "PUBLISHED",
      },
      create: {
        slug: b.slug,
        nameI18n: b.nameI18n as never,
        countryCode: b.countryCode,
        foundedYear: b.foundedYear,
        headquartersCityId: hqCityId,
        businessModel: b.businessModel,
        priceTier: b.priceTier,
        positioningTags: b.positioningTags,
        descriptionI18n: b.descriptionI18n as never,
        officialWebsite: b.officialWebsite,
        socialHandles: (b.socialHandles ?? null) as never,
        status: "PUBLISHED",
      },
    });
    brandIdBySlug.set(b.slug, row.id);
  }

  // ── 4. Drinks ───────────────────────────────
  console.log(`[4/8] drinks (${drinkSeeds.length})`);
  const drinkIdBySlug = new Map<string, string>();
  for (const d of drinkSeeds) {
    const row = await prisma.drink.upsert({
      where: { slug: d.slug },
      update: {
        nameI18n: d.nameI18n as never,
        category: d.category,
        teaBase: d.teaBase,
        milkType: d.milkType,
        toppings: d.toppings,
        sweetener: d.sweetener,
        temperature: d.temperature,
        typicalSugarLevels: d.typicalSugarLevels,
        caloriesKcalMin: d.caloriesKcalMin,
        caloriesKcalMax: d.caloriesKcalMax,
        caffeineMgMin: d.caffeineMgMin,
        caffeineMgMax: d.caffeineMgMax,
        flavorProfile: d.flavorProfile as never,
        descriptionI18n: d.descriptionI18n as never,
        status: "PUBLISHED",
      },
      create: {
        slug: d.slug,
        nameI18n: d.nameI18n as never,
        category: d.category,
        teaBase: d.teaBase,
        milkType: d.milkType,
        toppings: d.toppings,
        sweetener: d.sweetener,
        temperature: d.temperature,
        typicalSugarLevels: d.typicalSugarLevels,
        caloriesKcalMin: d.caloriesKcalMin,
        caloriesKcalMax: d.caloriesKcalMax,
        caffeineMgMin: d.caffeineMgMin,
        caffeineMgMax: d.caffeineMgMax,
        flavorProfile: d.flavorProfile as never,
        descriptionI18n: d.descriptionI18n as never,
        status: "PUBLISHED",
      },
    });
    drinkIdBySlug.set(d.slug, row.id);
  }

  // ── 5. Sources ──────────────────────────────
  console.log(`[5/8] sources (${sourceSeeds.length})`);
  const sourceIdBySlug = new Map<string, string>();
  for (const s of sourceSeeds) {
    const row = await prisma.source.upsert({
      where: { slug: s.slug },
      update: {
        nameI18n: s.nameI18n as never,
        domain: s.domain,
        countryCode: s.countryCode,
        primaryLanguage: s.primaryLanguage,
        kind: s.kind,
        credibilityScore: s.credibilityScore,
        status: "PUBLISHED",
      },
      create: {
        slug: s.slug,
        nameI18n: s.nameI18n as never,
        domain: s.domain,
        countryCode: s.countryCode,
        primaryLanguage: s.primaryLanguage,
        kind: s.kind,
        credibilityScore: s.credibilityScore,
        status: "PUBLISHED",
      },
    });
    sourceIdBySlug.set(s.slug, row.id);
  }

  // ── 6. News + relations ─────────────────────
  console.log(`[6/8] news (${newsSeeds.length}) + relations`);
  const newsIdBySlug = new Map<string, string>();
  for (const n of newsSeeds) {
    const sourceId = sourceIdBySlug.get(n.sourceSlug);
    if (!sourceId) throw new Error(`Unknown source slug: ${n.sourceSlug}`);
    const row = await prisma.news.upsert({
      where: { slug: n.slug },
      update: {
        titleI18n: n.titleI18n as never,
        summaryI18n: n.summaryI18n as never,
        bodyI18n: n.bodyI18n as never,
        category: n.category,
        sourceId,
        sourceUrl: n.sourceUrl,
        publishedAt: daysAgo(n.publishedDaysAgo),
        status: "PUBLISHED",
      },
      create: {
        slug: n.slug,
        titleI18n: n.titleI18n as never,
        summaryI18n: n.summaryI18n as never,
        bodyI18n: n.bodyI18n as never,
        category: n.category,
        sourceId,
        sourceUrl: n.sourceUrl,
        publishedAt: daysAgo(n.publishedDaysAgo),
        status: "PUBLISHED",
      },
    });
    newsIdBySlug.set(n.slug, row.id);

    // 清舊關聯，重建
    await prisma.newsBrand.deleteMany({ where: { newsId: row.id } });
    await prisma.newsCity.deleteMany({ where: { newsId: row.id } });
    await prisma.newsDrink.deleteMany({ where: { newsId: row.id } });

    for (const rel of n.relatedBrands) {
      const brandId = brandIdBySlug.get(rel.slug);
      if (!brandId) throw new Error(`Unknown brand slug in news ${n.slug}: ${rel.slug}`);
      await prisma.newsBrand.create({
        data: { newsId: row.id, brandId, relevance: rel.relevance },
      });
    }
    for (const rel of n.relatedCities) {
      const cityId = cityIdBySlug.get(rel.slug);
      if (!cityId) throw new Error(`Unknown city slug in news ${n.slug}: ${rel.slug}`);
      await prisma.newsCity.create({
        data: { newsId: row.id, cityId, relevance: rel.relevance },
      });
    }
    for (const rel of n.relatedDrinks) {
      const drinkId = drinkIdBySlug.get(rel.slug);
      if (!drinkId) throw new Error(`Unknown drink slug in news ${n.slug}: ${rel.slug}`);
      await prisma.newsDrink.create({
        data: { newsId: row.id, drinkId, relevance: rel.relevance },
      });
    }
  }

  // ── 7. brand_drinks + brand_cities + drink_cities ──
  console.log(`[7/8] brand_drinks / brand_cities / drink_cities`);

  // 為了 demo：每個品牌挑 4-5 個 drink，1-2 個 signature
  // 規則：依品牌 slug 雜湊挑選，可重現
  const brandDrinkMap: Record<string, { drinks: string[]; signatures: string[] }> = {
    "gong-cha": { drinks: ["classic-pearl-milk-tea", "matcha-latte", "winter-melon-tea", "oolong-milk-tea"], signatures: ["classic-pearl-milk-tea"] },
    "chagee": { drinks: ["jasmine-milk-tea", "tieguanyin-milk-tea", "matcha-latte", "oolong-milk-tea"], signatures: ["tieguanyin-milk-tea"] },
    "coco-fresh-tea-juice": { drinks: ["classic-pearl-milk-tea", "passion-fruit-green-tea", "winter-melon-tea", "pudding-milk-tea"], signatures: ["classic-pearl-milk-tea"] },
    "the-alley": { drinks: ["brown-sugar-pearl-milk-tea", "matcha-latte", "fresh-milk-pearl-tea", "taro-milk-tea"], signatures: ["brown-sugar-pearl-milk-tea", "fresh-milk-pearl-tea"] },
    "tiger-sugar": { drinks: ["brown-sugar-pearl-milk-tea", "dirty-milk-tea", "fresh-milk-pearl-tea"], signatures: ["brown-sugar-pearl-milk-tea", "dirty-milk-tea"] },
    "sharetea": { drinks: ["classic-pearl-milk-tea", "mango-green-tea", "winter-melon-tea", "pudding-milk-tea"], signatures: ["mango-green-tea"] },
    "chatime": { drinks: ["classic-pearl-milk-tea", "oolong-milk-tea", "pudding-milk-tea", "passion-fruit-green-tea"], signatures: ["classic-pearl-milk-tea"] },
    "koi-the": { drinks: ["classic-pearl-milk-tea", "oolong-milk-tea", "tieguanyin-milk-tea", "fresh-milk-pearl-tea"], signatures: ["fresh-milk-pearl-tea"] },
    "happy-lemon": { drinks: ["cheese-foam-green-tea", "mango-green-tea", "passion-fruit-green-tea"], signatures: ["cheese-foam-green-tea"] },
    "yifang-fruit-tea": { drinks: ["winter-melon-tea", "passion-fruit-green-tea", "peach-oolong-tea", "mango-green-tea"], signatures: ["winter-melon-tea"] },
  };

  let bdCount = 0;
  let bcCount = 0;
  for (const b of brandSeeds) {
    const brandId = brandIdBySlug.get(b.slug)!;
    const mapping = brandDrinkMap[b.slug];

    // 清舊
    await prisma.brandDrink.deleteMany({ where: { brandId } });
    await prisma.brandCity.deleteMany({ where: { brandId } });

    // brand_drinks
    if (mapping) {
      for (const ds of mapping.drinks) {
        const drinkId = drinkIdBySlug.get(ds);
        if (!drinkId) continue;
        await prisma.brandDrink.create({
          data: {
            brandId,
            drinkId,
            isSignature: mapping.signatures.includes(ds),
            availableMarkets: b.mainCitySlugs
              .map((s) => citySeeds.find((c) => c.slug === s)?.countryCode)
              .filter((v): v is string => Boolean(v)),
          },
        });
        bdCount++;
      }
    }

    // brand_cities
    for (const citySlug of b.mainCitySlugs) {
      const cityId = cityIdBySlug.get(citySlug);
      if (!cityId) continue;
      await prisma.brandCity.create({
        data: {
          brandId,
          cityId,
          status: "ACTIVE",
          enteredAt: daysAgo(365 + Math.floor(Math.random() * 1000)),
          storeCountCached: 5 + Math.floor(Math.random() * 80),
        },
      });
      bcCount++;
    }
  }
  console.log(`         brand_drinks: ${bdCount}, brand_cities: ${bcCount}`);

  // drink_cities：每個 drink × 每個 city → popularity_score
  // 規則：基於 drink × city 的固定哈希 + 一些可解釋 bias
  // 例如 matcha-latte 在 tokyo 加分；brown-sugar 在 taipei 加分
  let dcCount = 0;
  for (const d of drinkSeeds) {
    const drinkId = drinkIdBySlug.get(d.slug)!;
    await prisma.drinkCity.deleteMany({ where: { drinkId } });
    for (const c of citySeeds) {
      const cityId = cityIdBySlug.get(c.slug)!;
      // 基礎分 + bias
      let score = 30 + (d.slug.charCodeAt(0) % 40);
      if (d.slug.includes("matcha") && c.slug === "tokyo") score += 30;
      if (d.slug.includes("brown-sugar") && c.slug === "taipei") score += 25;
      if (d.slug.includes("winter-melon") && c.slug === "taipei") score += 25;
      if (d.slug.includes("mango") && (c.slug === "los-angeles" || c.slug === "singapore")) score += 20;
      if (d.slug.includes("tieguanyin") && c.slug === "singapore") score += 20;
      if (d.slug.includes("cheese-foam") && c.slug === "los-angeles") score += 15;
      if (d.slug === "classic-pearl-milk-tea") score += 15; // 全球高分
      score = Math.min(100, score);
      await prisma.drinkCity.create({
        data: { drinkId, cityId, popularityScore: score },
      });
      dcCount++;
    }
  }
  console.log(`         drink_cities: ${dcCount}`);

  // ── 8. brand_similarities（衍生分數，先用啟發式） ──
  console.log(`[8/8] brand_similarities`);
  await prisma.brandSimilarity.deleteMany({});
  const similarityPairs: Array<{ a: string; b: string; score: number; factors: Record<string, number> }> = [
    { a: "gong-cha", b: "koi-the", score: 0.82, factors: { same_price_tier: 1, shared_drinks: 0.6, shared_cities: 0.7 } },
    { a: "chagee", b: "the-alley", score: 0.78, factors: { same_price_tier: 1, shared_drinks: 0.5, shared_cities: 0.4 } },
    { a: "tiger-sugar", b: "the-alley", score: 0.72, factors: { shared_drinks: 0.8, shared_cities: 0.6 } },
    { a: "chatime", b: "sharetea", score: 0.85, factors: { same_price_tier: 0.9, shared_drinks: 0.7, shared_cities: 0.5 } },
    { a: "yifang-fruit-tea", b: "happy-lemon", score: 0.68, factors: { same_positioning: 0.8, shared_drinks: 0.5 } },
    { a: "coco-fresh-tea-juice", b: "chatime", score: 0.74, factors: { same_price_tier: 1, shared_cities: 0.6 } },
  ];
  for (const p of similarityPairs) {
    const aId = brandIdBySlug.get(p.a);
    const bId = brandIdBySlug.get(p.b);
    if (!aId || !bId) continue;
    const [low, high] = [aId, bId].sort();
    await prisma.brandSimilarity.create({
      data: {
        brandAId: low,
        brandBId: high,
        score: p.score,
        factors: p.factors as never,
      },
    });
  }

  // ── Final report ────────────────────────────
  console.log("\n=== Done. Final table counts ===");
  for (const [name, fn] of [
    ["taxonomies", () => prisma.taxonomy.count()],
    ["cities", () => prisma.city.count()],
    ["brands", () => prisma.brand.count()],
    ["drinks", () => prisma.drink.count()],
    ["sources", () => prisma.source.count()],
    ["news", () => prisma.news.count()],
    ["brand_drinks", () => prisma.brandDrink.count()],
    ["brand_cities", () => prisma.brandCity.count()],
    ["news_brands", () => prisma.newsBrand.count()],
    ["news_cities", () => prisma.newsCity.count()],
    ["news_drinks", () => prisma.newsDrink.count()],
    ["drink_cities", () => prisma.drinkCity.count()],
    ["brand_similarities", () => prisma.brandSimilarity.count()],
  ] as const) {
    const n = await fn();
    console.log(`  ${name.padEnd(20)} ${n}`);
  }
}

main()
  .catch((e) => {
    console.error("seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
