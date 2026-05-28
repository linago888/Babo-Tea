// 快速健檢：每張表 count，不做 write，確認 schema 真的 apply 到 DB
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const start = Date.now();
  console.log("Connecting...");
  const tables = [
    ["health_check", () => prisma.healthCheck.count()],
    ["taxonomies", () => prisma.taxonomy.count()],
    ["sources", () => prisma.source.count()],
    ["cities", () => prisma.city.count()],
    ["brands", () => prisma.brand.count()],
    ["drinks", () => prisma.drink.count()],
    ["news", () => prisma.news.count()],
  ] as const;

  for (const [name, fn] of tables) {
    const t0 = Date.now();
    try {
      const n = await fn();
      console.log(`  ✓ ${name.padEnd(14)} ${n} rows  (${Date.now() - t0}ms)`);
    } catch (e: any) {
      console.log(`  ✗ ${name.padEnd(14)} ERROR  ${e.message?.slice(0, 80)}`);
    }
  }
  console.log(`Total: ${Date.now() - start}ms`);
}

main()
  .catch((e) => {
    console.error("fatal:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
