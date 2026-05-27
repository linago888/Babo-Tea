# Global Boba Graph

全球珍珠奶茶品牌、城市、飲品與新聞的結構化資料平台。

## 目錄結構

```
.
├── web/                     # Next.js 16 應用（Phase 1 起的主程式）
│   ├── src/
│   │   ├── app/[locale]/    # i18n routes（zh-TW / zh-CN / en / ja）
│   │   ├── i18n/            # next-intl routing / request / navigation
│   │   └── proxy.ts         # locale middleware（Next 16 命名 proxy.ts）
│   ├── prisma/              # Prisma schema（Day 3 起填入完整 model）
│   ├── messages/            # i18n message catalogs
│   ├── payload.config.ts    # Payload CMS 設定骨架（Phase 4 接 admin）
│   └── prisma.config.ts     # Prisma 7 設定（含 dotenv 載入）
├── prototype/               # 靜態 HTML/JS/CSS 原型（已凍結，僅供參考）
├── data-model.md            # 完整資料模型規格（schema 來源）
├── prototype-spec.md        # 網站功能與頁面規格
├── build_spec_docx.py       # docx 規格書產生器
└── Global Boba Graph 網站詳細功能規格書.docx  # 對外規格書
```

## 開發環境

| 工具 | 版本 |
|---|---|
| Node.js | 24.x |
| pnpm | 11.x |
| PostgreSQL | 16+（Supabase / Neon / 本機） |

## 快速開始

```bash
cd web
cp .env.example .env.local   # 填入 DATABASE_URL 等
pnpm install
pnpm prisma generate
pnpm dev                     # http://localhost:3000
```

預設導向 `/zh-TW`，可切換 `/zh-CN`、`/en`、`/ja`。

## 開發階段

依 `prototype-spec.md` §14 與 `data-model.md` §13，已完成 **Phase 1 Day 1**：

- ✅ Next.js 16 + TypeScript + Tailwind 4 scaffold
- ✅ Prisma 7 設定（schema、prisma.config.ts、dotenv）
- ✅ Payload v3 設定骨架（admin 於 Phase 4 啟用）
- ✅ next-intl i18n routing（4 locales）+ proxy middleware
- ✅ GitHub Actions CI（typecheck、lint、build）

下一步（Day 3-7）：依 `data-model.md` §1-§8 把 6 張主表 + 關聯表 + 補強表寫進 `prisma/schema.prisma`，並 seed vertical slice（5 城市 × 10 品牌 × 15 飲品 × 10 新聞）。

## 文件

- [data-model.md](data-model.md) — 完整 schema、enum、衍生指標公式
- [prototype-spec.md](prototype-spec.md) — 功能、頁面、SEO 規格
- [prototype/](prototype/) — 早期 HTML/JS 原型（已凍結）
