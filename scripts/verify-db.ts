// 寫一筆 HealthCheck、讀回來、刪掉，驗證 Prisma Client + Supabase 連線健康
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const row = await prisma.healthCheck.create({
    data: { note: `verify-db ${new Date().toISOString()}` },
  });
  console.log("[create] OK", { id: row.id, note: row.note });

  const all = await prisma.healthCheck.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  console.log(`[read] ${all.length} row(s) in health_check`);
  for (const r of all) console.log(`   ${r.createdAt.toISOString()}  ${r.note}`);

  await prisma.healthCheck.delete({ where: { id: row.id } });
  console.log("[cleanup] OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
