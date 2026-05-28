/**
 * Day 7 — Content quality nightly job
 *
 * 對每個 published brand / city / drink / news 計算 completeness_score、
 * 更新 last_human_edit_at（無，跳過）、寫回 DB。
 *
 * 用法：
 *   pnpm quality:run                    # 算所有實體
 *   pnpm quality:run -- --dry-run       # 只列分數，不寫回
 *
 * 排程：之後接 Vercel Cron / GitHub Actions 每日跑一次。
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  scoreBrand,
  scoreCity,
  scoreDrink,
  scoreNews,
} from "../src/lib/content-quality/completeness";
import {
  detectOrphans,
  detectPendingAiSummaries,
  detectReviewDue,
} from "../src/lib/content-quality/orphan";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DRY_RUN = process.argv.includes("--dry-run");

interface BucketStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  below50: number;
}

function statsOf(scores: number[]): BucketStats {
  if (scores.length === 0) return { count: 0, min: 0, max: 0, avg: 0, below50: 0 };
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    count: scores.length,
    min,
    max,
    avg: Math.round(sum / scores.length),
    below50: scores.filter((s) => s < 50).length,
  };
}

async function main() {
  console.log(`[quality-job] start${DRY_RUN ? " (dry-run)" : ""}\n`);

  // ── Brands ─────────────────────────────────
  const brands = await prisma.brand.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      brandDrinks: { select: { isSignature: true } },
      brandCities: { select: { brandId: true }, where: { status: "ACTIVE" } },
      newsBrands: { select: { newsId: true } },
      brandCompanies: { select: { brandId: true } },
    },
  });
  const brandScores: number[] = [];
  for (const b of brands) {
    const { score, missing } = scoreBrand(b);
    brandScores.push(score);
    if (!DRY_RUN) {
      await prisma.brand.update({
        where: { id: b.id },
        data: { completenessScore: score },
      });
    }
    if (score < 50) {
      console.log(`  ✗ brand ${b.slug.padEnd(30)} ${score}/100  missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);
    }
  }
  console.log(`brands: ${JSON.stringify(statsOf(brandScores))}\n`);

  // ── Cities ─────────────────────────────────
  const cities = await prisma.city.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      brandCities: { select: { cityId: true }, where: { status: "ACTIVE" } },
      drinkCities: { select: { cityId: true } },
      newsCities: { select: { newsId: true } },
    },
  });
  const cityScores: number[] = [];
  for (const c of cities) {
    const { score, missing } = scoreCity(c);
    cityScores.push(score);
    if (!DRY_RUN) {
      await prisma.city.update({
        where: { id: c.id },
        data: { completenessScore: score },
      });
    }
    if (score < 50) {
      console.log(`  ✗ city ${c.slug.padEnd(30)} ${score}/100  missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);
    }
  }
  console.log(`cities: ${JSON.stringify(statsOf(cityScores))}\n`);

  // ── Drinks ─────────────────────────────────
  const drinks = await prisma.drink.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      brandDrinks: { select: { drinkId: true } },
      drinkCities: { select: { drinkId: true } },
      newsDrinks: { select: { newsId: true } },
    },
  });
  const drinkScores: number[] = [];
  for (const d of drinks) {
    const { score, missing } = scoreDrink(d);
    drinkScores.push(score);
    if (!DRY_RUN) {
      await prisma.drink.update({
        where: { id: d.id },
        data: { completenessScore: score },
      });
    }
    if (score < 50) {
      console.log(`  ✗ drink ${d.slug.padEnd(30)} ${score}/100  missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);
    }
  }
  console.log(`drinks: ${JSON.stringify(statsOf(drinkScores))}\n`);

  // ── News ───────────────────────────────────
  const newsRows = await prisma.news.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: {
      newsBrands: { select: { newsId: true } },
      newsCities: { select: { newsId: true } },
      newsDrinks: { select: { newsId: true } },
    },
  });
  const newsScores: number[] = [];
  for (const n of newsRows) {
    const { score, missing } = scoreNews(n);
    newsScores.push(score);
    if (!DRY_RUN) {
      await prisma.news.update({
        where: { id: n.id },
        data: { completenessScore: score },
      });
    }
    if (score < 50) {
      console.log(`  ✗ news ${n.slug.padEnd(40)} ${score}/100  missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`);
    }
  }
  console.log(`news: ${JSON.stringify(statsOf(newsScores))}\n`);

  // ── Orphans / review-due / AI pending ──────
  const [orphans, reviewDue, aiPending] = await Promise.all([
    detectOrphans(prisma),
    detectReviewDue(prisma),
    detectPendingAiSummaries(prisma),
  ]);

  const orphanTotal =
    orphans.brands.length +
    orphans.cities.length +
    orphans.drinks.length +
    orphans.news.length +
    orphans.sources.length;
  console.log(
    `orphans: ${orphanTotal} total  (${orphans.brands.length} brands, ${orphans.cities.length} cities, ${orphans.drinks.length} drinks, ${orphans.news.length} news, ${orphans.sources.length} sources)`,
  );
  if (orphans.brands.length) console.log(`  brands:  ${orphans.brands.map((o) => o.slug).join(", ")}`);
  if (orphans.cities.length) console.log(`  cities:  ${orphans.cities.map((o) => o.slug).join(", ")}`);
  if (orphans.drinks.length) console.log(`  drinks:  ${orphans.drinks.map((o) => o.slug).join(", ")}`);
  if (orphans.news.length) console.log(`  news:    ${orphans.news.map((o) => o.slug).join(", ")}`);
  if (orphans.sources.length) console.log(`  sources: ${orphans.sources.map((o) => o.slug).join(", ")}`);

  const reviewDueTotal =
    reviewDue.brands.length +
    reviewDue.cities.length +
    reviewDue.drinks.length +
    reviewDue.news.length;
  console.log(`\nreview_due: ${reviewDueTotal} total`);

  console.log(`ai-summary pending: ${aiPending.length}`);
}

main()
  .catch((e) => {
    console.error("quality-job failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
