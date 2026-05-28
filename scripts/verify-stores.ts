/**
 * Day 5 stores + companies + brand_company 驗證
 *
 * 故事：
 *   Old Co (former owner) ──┐
 *                            ├── BrandCompany(time-series) ── Brand X
 *   New Group (current owner)┘                                  │
 *                                                               ├── Store #1 旗艦店 (Tokyo)
 *                                                               ├── Store #2 (Tokyo, 加盟)
 *                                                               └── Store #3 (Osaka)
 *
 * 驗證點：
 *   - Company / BrandCompany / Store CRUD
 *   - BrandCompany 時序：同一品牌可以有 former_owner（已 until）和 current owner（until = null）
 *   - Store 多個城市、旗艦標記、external_ids jsonb、opening_hours jsonb
 *   - bounding-box 查詢（用 lat/lng 範圍）
 *   - cascade delete 從 brand 一路刪到 stores、brand_company
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
  console.log("[setup] 建立 2 個 city（Tokyo、Osaka）+ 2 個 company + 1 個 brand");
  const tokyo = await prisma.city.create({
    data: {
      slug: "_verify_stores_tokyo",
      nameI18n: { en: "Tokyo", "zh-TW": "東京", ja: "東京" },
      countryCode: "JP",
      lat: "35.689500",
      lng: "139.691700",
      timezone: "Asia/Tokyo",
    },
  });
  const osaka = await prisma.city.create({
    data: {
      slug: "_verify_stores_osaka",
      nameI18n: { en: "Osaka", "zh-TW": "大阪", ja: "大阪" },
      countryCode: "JP",
      lat: "34.693700",
      lng: "135.502200",
      timezone: "Asia/Tokyo",
    },
  });

  const oldCo = await prisma.company.create({
    data: {
      slug: "_verify_old_co",
      nameI18n: { en: "Old Co", "zh-TW": "前任母公司" },
      countryCode: "TW",
      foundedYear: 1990,
    },
  });
  const newGroup = await prisma.company.create({
    data: {
      slug: "_verify_new_group",
      nameI18n: { en: "New Group", "zh-TW": "現任集團" },
      countryCode: "JP",
      foundedYear: 2015,
      stockTicker: "TYO:9999",
    },
  });

  const brand = await prisma.brand.create({
    data: {
      slug: "_verify_stores_brand",
      nameI18n: { en: "Tea Brand", "zh-TW": "茶品牌", ja: "ティーブランド" },
      countryCode: "JP",
      businessModel: "HYBRID",
      priceTier: "PREMIUM",
    },
  });
  tag("base entities created", true);

  console.log("[1/3] brand_company 時序歷史");
  await prisma.brandCompany.create({
    data: {
      brandId: brand.id,
      companyId: oldCo.id,
      relation: "FORMER_OWNER",
      since: new Date("2010-01-01"),
      until: new Date("2019-12-31"),
      notes: "Initial owner, sold to New Group end of 2019",
    },
  });
  await prisma.brandCompany.create({
    data: {
      brandId: brand.id,
      companyId: newGroup.id,
      relation: "OWNER",
      since: new Date("2020-01-01"),
      // until: null = current
    },
  });
  tag("two BrandCompany rows (former + current)", true);

  console.log("[2/3] stores — 3 家店：旗艦、加盟、外縣市");
  const flagship = await prisma.store.create({
    data: {
      brandId: brand.id,
      cityId: tokyo.id,
      nameI18n: { en: "Tea Brand Ginza Flagship", ja: "ティーブランド 銀座旗艦店" },
      addressI18n: {
        en: "1-1 Ginza, Chuo, Tokyo",
        ja: "東京都中央区銀座1-1",
      },
      lat: "35.671700",
      lng: "139.764200",
      phone: "+81-3-1234-5678",
      openingHours: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        opens: "10:00",
        closes: "22:00",
      },
      isFlagship: true,
      openedAt: new Date("2020-06-15"),
      franchise: false,
      externalIds: {
        google_place_id: "ChIJ_verify_ginza",
        yelp_id: "verify-ginza",
      },
      status: "PUBLISHED",
    },
  });
  const franchise = await prisma.store.create({
    data: {
      brandId: brand.id,
      cityId: tokyo.id,
      addressI18n: { en: "Shibuya Mark City, Shibuya, Tokyo", ja: "渋谷マークシティ" },
      lat: "35.659000",
      lng: "139.700000",
      isFlagship: false,
      franchise: true,
      openedAt: new Date("2022-03-01"),
      status: "PUBLISHED",
    },
  });
  const osakaStore = await prisma.store.create({
    data: {
      brandId: brand.id,
      cityId: osaka.id,
      addressI18n: { en: "1-1-1 Umeda, Kita, Osaka", ja: "大阪市北区梅田1-1-1" },
      lat: "34.703200",
      lng: "135.498100",
      openedAt: new Date("2023-08-10"),
      status: "PUBLISHED",
    },
  });
  tag("3 stores created", true, `flagship=${flagship.id.slice(0, 6)}, franchise, osaka`);

  console.log("[3/3] queries / joins");

  // 品牌全圖：含 stores、brand_company 歷史
  const brandFull = await prisma.brand.findUnique({
    where: { id: brand.id },
    include: {
      stores: { include: { city: true }, orderBy: { openedAt: "asc" } },
      brandCompanies: {
        include: { company: true },
        orderBy: { since: "asc" },
      },
    },
  });
  tag("brand has 3 stores", brandFull?.stores.length === 3);
  tag(
    "brand has 2 company relations (1 former + 1 current)",
    brandFull?.brandCompanies.length === 2,
  );
  tag(
    "current owner is New Group",
    brandFull?.brandCompanies.find((bc) => bc.until === null)?.company.slug ===
      "_verify_new_group",
  );

  // 城市頁查詢：Tokyo 有幾家店？哪家是旗艦？
  const tokyoStores = await prisma.store.findMany({
    where: { cityId: tokyo.id },
    include: { brand: true },
    orderBy: { isFlagship: "desc" },
  });
  tag("Tokyo has 2 stores", tokyoStores.length === 2);
  tag("first row is flagship", tokyoStores[0]?.isFlagship === true);

  // bounding-box 模擬：抓緯度 35.0-36.0 + 經度 139.0-140.0 內的店（覆蓋整個東京區）
  const inBBox = await prisma.store.findMany({
    where: {
      lat: { gte: "35.0", lte: "36.0" },
      lng: { gte: "139.0", lte: "140.0" },
    },
  });
  tag("bounding-box (Tokyo region) returns 2 stores", inBBox.length === 2);

  // external_ids jsonb 查詢示範
  const byPlaceId = await prisma.store.findFirst({
    where: { externalIds: { path: ["google_place_id"], equals: "ChIJ_verify_ginza" } },
  });
  tag("external_ids.google_place_id lookup works", byPlaceId?.id === flagship.id);

  console.log("\nCleanup（從 brand 刪→ stores、brand_company 全 cascade）");
  await prisma.brand.delete({ where: { id: brand.id } });
  const remainingStores = await prisma.store.count();
  const remainingBC = await prisma.brandCompany.count();
  tag(
    "stores & brand_company cascade-cleared from brand",
    remainingStores === 0 && remainingBC === 0,
  );

  await prisma.company.delete({ where: { id: oldCo.id } });
  await prisma.company.delete({ where: { id: newGroup.id } });
  await prisma.city.delete({ where: { id: tokyo.id } });
  await prisma.city.delete({ where: { id: osaka.id } });
  tag("companies & cities cleaned", true);

  console.log("\nFinal table counts:");
  for (const [name, fn] of [
    ["companies", () => prisma.company.count()],
    ["brand_company", () => prisma.brandCompany.count()],
    ["stores", () => prisma.store.count()],
  ] as const) {
    console.log(`  ${name.padEnd(15)} ${await fn()}`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ verify-stores failed:", e.message);
    if (e.code) console.error("   code:", e.code);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
