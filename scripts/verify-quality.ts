/**
 * Day 7 — content quality 計分 + 偵測 verify
 *
 * 用 in-memory mock data 驗證評分函式不需碰 DB，
 * 然後對真實 seed 資料跑一輪驗證計算與 DB 寫入。
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  scoreBrand,
  scoreCity,
  scoreDrink,
  scoreNews,
} from "../src/lib/content-quality/completeness";
import { validateBrandForPublish, validateNewsForPublish } from "../src/lib/content-quality/gating";
import { detectOrphans } from "../src/lib/content-quality/orphan";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function tag(label: string, ok: boolean, extra = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? "  " + extra : ""}`);
}

async function main() {
  console.log("[1/5] scoreBrand pure-function tests");
  const empty = scoreBrand({ nameI18n: null });
  tag(`empty brand → 0`, empty.score === 0);

  const minimal = scoreBrand({
    nameI18n: { en: "Test" },
    brandDrinks: [],
    brandCities: [],
  });
  tag(`only en name → ${minimal.score}/100 (low)`, minimal.score < 30);

  const rich = scoreBrand({
    nameI18n: { en: "T", "zh-TW": "T", "zh-CN": "T", ja: "T" },
    descriptionI18n: { en: "D", "zh-TW": "D", "zh-CN": "D", ja: "D" },
    foundedYear: 2010,
    headquartersCityId: "city-id",
    positioningTags: ["premium"],
    officialWebsite: "https://x.com",
    socialHandles: { instagram: "@x" },
    logoUrl: "https://x.com/logo.png",
    seoI18n: { en: { title: "T", description: "D" } },
    brandDrinks: [{ isSignature: true }],
    brandCities: [{}],
    newsBrands: [{}],
    brandCompanies: [{}],
  });
  tag(`fully filled → ${rich.score}/100 (should be 100)`, rich.score === 100);

  console.log("[2/5] scoreCity / scoreDrink / scoreNews mocks");
  const emptyCity = scoreCity({ nameI18n: null });
  tag(`empty city → ${emptyCity.score}`, emptyCity.score === 0);
  const emptyDrink = scoreDrink({ nameI18n: null });
  tag(`empty drink → ${emptyDrink.score}`, emptyDrink.score === 0);
  const emptyNews = scoreNews({ titleI18n: null, summaryI18n: null, bodyI18n: null });
  tag(`empty news → ${emptyNews.score}`, emptyNews.score === 0);

  console.log("[3/5] gating validation");
  const badBrand = validateBrandForPublish({ slug: "ok" });
  tag(`brand without required fields rejected`, !badBrand.success, `(${badBrand.errors.length} errors)`);

  const goodBrand = validateBrandForPublish({
    slug: "x",
    nameI18n: { en: "X", "zh-TW": "X" },
    countryCode: "TW",
    businessModel: "FRANCHISE",
    priceTier: "MID",
    seoI18n: { en: { title: "T", description: "D" } },
  });
  tag(`brand with all required → ok`, goodBrand.success);

  const newsNoRelation = validateNewsForPublish({
    slug: "n",
    titleI18n: { en: "T" },
    summaryI18n: { en: "S" },
    bodyI18n: { en: "B" },
    category: "TREND",
    sourceId: "00000000-0000-0000-0000-000000000000",
    sourceUrl: "https://x.com",
    publishedAt: new Date(),
    relationCount: 0,
    seoI18n: { en: { title: "T", description: "D" } },
  });
  tag(
    `news with 0 relations rejected`,
    !newsNoRelation.success && newsNoRelation.errors.some((e) => e.path === "relationCount"),
  );

  console.log("[4/5] seed data scoring (real Prisma)");
  const realBrands = await prisma.brand.findMany({
    where: { status: "PUBLISHED" },
    include: {
      brandDrinks: { select: { isSignature: true } },
      brandCities: { select: { brandId: true } },
      newsBrands: { select: { newsId: true } },
      brandCompanies: { select: { brandId: true } },
    },
    take: 3,
  });
  for (const b of realBrands) {
    const { score, missing } = scoreBrand(b);
    console.log(`    ${b.slug.padEnd(28)} ${score}/100`);
    if (missing.length) console.log(`      gaps: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);
  }
  tag(`seed brand scoring runs`, realBrands.length > 0);

  console.log("[5/5] orphan detection on seed");
  const orphans = await detectOrphans(prisma);
  const total =
    orphans.brands.length +
    orphans.cities.length +
    orphans.drinks.length +
    orphans.news.length +
    orphans.sources.length;
  console.log(`    ${total} orphan(s) found`);
  if (total > 0) {
    if (orphans.brands.length) console.log(`    brands: ${orphans.brands.map((o) => o.slug).join(", ")}`);
    if (orphans.drinks.length) console.log(`    drinks: ${orphans.drinks.map((o) => o.slug).join(", ")}`);
    if (orphans.news.length) console.log(`    news: ${orphans.news.map((o) => o.slug).join(", ")}`);
  }
  tag(`orphan detector runs`, true);
}

main()
  .catch((e) => {
    console.error("verify-quality failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
