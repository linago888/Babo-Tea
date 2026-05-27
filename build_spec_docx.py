import sys

from docx import Document
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

sys.path.append(
    r"C:\Users\ASUS\.codex\plugins\cache\openai-primary-runtime\documents\26.430.10722\skills\documents\scripts"
)
from table_geometry import apply_table_geometry, column_widths_from_weights, section_content_width_dxa


OUT = "Global Boba Graph 網站詳細功能規格書.docx"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_text(cell, text, bold=False):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.name = "Arial"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
    run.font.size = Pt(10)


def add_table(document, headers, rows, widths=None):
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, header in enumerate(headers):
        set_cell_text(hdr[i], header, bold=True)
        set_cell_shading(hdr[i], "E9E2D7")
        hdr[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            set_cell_text(cells[i], str(value))
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
    content_width = section_content_width_dxa(document.sections[-1])
    column_widths = column_widths_from_weights(widths or [1] * len(headers), content_width)
    apply_table_geometry(table, column_widths, table_width_dxa=content_width, indent_dxa=0)
    document.add_paragraph()
    return table


def add_bullets(document, items):
    for item in items:
        paragraph = document.add_paragraph(style="List Bullet")
        paragraph.add_run(item)


def add_numbered(document, items):
    for item in items:
        paragraph = document.add_paragraph(style="List Number")
        paragraph.add_run(item)


def add_heading(document, text, level=1):
    paragraph = document.add_heading(text, level=level)
    for run in paragraph.runs:
        run.font.name = "Arial"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
    return paragraph


def add_para(document, text):
    paragraph = document.add_paragraph()
    paragraph.add_run(text)
    return paragraph


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.75)
section.bottom_margin = Inches(0.75)
section.left_margin = Inches(0.82)
section.right_margin = Inches(0.82)

styles = doc.styles
styles["Normal"].font.name = "Arial"
styles["Normal"]._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
styles["Normal"].font.size = Pt(10.5)

for style_name, size in [("Title", 24), ("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 11)]:
    style = styles[style_name]
    style.font.name = "Arial"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Microsoft JhengHei")
    style.font.size = Pt(size)
    style.font.bold = True

title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("Global Boba Graph\n網站詳細功能規格書")
run.font.color.rgb = RGBColor(32, 32, 32)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle.add_run("全球珍珠奶茶知識與產業媒體平台 MVP Prototype 規劃").italic = True

meta = doc.add_table(rows=5, cols=2)
meta.style = "Table Grid"
meta.alignment = WD_TABLE_ALIGNMENT.CENTER
for left, right, row in [
    ("文件目的", "將網站功能、資訊架構、資料模型與 prototype 規劃整理成可執行規格", 0),
    ("產品定位", "全球珍珠奶茶品牌、城市、飲品、新聞與趨勢的結構化資料平台", 1),
    ("適用階段", "MVP 0-30 天與後續 30-90 天成長規劃", 2),
    ("文件版本", "v1.1（對齊 data-model.md）", 3),
    ("輸出日期", "2026-05-27", 4),
]:
    set_cell_text(meta.rows[row].cells[0], left, bold=True)
    set_cell_text(meta.rows[row].cells[1], right)
    set_cell_shading(meta.rows[row].cells[0], "E9E2D7")
meta_width = section_content_width_dxa(doc.sections[-1])
apply_table_geometry(
    meta,
    column_widths_from_weights([1.2, 4.8], meta_width),
    table_width_dxa=meta_width,
    indent_dxa=0,
)

doc.add_page_break()

add_heading(doc, "1. 產品定位", 1)
add_para(doc, "Global Boba Graph 是一個中文為主、可國際化擴充的全球珍珠奶茶知識與產業媒體平台。第一階段重點不是一般部落格，而是將品牌、城市、飲品、新聞與趨勢建立成可搜尋、可關聯、可 SEO 索引的結構化資料系統。")
add_bullets(doc, [
    "幫一般讀者快速理解全球珍奶品牌、城市與飲品趨勢。",
    "幫產業讀者追蹤品牌擴張、新品、加盟與市場變化。",
    "透過結構化資料與內部連結累積長期 SEO 流量。",
    "為未來 AI 搜尋、推薦、趨勢分析與市場情報產品建立資料基礎。",
])
add_para(doc, "文件分工：本檔聚焦在使用者體驗、頁面結構與功能模組；完整資料庫 schema、欄位、enum、關聯表與衍生指標公式請見 data-model.md。任一處的欄位定義不一致時，以 data-model.md 為準。")

add_heading(doc, "2. 使用者角色與需求", 1)
add_table(doc, ["角色", "核心需求", "對應功能"], [
    ["一般消費者", "找城市珍奶、理解飲品、比較品牌", "城市指南、飲品百科、品牌頁"],
    ["產業觀察者", "追蹤品牌擴張、新品與市場趨勢", "新聞、趨勢、品牌關聯"],
    ["加盟商 / 投資者", "了解品牌規模、市場熱度與展店區域", "品牌資料庫、城市成熟度、趨勢分數"],
    ["編輯 / 營運", "快速發布結構化內容", "CMS、資料欄位、關聯標籤"],
    ["企業客戶", "取得市場情報或 API", "報告、儀表板、資料 API"],
], widths=[1.35, 2.25, 2.55])

add_heading(doc, "3. MVP 網站導覽架構", 1)
add_para(doc, "第一階段主導覽建議如下：")
add_bullets(doc, ["首頁", "品牌", "城市", "飲品", "新聞", "趨勢", "搜尋", "訂閱"])
add_table(doc, ["頁面", "建議 URL", "主要目的"], [
    ["首頁", "/", "資料平台入口、搜尋、最新內容與核心模組總覽"],
    ["品牌列表", "/brands", "搜尋與篩選全球珍奶品牌"],
    ["品牌詳情", "/brands/gong-cha", "品牌故事、基本資料、相關城市、招牌飲品與新聞"],
    ["城市詳情", "/cities/tokyo", "城市珍奶指南、平均價格、熱門品牌與本地洞察"],
    ["飲品詳情", "/drinks/brown-sugar-milk-tea", "飲品百科、熱量、咖啡因、代表品牌與趨勢"],
    ["新聞詳情", "/news/chagee-expands-in-la", "產業新聞、來源、摘要與關聯資料"],
    ["搜尋", "/search", "跨品牌、城市、飲品與新聞的搜尋入口"],
], widths=[1.2, 2.1, 3.0])

add_heading(doc, "4. 首頁功能規格", 1)
add_table(doc, ["模組", "功能說明", "MVP 優先級"], [
    ["主視覺與定位", "清楚傳達平台是全球珍奶知識與產業資料庫，而非一般部落格", "高"],
    ["全站搜尋", "可搜尋品牌、城市、飲品與新聞", "高"],
    ["平台指標", "顯示品牌數、城市數、飲品數、新聞數與索引頁面數", "中"],
    ["最新新聞", "展示產業更新、品牌擴張與新品資訊", "高"],
    ["精選品牌", "展示重點品牌與其招牌飲品、主要市場", "高"],
    ["熱門城市", "展示城市指南、平均價格與市場成熟度", "高"],
    ["趨勢飲品", "展示熱門飲品、趨勢分數與關聯品牌", "中"],
    ["知識圖譜預覽", "顯示品牌、城市、飲品、新聞之間的關聯", "中"],
    ["訂閱 CTA", "收集電子報訂閱名單", "中"],
], widths=[1.45, 3.9, 0.85])

add_heading(doc, "5. 核心功能模組", 1)
add_para(doc, "本章描述各模組的前台呈現與資料來源；完整欄位、enum 與關聯表請見 data-model.md 對應章節。")

add_heading(doc, "5.1 品牌模組", 2)
add_para(doc, "品牌頁是 SEO 與資料價值核心，應可支撐品牌比較、產業分析與未來加盟情報。對應 data-model.md §1.1 brands、§3 companies / brand_company、§8.1 brand_drinks、§8.2 brand_cities、§8.5 brand_similarities。")
add_table(doc, ["功能", "內容"], [
    ["品牌列表", "品牌名稱、國家、成立年份、門店數量（由 stores 聚合）、主要市場、招牌飲品、品牌定位、趨勢分數（衍生）"],
    ["篩選條件", "國家、品牌定位（taxonomy）、展店狀態（brand_cities.status）、價格帶（price_tier enum）、經營模式（business_model: direct | franchise | hybrid | licensed）"],
    ["品牌詳情", "品牌摘要、品牌故事、基本資料、母公司鏈（brand_company）、全球市場分布、招牌飲品、相關城市、相關新聞、相似品牌、SEO FAQ（多語）"],
    ["關鍵欄位", "slug、name_i18n、country_code、founded_year、headquarters_city_id、business_model、price_tier、positioning_tags、social_handles、description_i18n、seo_i18n、claimed_by_user_id、verified"],
], widths=[1.35, 4.8])

add_heading(doc, "5.2 城市模組", 2)
add_para(doc, "對應 data-model.md §1.2 cities、§2 stores、§8.2 brand_cities、§8.4 drink_cities。market_maturity 為衍生指標，計算見 §7.2。")
add_table(doc, ["功能", "內容"], [
    ["城市列表", "城市、國家、平均價格（avg_price_local + currency）、市場成熟度（衍生）、熱門品牌、熱門飲品、最新新聞"],
    ["城市詳情", "城市珍奶市場概覽、推薦品牌與店鋪（stores，可上地圖）、平均價格區間、熱門飲品（含季節權重）、本地文化洞察、近期新聞、相關品牌、SEO FAQ"],
    ["關鍵欄位", "slug、name_i18n、country_code、admin_region、lat、lng、timezone、population、avg_price_local、avg_price_currency、market_maturity、description_i18n、seo_i18n"],
    ["SEO 題型", "依 locale 自動切換：東京珍奶指南：熱門品牌、價格與在地趨勢；Best Bubble Tea in Tokyo: Brands, Prices and Local Trends；東京タピオカガイド：人気ブランド・価格・最新トレンド"],
], widths=[1.35, 4.8])

add_heading(doc, "5.3 飲品模組", 2)
add_para(doc, "對應 data-model.md §1.3 drinks，飲品屬性走 §4 taxonomies 受控詞彙（tea_base / milk_type / topping / sweetener / flavor_tag / positioning_tag）。")
add_table(doc, ["功能", "內容"], [
    ["飲品列表", "飲品名稱、類型（category）、茶底、典型甜度、熱量區間、咖啡因區間、趨勢分數（衍生）、代表品牌"],
    ["篩選條件", "茶底、奶種、配料（多選）、是否含咖啡因、溫度、品類"],
    ["飲品詳情", "飲品介紹、主要成分（拆 tea_base / milk_type / toppings / sweetener，皆查 taxonomies 取多語標籤）、口味輪廓（雷達圖：sweet / bitter / milky / fruity / floral / roasted 各 0-5）、常見變體、熱量與咖啡因、代表品牌（含 local_name_i18n 與 price_local）、熱門城市、相關新聞"],
    ["關鍵欄位", "slug、name_i18n、category、tea_base[]、milk_type、toppings[]、sweetener、temperature[]、typical_sugar_levels[]、calories_kcal_min/max、caffeine_mg_min/max、flavor_profile jsonb"],
], widths=[1.35, 4.8])

add_heading(doc, "5.4 新聞模組", 2)
add_para(doc, "新聞不是孤立文章，必須關聯品牌、城市、飲品與趨勢。對應 data-model.md §1.4 news、§5 sources、§8.3 news_brands / news_cities / news_drinks。")
add_table(doc, ["新聞分類（code）", "對外標籤", "說明"], [
    ["expansion", "品牌擴張", "海外展店、加盟、通路與品牌策略"],
    ["launch", "新品上市", "新飲品、季節限定、聯名商品"],
    ["franchise-investment", "加盟與投資", "融資、加盟招商、供應鏈投資"],
    ["city-market", "城市市場", "特定城市的消費變化、商圈、價格與品牌密度"],
    ["trend", "消費趨勢", "低糖、健康化、抹茶、奶蓋、水果茶等趨勢"],
    ["supply-chain", "供應鏈", "茶葉、珍珠、奶源、包材與設備"],
    ["culture", "文化與生活", "社群流行、地方文化、消費者行為"],
], widths=[1.65, 1.4, 3.1])

add_heading(doc, "5.5 AI 摘要審核流", 2)
add_para(doc, "新聞 news.ai_summary_i18n 由 ingest pipeline 產生；ai_summary_reviewed_by 為 NULL 時前台不顯示。編輯在 CMS 看到「待審 AI 摘要」清單，確認或修改後設 ai_summary_reviewed_by = current_user，前台才顯示「AI 摘要（已編輯審核）」區塊。公信力要求：未審 AI 摘要絕對不對外公開。")

add_heading(doc, "6. 搜尋與篩選", 1)
add_table(doc, ["階段", "功能"], [
    ["MVP", "關鍵字搜尋、類型篩選、即時結果更新"],
    ["第二階段", "Algolia、自動完成、同義詞、多語搜尋、搜尋分析"],
], widths=[1.3, 4.85])

add_heading(doc, "7. 知識圖譜與關聯資料", 1)
add_para(doc, "MVP 不需要立即導入完整 graph database，但資料關聯必須先設計好，讓每個頁面都能形成內部連結與推薦。完整 schema、欄位、PK 與索引以 data-model.md §8 為準。")
add_table(doc, ["語意關聯", "對應表（data-model §8）", "關鍵欄位"], [
    ["品牌擁有飲品", "brand_drinks", "is_signature、local_name_i18n、price_local"],
    ["品牌進入城市", "brand_cities", "entered_at、store_count_cached、status"],
    ["品牌有實體店鋪", "stores（§2，新增）", "lat / lng、is_flagship、opened_at、franchise"],
    ["品牌屬於集團", "brand_company（§3，新增）", "relation、since / until"],
    ["城市流行飲品", "drink_cities", "popularity_score、seasonality"],
    ["新聞提及品牌 / 城市 / 飲品", "news_brands / news_cities / news_drinks", "relevance（primary | secondary | mentioned）、auto_tagged"],
    ["飲品形成趨勢", "metrics_daily（§7，新增）", "每日 trending_score 歷史"],
    ["相似品牌", "brand_similarities（§8.5，新增）", "score、factors"],
], widths=[1.5, 2.3, 2.35])
add_para(doc, "所有關聯表的 relevance / relation / factors 欄位日後可直接映射為 graph edge property，v2 遷移到 Neo4j / DGraph 不需重設計。")

add_heading(doc, "7.1 衍生指標（derived metrics）", 2)
add_para(doc, "trending_score、market_maturity、popularity_score 等分數不直接寫回主實體欄位，改存 metrics_daily 歷史表並可重算可審計。完整公式、權重、缺值處理見 data-model.md §7。")
add_table(doc, ["指標", "適用實體", "計算摘要"], [
    ["trending_score（0-100）", "brand / city / drink", "新聞量、新增店數、社群提及、搜尋量做 z-score 加權後套 sigmoid；加上 30 日成長率為 delta_factor。"],
    ["market_maturity", "city（分桶 emerging / growing / mature / saturated）", "活躍店數、品牌多樣性、近 24 個月新增店數加權後以全城市百分位分桶，每月 rebalance。"],
    ["popularity_score", "drink × city", "由 brand_drinks × stores × 銷售訊號（新聞、社群）計算，含季節權重。"],
], widths=[2.1, 1.7, 2.35])
add_para(doc, "呈現原則：前台只顯示最新值，可加「過去 8 週迷你曲線」；後台可展開 metrics_daily.inputs jsonb 給出原始輸入解釋；公式調整不必回填欄位，重跑 cron 即可。")

add_heading(doc, "8. 後台功能", 1)
add_heading(doc, "8.1 CMS 能力", 2)
add_bullets(doc, [
    "新增 / 編輯品牌、城市、飲品、店鋪（stores）、母公司（companies）、新聞。",
    "管理新聞來源（sources）與信譽度。",
    "維護受控詞彙 taxonomies（茶底、奶種、配料、甜味劑、定位標籤）。",
    "設定關聯資料，含 relevance（primary / secondary / mentioned）。",
    "依 locale 編輯 seo_i18n（title / description / FAQ）。",
    "支援 draft、published、archived 狀態。",
    "AI 摘要審核流（見 §5.5）。",
    "品牌認領審核（brands.claimed_by_user_id / verified，v2 上線）。",
])
add_heading(doc, "8.2 發布前 gating 檢查", 2)
add_bullets(doc, [
    "slug 唯一性。",
    "seo_i18n[預設 locale] 的 title 與 description 已填。",
    "至少一個關聯實體（news_brands ∪ news_cities ∪ news_drinks）。",
    "summary_i18n 已填。",
    "source_id 設定（新聞）。",
    "hero image 與 alt text。",
    "內部連結 ≥ 3 條（自動偵測 markdown 連結，用於 SEO 內部連結密度）。",
    "JSON-LD 必填欄位齊全（依模板對應 schema.org type）。",
])
add_heading(doc, "8.3 內容品質儀表板", 2)
add_para(doc, "前台不顯示，提供編輯團隊掌握資料健康度。")
add_bullets(doc, [
    "各實體 completeness_score 分佈。",
    "orphan = true 清單（無任何關聯的孤兒資料）。",
    "review_due_at 已到期的實體（如品牌每 90 天必須複查）。",
    "各 content_owner_id 待辦清單。",
    "AI 摘要待審清單（ai_summary_reviewed_by IS NULL）。",
])

add_heading(doc, "9. Prototype 功能說明", 1)
add_table(doc, ["檔案", "用途"], [
    ["index.html", "網站 prototype 入口，包含首頁、資料卡、圖譜、工作流與路線圖"],
    ["styles.css", "響應式 UI、深色模式、卡片與圖譜視覺"],
    ["app.js", "搜尋、篩選、詳情面板、圖譜高亮、Canvas 視覺"],
    ["prototype-spec.md", "文字版功能規格"],
], widths=[1.65, 4.5])
add_para(doc, "目前 prototype 已驗證：首頁可載入、10 筆資料卡可顯示、搜尋、清除、類型篩選與詳情面板可運作。")

add_heading(doc, "10. 30 天 MVP 任務拆解", 1)
add_para(doc, "詳細逐日建表順序見 data-model.md §13。")
add_table(doc, ["週次", "主要任務", "交付成果"], [
    ["第 1 週", "建立 Next.js 專案；依 data-model.md 建主表（brands、cities、drinks、news、sources、taxonomies）與關聯表；建 stores、companies、brand_company、brand_similarities、metrics_daily（欄位先有，計算 job 後上）；建立首頁、列表、詳情頁模板與 CMS schema（含 i18n 欄位、AI 摘要審核狀態、completeness_score view）。", "基礎架構、資料表與頁面骨架"],
    ["第 2 週", "完成品牌、城市、飲品模組；建立關聯資料（含 relevance、is_signature、local_name_i18n）；完成 seo_i18n、hreflang；建立基本搜尋。", "核心資料模組可發布"],
    ["第 3 週", "完成新聞模組（含 source 實體、AI 摘要審核流）與發布 gating；vertical slice：先 5 城市 × 10 品牌 × 15 飲品 × 10 新聞端到端可上線，再水平擴量至 50 / 20 / 30 / 50。", "內容引擎與初始資料集"],
    ["第 4 週", "效能與 SEO QA、Search Console、Analytics、Sitemap（依實體分群）+ News sitemap + RSS、Vercel 上線。", "可公開 MVP 網站"],
], widths=[1.0, 3.4, 1.75])

add_heading(doc, "11. 後續成長功能", 1)
add_table(doc, ["階段", "功能"], [
    ["30-90 天", "AI 摘要審核流上線（欄位已預埋）、進階搜尋（Meilisearch / Typesense 自架）、每週電子報、trending_score / market_maturity 計算 job、城市市場比較頁、品牌認領（claimed_by_user_id / verified）"],
    ["3-12 個月", "全球珍奶地圖（stores × cities.lat/lng）、AI 問答助手（以結構化資料為 RAG 來源）、加盟商情報（brand_company × stores × metrics_daily）、市場報告、企業資料 API（slug 與 UUID 雙鍵已備）"],
], widths=[1.3, 4.85])

add_heading(doc, "12. 建議結論", 1)
add_para(doc, "Global Boba Graph 應從 SEO 內容資料庫起步，先完成品牌、城市、飲品、新聞四個資料核心，再透過 stores、companies、taxonomies、metrics_daily 等補強表形成完整知識圖譜。資料模型 v1 已預留 graph DB、品牌認領、付費 tier、多幣別、企業 API 等成長鈎子，這比單純媒體文章更能累積長期價值，也能支撐未來 AI 搜尋、推薦、報告與資料變現。")

doc.save(OUT)
print(OUT)
