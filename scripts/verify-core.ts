/**
 * Day 3 核心 schema 驗證
 *
 * 對 6 張新表各做一次 create → read → delete，確認：
 *   - DDL 已正確 apply 到 Supabase
 *   - Prisma Client 型別與資料庫一致
 *   - enum、jsonb、array、FK 都能正常運作
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function tag(label: string, ok: boolean, extra = "") {
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} ${label}${extra ? "  " + extra : ""}`);
}

async function main() {
  console.log("[1/6] taxonomies");
  const taxonomy = await prisma.taxonomy.create({
    data: {
      kind: "TEA_BASE",
      code: "_verify_green",
      labelI18n: { "zh-TW": "綠茶", en: "Green tea", ja: "緑茶" },
    },
  });
  tag("create", true, `id=${taxonomy.id.slice(0, 8)}`);
  const taxRead = await prisma.taxonomy.findUnique({ where: { id: taxonomy.id } });
  tag("read", taxRead?.code === "_verify_green");

  console.log("[2/6] sources");
  const source = await prisma.source.create({
    data: {
      slug: "_verify_source",
      nameI18n: { "zh-TW": "驗證來源", en: "Verify Source" },
      domain: "_verify.example.com",
      primaryLanguage: "en",
      kind: "MAINSTREAM_MEDIA",
      credibilityScore: 80,
    },
  });
  tag("create", true, `id=${source.id.slice(0, 8)}`);

  console.log("[3/6] cities");
  const city = await prisma.city.create({
    data: {
      slug: "_verify_tokyo",
      nameI18n: { "zh-TW": "東京", en: "Tokyo", ja: "東京" },
      countryCode: "JP",
      lat: "35.689500",
      lng: "139.691700",
      timezone: "Asia/Tokyo",
      avgPriceLocal: "650.00",
      avgPriceCurrency: "JPY",
      marketMaturity: "MATURE",
    },
  });
  tag("create", true, `id=${city.id.slice(0, 8)}`);

  console.log("[4/6] brands (含 FK → cities)");
  const brand = await prisma.brand.create({
    data: {
      slug: "_verify_brand",
      nameI18n: { "zh-TW": "驗證品牌", en: "Verify Brand" },
      countryCode: "TW",
      foundedYear: 2006,
      headquartersCityId: city.id,
      businessModel: "FRANCHISE",
      priceTier: "MID",
      positioningTags: ["fruit-tea", "instagrammable"],
      socialHandles: { instagram: "@verify", tiktok: "@verify" },
    },
  });
  tag("create", true, `id=${brand.id.slice(0, 8)}`);
  const brandWithCity = await prisma.brand.findUnique({
    where: { id: brand.id },
    include: { headquartersCity: true },
  });
  tag("FK lookup", brandWithCity?.headquartersCity?.slug === "_verify_tokyo");

  console.log("[5/6] drinks (含 enum array + jsonb flavor_profile)");
  const drink = await prisma.drink.create({
    data: {
      slug: "_verify_drink",
      nameI18n: { "zh-TW": "黑糖珍奶", en: "Brown Sugar Milk Tea" },
      category: "MILK_TEA",
      teaBase: ["black", "oolong"],
      milkType: "dairy",
      toppings: ["tapioca-pearl", "brown-sugar-jelly"],
      sweetener: "brown-sugar",
      temperature: ["ICED", "BLENDED"],
      typicalSugarLevels: [30, 50, 70],
      caloriesKcalMin: 280,
      caloriesKcalMax: 420,
      caffeineMgMin: 30,
      caffeineMgMax: 80,
      flavorProfile: { sweet: 4, bitter: 1, milky: 4, fruity: 0, floral: 0, roasted: 2 },
    },
  });
  tag("create", true, `id=${drink.id.slice(0, 8)}`);

  console.log("[6/6] news (含 FK → sources)");
  const news = await prisma.news.create({
    data: {
      slug: "_verify_news",
      titleI18n: { "zh-TW": "測試新聞" },
      summaryI18n: { "zh-TW": "測試摘要" },
      bodyI18n: { "zh-TW": "## 內文\n\n測試。" },
      category: "EXPANSION",
      sourceId: source.id,
      sourceUrl: "https://_verify.example.com/article",
      publishedAt: new Date(),
      editorTags: ["verify"],
    },
  });
  tag("create", true, `id=${news.id.slice(0, 8)}`);

  console.log("\nCleanup...");
  await prisma.news.delete({ where: { id: news.id } });
  await prisma.drink.delete({ where: { id: drink.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  await prisma.city.delete({ where: { id: city.id } });
  await prisma.source.delete({ where: { id: source.id } });
  await prisma.taxonomy.delete({ where: { id: taxonomy.id } });
  tag("All rows removed", true);

  // counts (should be 0 for tables we just emptied; HealthCheck table unaffected)
  console.log("\nFinal table counts:");
  console.log(`  taxonomies   ${await prisma.taxonomy.count()}`);
  console.log(`  sources      ${await prisma.source.count()}`);
  console.log(`  cities       ${await prisma.city.count()}`);
  console.log(`  brands       ${await prisma.brand.count()}`);
  console.log(`  drinks       ${await prisma.drink.count()}`);
  console.log(`  news         ${await prisma.news.count()}`);
}

main()
  .catch((e) => {
    console.error("\n❌ verify-core failed:", e.message);
    if (e.code) console.error("   code:", e.code);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
