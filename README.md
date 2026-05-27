# Global Boba Graph

全球珍珠奶茶品牌、城市、飲品與新聞的結構化資料平台。

## 目錄結構

```
.
├── src/
│   ├── app/[locale]/        # i18n routes（zh-TW / zh-CN / en / ja）
│   ├── i18n/                # next-intl routing / request / navigation
│   ├── lib/                 # 共用 helper（prisma client 等）
│   └── proxy.ts             # locale middleware（Next 16 命名 proxy.ts）
├── prisma/                  # Prisma schema
├── messages/                # i18n message catalogs
├── public/                  # 靜態資源
├── scripts/                 # 一次性 / 維運腳本（verify-db、seed 等）
├── sql/                     # 手動 baseline SQL（Day 2 暫用）
├── payload.config.ts        # Payload CMS 設定（Phase 4 接 admin）
├── prisma.config.ts         # Prisma 7 設定（含 dotenv 載入）
├── data-model.md            # 完整資料模型規格（schema 來源）
├── prototype-spec.md        # 網站功能與頁面規格
├── build_spec_docx.py       # docx 規格書產生器
└── prototype/               # 早期靜態 HTML/CSS/JS 原型（已凍結）
```

## 開發環境

| 工具 | 版本 |
|---|---|
| Node.js | 24.x（或 20.x） |
| pnpm | 11.3.0（由 `packageManager` 鎖定） |
| PostgreSQL | 16+（Supabase / Neon / 本機） |

## 快速開始

```bash
cp .env.example .env.local   # 填入 DATABASE_URL 等
pnpm install                 # 會自動跑 prisma generate
pnpm dev                     # http://localhost:3000
```

預設導向 `/zh-TW`，可切換 `/zh-CN`、`/en`、`/ja`。

驗證 DB 連線：

```bash
pnpm verify:db
```

## 開發階段

依 `prototype-spec.md` §14 與 `data-model.md` §13：

- ✅ **Phase 1 Day 1**：Next.js 16 + TS + Tailwind 4 + Prisma 7 + Payload v3 + next-intl scaffold
- ✅ **Phase 1 Day 2**：Supabase 連線、Prisma Client 端到端驗證、GitHub remote、Vercel 部署
- 🚧 **Day 3-7**：依 `data-model.md` §1-§8 把 6 張主表 + 關聯表 + 補強表寫進 `prisma/schema.prisma`，並 seed vertical slice（5 城市 × 10 品牌 × 15 飲品 × 10 新聞）

## Schema 流程（Day 2 暫時方案）

Supabase free tier 在 ap-southeast-2 的 direct connection 是 IPv6-only，session pooler 未開通；本機 + Vercel 都走 transaction pooler (6543)。Prisma migration engine 在 transaction-pooled 連線無法跑 prepared statements，因此目前流程：

1. 修改 `prisma/schema.prisma`
2. `pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output sql/NNN_xxx.sql`
3. 把 SQL 貼進 Supabase Dashboard → SQL Editor 跑
4. `pnpm prisma generate` 同步 Client 型別

升級到 Supabase Pro（或加 IPv4 add-on）後就能回到 `pnpm prisma migrate dev` 的自動化流程。

## 文件

- [data-model.md](data-model.md) — 完整 schema、enum、衍生指標公式
- [prototype-spec.md](prototype-spec.md) — 功能、頁面、SEO 規格
- [prototype/](prototype/) — 早期 HTML/JS 原型（已凍結）
