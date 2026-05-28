/**
 * Phase 1.5 後 sanity check：印幾個關鍵 join，確認 seed 後資料能正常被查
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log("=== Sample queries ===\n");

  // 1. 品牌 + 招牌飲品（en locale）
  console.log("Brands and their signature drinks:");
  const brands = await prisma.brand.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { slug: "asc" },
    include: {
      brandDrinks: {
        where: { isSignature: true },
        include: { drink: true },
      },
    },
  });
  for (const b of brands) {
    const name = (b.nameI18n as Record<string, string>).en ?? b.slug;
    const sigs = b.brandDrinks
      .map((bd) => (bd.drink.nameI18n as Record<string, string>).en)
      .join(", ");
    console.log(`  ${name.padEnd(28)} → ${sigs || "(no signature set)"}`);
  }

  // 2. 城市的活躍品牌
  console.log("\nCity → active brands:");
  const cities = await prisma.city.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { slug: "asc" },
    include: {
      brandCities: {
        where: { status: "ACTIVE" },
        include: { brand: true },
      },
    },
  });
  for (const c of cities) {
    const name = (c.nameI18n as Record<string, string>).en ?? c.slug;
    const brandNames = c.brandCities
      .map((bc) => (bc.brand.nameI18n as Record<string, string>).en)
      .sort()
      .join(", ");
    console.log(`  ${name.padEnd(15)} → ${brandNames}`);
  }

  // 3. Tokyo top 5 drinks by popularity_score
  console.log("\nTokyo top drinks by popularity_score:");
  const tokyo = await prisma.city.findUnique({ where: { slug: "tokyo" } });
  if (tokyo) {
    const top = await prisma.drinkCity.findMany({
      where: { cityId: tokyo.id },
      orderBy: { popularityScore: "desc" },
      take: 5,
      include: { drink: true },
    });
    for (const row of top) {
      const name = (row.drink.nameI18n as Record<string, string>).en;
      console.log(`  ${(row.popularityScore ?? 0).toFixed(1).padStart(5)}  ${name}`);
    }
  }

  // 4. 近 30 天最常被新聞提及的品牌
  console.log("\nBrands by NEWS_COUNT_30D today:");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const ranks = await prisma.metricDaily.findMany({
    where: { entityKind: "BRAND", metric: "NEWS_COUNT_30D", date: today },
    orderBy: { value: "desc" },
    take: 10,
  });
  for (const r of ranks) {
    const b = await prisma.brand.findUnique({ where: { id: r.entityId } });
    const name = b ? (b.nameI18n as Record<string, string>).en : r.entityId.slice(0, 8);
    console.log(`  ${Number(r.value).toString().padStart(3)}  ${name}`);
  }

  // 5. 一篇新聞的完整 graph
  console.log("\nFull graph for one news article:");
  const featured = await prisma.news.findUnique({
    where: { slug: "chagee-flagship-los-angeles-2026" },
    include: {
      source: true,
      newsBrands: { include: { brand: true } },
      newsCities: { include: { city: true } },
      newsDrinks: { include: { drink: true } },
    },
  });
  if (featured) {
    const title = (featured.titleI18n as Record<string, string>).en;
    console.log(`  Title:    ${title}`);
    console.log(`  Source:   ${(featured.source.nameI18n as Record<string, string>).en}`);
    console.log(
      `  Brands:   ${featured.newsBrands.map((nb) => `${(nb.brand.nameI18n as Record<string, string>).en} [${nb.relevance}]`).join(", ")}`,
    );
    console.log(
      `  Cities:   ${featured.newsCities.map((nc) => `${(nc.city.nameI18n as Record<string, string>).en} [${nc.relevance}]`).join(", ")}`,
    );
    console.log(
      `  Drinks:   ${featured.newsDrinks.map((nd) => `${(nd.drink.nameI18n as Record<string, string>).en} [${nd.relevance}]`).join(", ") || "—"}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
