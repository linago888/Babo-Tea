# Global Boba Graph 網站詳細功能規格與 Prototype 說明

> **版本**：v1.3（2026-05-30）。對齊 Phase 5 已實作功能：完整 admin CRUD、AI 草稿生成、圖片上傳、metrics 儀表板、search log。
>
> **相關文件**：本檔聚焦在使用者體驗、頁面結構與功能模組。資料庫 schema、欄位、enum、關聯表、衍生指標公式請見 [`data-model.md`](data-model.md)。任一處的欄位定義不一致時，以 `data-model.md` 為準。

## 1. 產品定位

Global Boba Graph 是一個中文為主、可國際化擴充的全球珍珠奶茶知識與產業媒體平台。網站的第一階段重點不是一般部落格，而是將品牌、城市、飲品、新聞與趨勢建立成可搜尋、可關聯、可 SEO 索引的結構化資料系統。

核心價值：

- 幫一般讀者快速理解全球珍奶品牌、城市與飲品趨勢。
- 幫產業讀者追蹤品牌擴張、新品、加盟、市場變化。
- 透過結構化資料與內部連結，累積長期 SEO 流量。
- 為未來 AI 搜尋、推薦、趨勢分析與市場情報產品建立資料基礎。

## 2. 使用者角色

| 角色 | 需求 | 對應功能 |
| --- | --- | --- |
| 一般消費者 | 找城市珍奶、理解飲品、比較品牌 | 城市指南、飲品百科、品牌頁 |
| 產業觀察者 | 追蹤品牌擴張、新品與市場趨勢 | 新聞、趨勢、品牌關聯 |
| 加盟商 / 投資者 | 了解品牌規模、市場熱度與展店區域 | 品牌資料庫、城市成熟度、趨勢分數 |
| 編輯 / 營運 | 快速發布結構化內容 | CMS、資料欄位、關聯標籤 |
| 未來企業客戶 | 取得市場情報或 API | 報告、儀表板、資料 API |

## 3. MVP 導覽架構

第一階段主導覽：

- 首頁
- 品牌
- 城市
- 飲品
- 新聞
- 趨勢
- 搜尋
- 訂閱

建議 URL：

- `/`
- `/brands`
- `/brands/gong-cha`
- `/cities/tokyo`
- `/drinks/brown-sugar-milk-tea`
- `/news/chagee-expands-in-la`
- `/trends/matcha-milk-tea`
- `/search`

## 4. 首頁功能

首頁應該是資料平台入口，而不是單純品牌形象頁。

必要模組：

- 全站搜尋框：搜尋品牌、城市、飲品、新聞。
- 熱門資料總覽：品牌數、城市數、飲品數、新聞數。
- 最新新聞：顯示產業更新與品牌動態。
- 精選品牌：展示國際品牌與展店重點。
- 熱門城市：展示城市指南與平均價格。
- 趨勢飲品：展示熱門飲品與趨勢分數。
- 知識圖譜預覽：顯示品牌、城市、飲品、新聞之間的關聯。
- 訂閱 CTA：每週全球珍奶產業摘要。

## 5. 品牌模組

> 資料欄位、型別、enum 與關聯定義以 [`data-model.md`](data-model.md) §1.1 `brands`、§3 `companies` / `brand_company`、§8.1 `brand_drinks`、§8.2 `brand_cities`、§8.5 `brand_similarities` 為準。本節僅描述前台呈現。

### 品牌列表

顯示欄位：

- 品牌名稱（`name_i18n`）
- 國家 / 地區（`country_code` → 顯示名）
- 成立年份（`founded_year`）
- 門店數量（`store_count`，由 `stores` aggregate 快取）
- 主要市場（由 `brand_cities` 推導，取 top-N）
- 招牌飲品（`brand_drinks.is_signature = true`）
- 品牌定位（`positioning_tags`）
- 趨勢分數（`metrics_daily.trending_score` 最新值，計算見 data-model §7.2）

篩選：

- 國家（`country_code`）
- 品牌定位（`positioning_tags`，受控詞彙 `taxonomies.kind = positioning_tag`）
- 展店狀態（透過 `brand_cities.status` 篩 active）
- 價格帶（`price_tier`，enum）
- 經營模式（`business_model`，enum，取代原「是否有加盟」）

### 品牌詳情頁

內容區塊：

- 品牌摘要（`description_i18n` 短版 + 基本資料）
- 品牌故事（`description_i18n` 長版）
- 基本資料（成立年份、總部、母公司鏈，後者來自 `brand_company`）
- 全球市場分布（`brand_cities` + `stores` 數聚合）
- 招牌飲品（`brand_drinks.is_signature`）
- 相關城市（`brand_cities`，按 `store_count_cached` 排序）
- 相關新聞（`news_brands.relevance = primary | secondary`）
- 相似品牌（`brand_similarities`）
- SEO FAQ（`seo_i18n[locale].faq`）

## 6. 城市模組

> 資料欄位以 [`data-model.md`](data-model.md) §1.2 `cities`、§2 `stores`、§8.2 `brand_cities`、§8.4 `drink_cities` 為準。`market_maturity` 為衍生指標，計算見 data-model §7.2。

### 城市列表

顯示欄位：

- 城市（`name_i18n`）
- 國家（`country_code`）
- 平均價格（`avg_price_local` + `avg_price_currency`）
- 市場成熟度（`market_maturity`，enum：`emerging | growing | mature | saturated`）
- 熱門品牌（`brand_cities` join，依該城市 `store_count_cached` 排序）
- 熱門飲品（`drink_cities.popularity_score`）
- 最新新聞（`news_cities.relevance = primary` 最近 N 篇）

### 城市詳情頁

內容區塊：

- 城市珍奶市場概覽（`description_i18n`）
- 推薦品牌與店鋪（`stores` 取 `is_flagship` 優先，可在地圖呈現；要求 `cities.lat/lng` 與 `cities.timezone`）
- 平均價格區間（`avg_price_local` + `avg_price_currency`，依使用者 locale 可選顯示換算）
- 熱門飲品（`drink_cities` 並考慮 `seasonality` 當月權重）
- 本地文化洞察（`description_i18n` 長版）
- 近期新聞（`news_cities`）
- 相關品牌（`brand_cities`）
- SEO FAQ（`seo_i18n[locale].faq`）

建議 SEO 題型（依 locale 自動切換，從 `seo_i18n` 取值）：

- `zh-TW`：東京珍奶指南：熱門品牌、價格與在地趨勢
- `en`：Best Bubble Tea in Tokyo: Brands, Prices and Local Trends
- `ja`：東京タピオカガイド：人気ブランド・価格・最新トレンド

## 7. 飲品模組

> 資料欄位以 [`data-model.md`](data-model.md) §1.3 `drinks` 為準；屬性值（茶底、奶種、配料、甜味劑）走 §4 `taxonomies` 受控詞彙。原 spec 中的 `ingredients` 拆為結構化屬性，`flavor_profile` 改為 0-5 評分 jsonb。

### 飲品列表

顯示欄位：

- 飲品名稱（`name_i18n`）
- 類型（`category` enum）
- 茶底（`tea_base[]`，taxonomy code）
- 典型甜度（`typical_sugar_levels[]`：`0 | 30 | 50 | 70 | 100`）
- 熱量區間（`calories_kcal_min` - `calories_kcal_max`）
- 咖啡因區間（`caffeine_mg_min` - `caffeine_mg_max`）
- 趨勢分數（`metrics_daily.trending_score` 最新值）
- 代表品牌（`brand_drinks.is_signature = true` 取 top-N）

篩選（新增）：

- 茶底（`tea_base`）
- 奶種（`milk_type`）
- 配料（`toppings`，多選）
- 是否含咖啡因（`caffeine_mg_max = 0`）
- 溫度（`temperature[]`）

### 飲品詳情頁

內容區塊：

- 飲品介紹（`description_i18n`）
- 主要成分（`tea_base` + `milk_type` + `toppings` + `sweetener`，全部 join `taxonomies` 顯示 `label_i18n`）
- 口味輪廓（`flavor_profile` jsonb，前台可畫雷達圖：sweet / bitter / milky / fruity / floral / roasted 各 0-5）
- 常見變體（同 `category` 的相近 drinks）
- 熱量與咖啡因資訊（取本品牌精確值優先，否則顯示區間）
- 代表品牌（`brand_drinks` 並標 `is_signature`，顯示各品牌的 `local_name_i18n` 與 `price_local`）
- 熱門城市（`drink_cities.popularity_score`）
- 相關新聞（`news_drinks`）

## 8. 新聞模組

> 資料欄位以 [`data-model.md`](data-model.md) §1.4 `news`、§5 `sources`、§8.3 `news_brands` / `news_cities` / `news_drinks` 為準。新聞不是孤立文章，必須關聯品牌、城市、飲品與趨勢。

分類（`news.category` enum）：

| code | 對外標籤 |
|---|---|
| `expansion` | 品牌擴張 |
| `launch` | 新品上市 |
| `franchise-investment` | 加盟與投資 |
| `city-market` | 城市市場 |
| `trend` | 消費趨勢 |
| `supply-chain` | 供應鏈 |
| `culture` | 文化與生活 |

新聞詳情頁區塊：

- 標題（`title_i18n`）
- 摘要（`summary_i18n`，編輯撰寫的人類摘要）
- 正文（`body_i18n`，markdown）
- 來源（`source_id` → `sources` 實體，顯示來源名 + 信譽度 + 原文 URL `source_url`）
- 發布日期（`published_at`）
- 相關品牌 / 城市 / 飲品（`news_brands` / `news_cities` / `news_drinks`，依 `relevance = primary | secondary | mentioned` 分區呈現）
- AI 摘要（`ai_summary_i18n`，**僅當 `ai_summary_reviewed_by` 非 NULL 才公開顯示**；否則只在後台作編輯草稿）
- 編輯標籤（`editor_tags`）

### 8.1 AI 摘要審核流（新增）

1. ingest pipeline 寫入 `ai_summary_i18n` 但 `ai_summary_reviewed_by = NULL`。
2. 編輯在 CMS 看到「待審 AI 摘要」清單。
3. 編輯確認或修改後設 `ai_summary_reviewed_by = current_user`，前台才會顯示「AI 摘要」區塊並標註「已編輯審核」。
4. 公信力要求：未審 AI 摘要絕對不對外公開。

## 9. 搜尋與篩選

MVP：

- 關鍵字搜尋
- 類型篩選：全部 / 品牌 / 城市 / 飲品 / 新聞
- 即時結果更新

第二階段：

- Algolia
- 自動完成
- 同義詞
- 多語搜尋
- 搜尋分析

## 10. 知識圖譜功能

MVP 不需要做完整 graph database，但資料關聯必須先設計好。完整 schema、欄位、PK 與索引以 [`data-model.md`](data-model.md) §8 為準。

主要關聯：

| 語意關聯 | 對應表（data-model §8） | 關鍵欄位 |
|---|---|---|
| 品牌擁有飲品 | `brand_drinks` | `is_signature`、`local_name_i18n`、`price_local` |
| 品牌進入城市 | `brand_cities` | `entered_at`、`store_count_cached`、`status` |
| 品牌有實體店鋪 | `stores`（§2，新增） | `lat/lng`、`is_flagship`、`opened_at` |
| 品牌屬於集團 | `brand_company`（§3，新增） | `relation`、`since/until` |
| 城市流行飲品 | `drink_cities` | `popularity_score`、`seasonality` |
| 新聞提及品牌 / 城市 / 飲品 | `news_brands` / `news_cities` / `news_drinks` | `relevance`、`auto_tagged`、`confirmed_by_user_id` |
| 飲品形成趨勢 | `metrics_daily`（§7，新增） | 每日趨勢分數歷史 |
| 相似品牌 | `brand_similarities`（§8.5，新增） | `score`、`factors` |

所有關聯表的 `relevance / relation / factors` 等欄位日後可直接映射為 graph edge property（v2 遷移到 Neo4j / DGraph 不需重設計）。

## 11. 衍生指標（新增）

`trending_score`、`market_maturity`、`popularity_score` 等分數**不直接寫回主實體欄位**，改存 `metrics_daily` 歷史表並可重算可審計。完整公式、權重、缺值處理見 [`data-model.md`](data-model.md) §7。

摘要：

- `trending_score`（brand / city / drink，0-100）：對新聞量、新增店數、社群提及、搜尋量做 z-score 加權後套 sigmoid；加上 30 日成長率作 delta_factor。
- `market_maturity`（city，分桶 emerging / growing / mature / saturated）：依活躍店數、品牌多樣性、近 24 個月新增店數計分，再以全城市百分位分桶，每月 rebalance。
- `popularity_score`（drink × city）：由 `brand_drinks` × `stores` 數量 × 銷售訊號（新聞、社群）計算。

呈現原則：

- 前台只顯示**最新值**，但可在分數旁加「過去 8 週迷你曲線」（從 `metrics_daily` 取序列）。
- 投資方或品牌方質疑時，後台可展開 `metrics_daily.inputs` jsonb 給出原始輸入解釋。
- 公式調整不必回填欄位，重跑 cron 即可。

## 12. 後台架構（Phase 4-5 已上線）

### 12.1 入口與認證

- 路徑：`/admin`（**不含 locale prefix**，與公開站 `/[locale]/...` 平行）
- 認證：HTTP Basic Auth，env vars `ADMIN_USER` / `ADMIN_PASSWORD`，在 `proxy.ts` middleware 攔截 + 401 with `WWW-Authenticate`
- 多帳號 / RBAC：Phase 5C 規劃（v1 仍是單一帳號）
- Admin UI 語言：依 `NEXT_LOCALE` cookie（公開站切換語言會跟著切）

### 12.2 Admin 介面結構

- 左側固定 sidebar（≥ 640px）含 3 群組：Dashboard / Content / Quality
- 小螢幕 (< 640px) 改用上方漢堡按鈕 + 抽屜選單
- 主內容區置中 `max-w-6xl`，響應式 padding

### 12.3 已上線的 admin 模組

| 模組 | 路徑 | 功能 |
|---|---|---|
| 總覽 | `/admin` | 8 個磚卡（brands / cities / drinks / news / sources 即時筆數）+ Quality 卡片入口 |
| 品牌 | `/admin/brands` | list + 篩選（status）+ search；edit 表單 7 個 tabs |
| 城市 | `/admin/cities` | list + 篩選 + search；edit 表單（含 lat/lng/timezone/avg_price） |
| 飲品 | `/admin/drinks` | list + category/status 篩選；edit 表單（含 recipe + nutrition + flavor_profile JSON） |
| 新聞 | `/admin/news` | list + category/status 篩選；edit 表單 7 個 tabs |
| 來源 | `/admin/sources` | list + search；edit 表單（含 domain unique 檢查） |
| 詞彙 | `/admin/taxonomies` | list（按 kind 分組）+ search；edit 表單（kind+code unique，含 parent 階層） |
| 公司 | `/admin/companies` | list + search；edit 表單（slug / country / ticker / website） |
| 門市 | `/admin/stores` | list + search；edit 表單（brand + city FK + lat/lng + opening_hours JSON） |
| 內容品質 | `/admin/quality` | completeness_score 分佈、orphan 清單、AI 待審、review_due 清單 |
| 指標趨勢 | `/admin/metrics` | metrics_daily 視覺化（見 §13.2） |
| 搜尋紀錄 | `/admin/search-log` | search_log 分析（見 §13.3） |

### 12.4 編輯表單共通設計

- **多語 i18n tab**：每個 i18n 欄位（name / description / SEO 等）都有 4 個 locale 子分頁（en / zh-TW / zh-CN / ja）
- **儲存後 SSG 自動失效**：API route 呼叫 `revalidatePath("/[locale]/{entity}", "layout")`，公開頁立刻更新
- **完整度即時重算**：cities / drinks / news 任何欄位改完按儲存，`scoreXxx()` 立刻重算 0-100 寫回 DB
- **軟刪除**：「刪除」實為 `status = ARCHIVED`，公開站隱藏，編輯後台仍可看
- **錯誤顯示**：Zod 422 驗證錯誤、409 唯一性衝突、500 fallback 都顯示在表單頂

### 12.5 關聯資料編輯（Phase 5A）

**Brand 編輯頁** 多 3 個 tab：

| Tab | 動作 | 對應表 |
|---|---|---|
| 招牌飲品 | 下拉選飲品 → 加入；每行勾選「招牌」 | `brand_drinks` |
| 進駐城市 | 下拉選城市 → 加入；可設 `status` 與 `enteredAt` | `brand_cities` |
| 母公司 | 下拉選公司 → 加入；可設 `relation` 與 `since/until` | `brand_company` |

**News 編輯頁** 多 3 個 tab：

| Tab | 動作 | 對應表 |
|---|---|---|
| 相關品牌 | tag 多個品牌 + 各自 `relevance` | `news_brands` |
| 相關城市 | 同上 | `news_cities` |
| 相關飲品 | 同上 | `news_drinks` |

**寫入策略**：主表 + 關聯改動包在 `prisma.$transaction` 內，採 **delete-all + insert-all** — 簡單、可靠、不留 orphan。對 `brand_company`（複合 PK 含 `since`）特別重要，因為改 `since` 等於新行。

### 12.6 AI 草稿生成（Phase 5B，見 data-model §16）

每個編輯頁的對應 tab 多了 **✨ AI 補完** 按鈕：

| 模組 | AI 補完位置 |
|---|---|
| Brand | i18n description + SEO (title+desc) |
| City | i18n description + SEO |
| Drink | i18n description + SEO |
| News | i18n summary + body（完整 markdown 文章）+ SEO + advanced AI 摘要 |

按一次按鈕，4 個 locale 同時填好。每個 form 有自己的 `buildXxxContext()` 把當前 form 狀態序列化成 fact-list 給 LLM。

**Prompt 已內建 4 locale 語調**：en 中性 / zh-TW 台灣用詞 / zh-CN 大陸用詞 / ja 自然敬語。明確指示「不要編造數字、引言、店數」。

**需設 Vercel env var**：`OPENAI_API_KEY`。未設時按鈕仍顯示，按下去跳 503 提示。

### 12.7 圖片上傳（Phase 5B，見 data-model §15）

- Brand 的 `logoUrl` 與 News 的 `heroImageUrl` 改成 **URL + 拖檔上傳 + 預覽** 三合一元件
- URL 文字欄向後相容（編輯仍可貼外部連結）
- 📁 選檔按鈕 + 拖放區（直接拖圖到框內）
- 即時預覽縮圖
- 上傳到 Vercel Blob，回傳 public URL 自動填回

**需設 Vercel env var**：`BLOB_READ_WRITE_TOKEN`（Vercel Storage → Create Blob Store 自動注入）。

### 12.8 編輯檢查（發布前 gating）

由 `src/lib/content-quality/gating.ts` 的 Zod schema 強制：

- `slug` 唯一性（DB 層 `@unique` + API 409 衝突檢查）
- `seo_i18n[預設 locale].title` 與 `description` 填寫
- 至少一個關聯實體（news_brands ∪ news_cities ∪ news_drinks 任一）
- `summary_i18n` 填寫
- `source_id` 設定（新聞）
- `hero_image_url` 設定（新聞建議）
- 內部連結 ≥ 3 條（v2 補強，目前手動）
- JSON-LD 必填欄位齊全（依模板對應 schema.org type，由 `src/lib/metadata.ts` 統一產出）

## 13. 分析儀表板（Phase 5D 新增）

### 13.1 內容品質儀表板（`/admin/quality`）

前台不顯示，提供編輯團隊掌握資料健康度。

- 各實體 `completeness_score` 分佈（≥80 / 50-79 / <50 / 未評分 4 桶 × 4 entity = 16 個磚卡）
- 最低完整度前 5 名（每個 entity）
- `orphan = true` 清單（無任何關聯的孤兒資料）
- AI 摘要待審清單（`ai_summary_reviewed_at IS NULL`）
- `review_due_at` 已到期的實體
- 點任一筆名稱直接跳到 admin 編輯頁

### 13.2 指標趨勢儀表板（`/admin/metrics`）

直接用既有的 `metrics_daily`，4 個 Top 10 排行榜：

| 區塊 | metric | entity_kind |
|---|---|---|
| 熱度最高品牌 | `trending_score` | brand |
| 近 30 天新聞最多品牌 | `news_count_30d` | brand |
| 城市熱度榜 | `popularity_score` | city |
| 飲品流行度榜 | `popularity_score` | drink |

每一行：名次 + 名稱（連 admin 編輯頁）+ **30 天 SVG sparkline** + 當前值 + **Δ vs 7 天前**（↑↓ 帶顏色）。

查詢策略：兩段查 + app-side join — `DISTINCT ON (entity_id)` 拿每實體最新值 → 取 top N entity_ids → IN-query 拉 30 天序列 → `prisma.brand/city/drink.findMany` 補名稱。每個 metric 約 3 個 round-trip，索引 `(entity_kind, entity_id, metric, date DESC)` 上跑超快。

### 13.3 搜尋紀錄儀表板（`/admin/search-log`）

對應 data-model §14 search_log。

- **4 個磚卡**：7 天 / 30 天搜尋總數、7 天零結果次數、活躍語系數
- **30 天 daily volume sparkline**（含空白日對齊）
- **熱門關鍵字 Top 20**（近 7 天）：query × count × 平均命中數，紅色 bar
- **零結果關鍵字 Top 20**（近 30 天）：橘色 bar，編輯團隊看完就知道下一篇要寫什麼
- **語系分佈** + **國家分佈** 長條圖

UI 元件用自家 `<Sparkline>` 與 `<HBar>` 純 SVG 實作，不裝任何 chart library，bundle 不增加。

---

## 14. Prototype 內容（已凍結，搬到 `prototype/`）

歷史靜態互動原型：

- `prototype/index.html`：早期網站 prototype 入口
- `prototype/styles.css`：響應式介面樣式
- `prototype/app.js`：搜尋、篩選、詳情面板、圖譜高亮與 Canvas 視覺

> Phase 1 之後已用 Next.js + Tailwind 4 + i18n 重做整套，prototype/ 保留作早期構思參考，**未來不再更新**。

## 15. 30 天 MVP 任務拆解（已完成回顧）

> 詳細逐日建表順序見 [`data-model.md`](data-model.md) §17。

第 1 週：

- 建立 Next.js 專案
- 依 `data-model.md` 建立主表（brands、cities、drinks、news、sources、taxonomies）與關聯表
- 建立 stores、companies、brand_company、brand_similarities、metrics_daily（欄位先有，計算 job 可後上）
- 建立首頁、列表頁、詳情頁模板
- 建立 CMS schema（含 i18n 欄位、AI 摘要審核狀態、completeness_score view）

第 2 週：

- 完成品牌、城市、飲品模組
- 建立關聯資料（含 `relevance` / `is_signature` / `local_name_i18n`）
- 完成 SEO metadata 與多語 `seo_i18n`、hreflang
- 建立基本搜尋

第 3 週：

- 完成新聞模組（含 source 實體、AI 摘要審核流）
- 建立內容發布流程與 gating 檢查（見 §12）
- vertical slice：先 5 城市 × 10 品牌 × 15 飲品 × 10 新聞端到端可上線
- 再水平擴量至 50 品牌 / 20 城市 / 30 飲品 / 50 新聞

第 4 週：

- 效能與 SEO QA
- Google Search Console
- Analytics
- Sitemap（依實體分群）+ News sitemap + RSS
- 上線 Vercel

## 16. 後續成長功能

### 16.1 已完成（v1.3 對齊）

- ✅ AI 摘要 schema + 審核流（data-model §1.4 + §8.1） — News 編輯頁的 advanced tab + AI 草稿生成按鈕
- ✅ 基本搜尋（前台 `/search` + admin search log）
- ✅ trending_score / market_maturity / popularity_score 計算 job 上線（`pnpm metrics:run`）
- ✅ Metrics dashboard（§13.2）
- ✅ Companies / Stores / Sources / Taxonomies 完整 admin CRUD
- ✅ Brand / News 關聯編輯（§12.5）
- ✅ AI 草稿生成（§12.6）
- ✅ 圖片上傳 Vercel Blob（§12.7）

### 16.2 30-90 天規劃

- 多帳號 + RBAC（NextAuth + audit log）— v1 仍是單一 HTTP Basic
- 進階搜尋（Meilisearch / Typesense 自架）— 目前用 Postgres `ILIKE` jsonb path，撐到 ~ 5000 筆
- 每週電子報實作（目前只有 `/api/subscribe` stub）
- 城市市場比較頁（`/compare?a=tokyo&b=taipei`）
- 品牌認領（`brands.claimed_by_user_id` / `verified` — schema 已備）
- News crawler / RSS aggregator + AI 自動 tag

### 16.3 3-12 個月

- 全球珍奶地圖（`stores` × `cities.lat/lng`，Leaflet / Mapbox）
- AI 問答助手（以結構化資料為 RAG 來源）
- 加盟商情報（`brand_company` × `stores` × `metrics_daily`）
- 市場報告（自動產生 monthly PDF + 公開摘要）
- 企業資料 API（`slug` 與 UUID 雙鍵已備，加 API key + rate limit）
