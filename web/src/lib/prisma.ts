/**
 * Prisma Client 工廠
 *
 * Prisma 7 改用 driver adapter — 必須帶 pg adapter。
 * 用 globalThis 快取，避免 Next.js dev mode HMR 每次重啟都開新連線池。
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

function buildClient() {
  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.DATABASE_URL },
      // Supabase pooler TLS：跳過 cert 驗證（Supabase 用自簽 / 中介鏈，本機常無）
      { schema: "public" },
    ),
    // log: ["query", "warn", "error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof buildClient>;
};

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
