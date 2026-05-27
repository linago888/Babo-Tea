/**
 * Payload CMS 設定骨架（Day 1 scaffold）
 *
 * 完整 collections 對應 data-model.md，將於 Phase 4（Day 15-21）逐步建立：
 *   - brands、cities、drinks、news、sources、taxonomies、stores、companies
 *   - 關聯：brand_drinks、brand_cities、news_*、drink_cities、brand_company、brand_similarities
 *   - i18n（zh-TW / zh-CN / en / ja，對應 data-model.md §6）
 *   - hooks：completeness_score、自動 revalidate、AI 摘要審核 gating
 *   - 自訂 admin views：待審 AI 摘要、孤兒實體、review_due_at
 *
 * 目前只放最小可載入設定，admin 路由在 Phase 4 才接上。
 */

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: "users",
    // disable: true, // Day 15 移除：開啟 admin UI
  },
  collections: [
    // Day 15 起逐步補上；最小可建構需要至少一個 user collection
    {
      slug: "users",
      auth: true,
      admin: { useAsTitle: "email" },
      fields: [],
    },
  ],
  editor: lexicalEditor(),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  secret: process.env.PAYLOAD_SECRET ?? "dev-secret-replace-me",
  typescript: {
    outputFile: path.resolve(dirname, "src/generated/payload-types.ts"),
  },
  localization: {
    locales: ["zh-TW", "zh-CN", "en", "ja"],
    defaultLocale: "zh-TW",
    fallback: true,
  },
});
