# Global Boba Graph

全球珍珠奶茶品牌、城市、飲品與新聞的結構化資料平台。

線上版本：https://babo-tea.vercel.app/

## 目錄結構

```
.
├── src/
│   ├── app/
│   │   ├── [locale]/         # 公開站 i18n routes（en / zh-TW / zh-CN / ja）
│   │   ├── admin/            # 內部編輯後台（不含 locale prefix）
│   │   │   ├── brands/       # CRUD: list / new / [id]
│   │   │   ├── cities/
│   │   │   ├── drinks/
│   │   │   ├── news/
│   │   │   ├── sources/
│   │   │   ├── taxonomies/
│   │   │   ├── companies/    # Phase 5A
│   │   │   ├── stores/       # Phase 5A
│   │   │   ├── quality/      # 內容品質儀表板
│   │   │   ├── metrics/      # Phase 5D — metrics_daily 視覺化
│   │   │   └── search-log/   # Phase 5D — 搜尋紀錄分析
│   │   └── api/
│   │       ├── admin/        # 編輯後台 API（Zod gating + revalidate）
│   │       │   ├── ai/draft/ # Phase 5B — AI 草稿生成
│   │       │   └── upload/   # Phase 5B — Vercel Blob 圖片上傳
│   │       └── subscribe/    # 電子報 stub
│   ├── components/
│   │   ├── admin/            # admin 共用元件（sidebar / form / sparkline / ...）
│   │   └── ...               # 公開站元件
│   ├── i18n/                 # next-intl routing
│   ├── lib/                  # 共用 helper（prisma / search / metrics / completeness / ...）
│   ├── generated/prisma/     # Prisma client（postinstall 產生）
│   └── proxy.ts              # locale + admin auth middleware（Next 16 命名 proxy.ts）
├── prisma/                   # Prisma schema 與 seed
├── messages/                 # i18n message catalogs（4 個 locale）
├── public/                   # 靜態資源
├── scripts/                  # 維運腳本（verify-db / metrics:run / quality:run / seed）
├── sql/                      # 手動 baseline SQL（Supabase pooler 不能跑 migration engine）
│   ├── 001_init_healthcheck.sql
│   ├── 002_core_tables.sql
│   ├── 003_relations.sql
│   ├── 004_stores_companies.sql
│   ├── 005_metrics.sql
│   └── 006_search_log.sql    # Phase 5D
├── data-model.md             # 完整資料模型規格（schema 來源）
├── prototype-spec.md         # 網站功能與頁面規格
├── build_spec_docx.py        # docx 規格書產生器
└── prototype/                # 早期靜態 HTML/CSS/JS 原型（已凍結）
```

## 開發環境

| 工具 | 版本 |
|---|---|
| Node.js | 24.x（或 20.x） |
| pnpm | 11.3.0（由 `packageManager` 鎖定） |
| PostgreSQL | 16+（Supabase / Neon / 本機） |

## 環境變數

| 變數 | 必填 | 說明 |
|---|---|---|
| `DATABASE_URL` | ✓ | Supabase transaction pooler，port `6543`，含 `pgbouncer=true` |
| `DIRECT_URL` | ✓ | Direct connection（給 prisma generate 用） |
| `ADMIN_USER` | ✓ | `/admin` HTTP Basic Auth 帳號 |
| `ADMIN_PASSWORD` | ✓ | `/admin` HTTP Basic Auth 密碼 |
| `OPENAI_API_KEY` |  | Phase 5B AI 草稿生成；未設時按鈕跳 503，不影響其他功能 |
| `BLOB_READ_WRITE_TOKEN` |  | Phase 5B 圖片上傳（Vercel Storage → Create Blob Store 自動注入）；未設時 URL 手填仍可用 |

## 快速開始

```bash
cp .env.example .env.local   # 填入 DATABASE_URL 等
pnpm install                 # 會自動跑 prisma generate
pnpm dev                     # http://localhost:3000
```

預設導向 `/en`（國際市場優先），可切換 `/zh-TW`、`/zh-CN`、`/ja`。

## 維運腳本

```bash
pnpm verify:db            # DB 連線健康檢查
pnpm verify:core          # 核心 6 表存在性 + smoke test
pnpm verify:relations     # 關聯表 7 個 smoke test
pnpm verify:stores        # stores + companies smoke test
pnpm verify:metrics       # metrics_daily smoke test
pnpm verify:quality       # completeness scoring 驗證

pnpm seed                 # 跑 seed（idempotent upsert）
pnpm metrics:run          # 重算 metrics_daily（trending / popularity / counts）
pnpm quality:run          # 重算每個 entity 的 completeness_score + orphan
```

## Schema 流程

Supabase free tier 在 ap-southeast-2 的 direct connection 是 IPv6-only，session pooler 未開通；本機 + Vercel 都走 transaction pooler (6543)。Prisma migration engine 在 transaction-pooled 連線無法跑 prepared statements，因此目前流程：

1. 修改 `prisma/schema.prisma`
2. `pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output sql/NNN_xxx.sql`
3. 把 SQL 貼進 Supabase Dashboard → SQL Editor 跑
4. `pnpm prisma generate` 同步 Client 型別

升級到 Supabase Pro（或加 IPv4 add-on）後就能回到 `pnpm prisma migrate dev` 的自動化流程。

## 開發進度

| Phase | 狀態 | 內容 |
|---|---|---|
| 1 Day 1 | ✅ | Next.js 16 + TS + Tailwind 4 + Prisma 7 + next-intl scaffold |
| 1 Day 2 | ✅ | Supabase 連線、Prisma Client 端到端驗證、GitHub remote、Vercel 部署 |
| 1 Day 3-6 | ✅ | 6 張主表 + 7 張關聯表 + stores / companies + metrics_daily |
| 1.5 | ✅ | seed data + idempotent upsert + metrics 首次計算 |
| 2.1-2.7 | ✅ | 公開站 5 大模組（首頁 / brands / cities / drinks / news）+ BrandLogo |
| 2.8 | ✅ | 跨實體 search + `/search` 頁 |
| 3 | ✅ | sitemap 套件 × 4 + News sitemap + robots + RSS + 動態 OG image |
| 4 | ✅ | `/admin` HTTP Basic Auth + `/admin/quality` 編輯儀表板 |
| 4.5 | ✅ | admin i18n + brand CRUD + 響應式 sidebar + 漢堡選單 |
| 4.6 | ✅ | cities / drinks / news / sources / taxonomies CRUD |
| 5A | ✅ | Companies / Stores CRUD + Brand/News 關聯編輯 tabs |
| 5B | ✅ | AI 草稿生成（OpenAI gpt-4o-mini）+ Vercel Blob 圖片上傳 |
| 5C | 🚧 | NextAuth 多帳號 + RBAC + audit log（待規劃） |
| 5D | ✅ | Metrics dashboard + Search log 表與儀表板 |

## 文件

- [data-model.md](data-model.md) — 完整 schema、enum、衍生指標公式（v1.3）
- [prototype-spec.md](prototype-spec.md) — 功能、頁面、SEO 規格（v1.3）
- [prototype/](prototype/) — 早期 HTML/JS 原型（已凍結）
- [build_spec_docx.py](build_spec_docx.py) — docx 規格書產生器（v1.3）
