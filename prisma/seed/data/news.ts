/**
 * 新聞 seed — 10 篇示範產業新聞
 * 註：以下故事內容為 demo placeholder，僅供 UI 與資料模型展示用
 */
import type { NewsCategory, RelevanceLevel } from "@/generated/prisma/enums";

export interface NewsSeed {
  slug: string;
  titleI18n: Record<string, string>;
  summaryI18n: Record<string, string>;
  bodyI18n: Record<string, string>;
  category: NewsCategory;
  sourceSlug: string;
  sourceUrl: string;
  publishedDaysAgo: number;
  relatedBrands: Array<{ slug: string; relevance: RelevanceLevel }>;
  relatedCities: Array<{ slug: string; relevance: RelevanceLevel }>;
  relatedDrinks: Array<{ slug: string; relevance: RelevanceLevel }>;
}

export const news: NewsSeed[] = [
  {
    slug: "chagee-flagship-los-angeles-2026",
    titleI18n: {
      en: "CHAGEE opens flagship in Los Angeles, marking aggressive US push",
      "zh-TW": "霸王茶姬洛杉磯旗艦店開幕，加速美國市場布局",
      "zh-CN": "霸王茶姬洛杉矶旗舰店开幕，加速美国市场布局",
      ja: "覇王茶姫がロサンゼルスに旗艦店をオープン、米国市場開拓を本格化",
    },
    summaryI18n: {
      en: "Premium Chinese chain CHAGEE has opened its first US flagship in Westwood, planning 20+ Southern California locations by year-end.",
      "zh-TW": "中國精品連鎖霸王茶姬在洛杉磯 Westwood 開設美國首間旗艦店，預計年底前於南加州擴增至 20 餘家。",
      "zh-CN": "中国精品连锁霸王茶姬在洛杉矶 Westwood 开设美国首间旗舰店，预计年底前于南加州扩增至 20 余家。",
      ja: "中国系プレミアムチェーンの覇王茶姫が、ロサンゼルスのウェストウッドに米国初の旗艦店を開業。年内に南カリフォルニアで20店舗超を計画。",
    },
    bodyI18n: {
      en: "The opening signals an aggressive entry strategy by CHAGEE into the US bubble tea market, leveraging its tea-forward 'modern oriental' positioning. Industry observers note the brand is targeting Asian-American consumers initially but plans broader appeal through campus partnerships.",
      "zh-TW": "此次開幕宣告霸王茶姬對美國珍奶市場的積極切入，主打「東方茶葉現代化」定位。產業觀察者指出，品牌初期鎖定亞裔市場，後續將透過校園合作擴大客群。",
      "zh-CN": "此次开幕宣告霸王茶姬对美国珍奶市场的积极切入，主打「东方茶叶现代化」定位。产业观察者指出，品牌初期锁定亚裔市场，后续将透过校园合作扩大客群。",
      ja: "今回の出店は、覇王茶姫の米国タピオカ市場への本格参入を示すもの。「現代東洋茶」というポジショニングを軸に、当初はアジア系コミュニティを狙いつつ、大学との提携で客層を広げる方針。",
    },
    category: "EXPANSION",
    sourceSlug: "global-boba-graph-editorial",
    sourceUrl: "https://babo-tea.vercel.app/news/chagee-flagship-los-angeles-2026",
    publishedDaysAgo: 3,
    relatedBrands: [{ slug: "chagee", relevance: "PRIMARY" }],
    relatedCities: [{ slug: "los-angeles", relevance: "PRIMARY" }],
    relatedDrinks: [],
  },
  {
    slug: "gong-cha-southeast-asia-2026",
    titleI18n: {
      en: "Gong cha announces 50 new Southeast Asian stores for 2026",
      "zh-TW": "貢茶宣布 2026 東南亞新增 50 家門店",
      "zh-CN": "贡茶宣布 2026 东南亚新增 50 家门店",
      ja: "ゴンチャ、2026年東南アジアで50店舗の新規出店を発表",
    },
    summaryI18n: {
      en: "Gong cha's Asia HQ has outlined plans to open 50 stores across Vietnam, Thailand and the Philippines in 2026.",
      "zh-TW": "貢茶亞洲總部宣布 2026 將於越南、泰國、菲律賓新增 50 家門店。",
      "zh-CN": "贡茶亚洲总部宣布 2026 将于越南、泰国、菲律宾新增 50 家门店。",
      ja: "ゴンチャのアジア本部が、2026年中にベトナム・タイ・フィリピンで50店舗の新規開業を発表。",
    },
    bodyI18n: {
      en: "The expansion focuses on tier-2 cities, building on existing logistics hubs in Singapore and Kuala Lumpur. Average store investment is estimated at USD $150K, with payback in 18 months at current volumes.",
      "zh-TW": "本次擴張聚焦二線城市，並以現有新加坡與吉隆坡物流中心為基底。單店投資約 15 萬美元，依目前營業量約 18 個月回本。",
      "zh-CN": "本次扩张聚焦二线城市，并以现有新加坡与吉隆坡物流中心为基底。单店投资约 15 万美元，依目前营业量约 18 个月回本。",
      ja: "今回の拡大は二線都市を中心とし、シンガポール・クアラルンプールの既存物流拠点を活用。一店舗あたりの投資は約15万米ドルで、現状の売上水準なら18カ月で回収可能と試算。",
    },
    category: "EXPANSION",
    sourceSlug: "industry-newsletter",
    sourceUrl: "https://industry-newsletter.example.com/gong-cha-sea-2026",
    publishedDaysAgo: 7,
    relatedBrands: [{ slug: "gong-cha", relevance: "PRIMARY" }],
    relatedCities: [{ slug: "singapore", relevance: "PRIMARY" }],
    relatedDrinks: [],
  },
  {
    slug: "the-alley-london-debut",
    titleI18n: {
      en: "The Alley debuts in London Soho with limited UK launch lineup",
      "zh-TW": "鹿角巷倫敦蘇活區開幕，推出英國限定菜單",
      "zh-CN": "鹿角巷伦敦苏活区开幕，推出英国限定菜单",
      ja: "ジ アレイ、ロンドン・ソーホーに英国限定メニューで上陸",
    },
    summaryI18n: {
      en: "The Alley's first London store opened on Frith Street, featuring local-exclusive Earl Grey-based variations on its signature drinks.",
      "zh-TW": "鹿角巷倫敦首店於 Frith Street 開幕，推出以伯爵紅茶為基底的英國限定菜單。",
      "zh-CN": "鹿角巷伦敦首店于 Frith Street 开幕，推出以伯爵红茶为基底的英国限定菜单。",
      ja: "ジ アレイのロンドン1号店がフリス通りに開業。英国限定のアールグレイベースの新メニューを投入。",
    },
    bodyI18n: {
      en: "Soho was chosen for its dense international foot-traffic and existing bubble tea cluster. The Alley confirms two additional UK locations by Q3, with a Manchester store next on the roadmap.",
      "zh-TW": "蘇活區因國際遊客密集與既有珍奶聚集區而雀屏中選。鹿角巷確認第三季前增設 2 家英國門店，曼徹斯特為下一目標。",
      "zh-CN": "苏活区因国际游客密集与既有珍奶聚集区而雀屏中选。鹿角巷确认第三季前增设 2 家英国门店，曼彻斯特为下一目标。",
      ja: "ソーホーは国際的な客足と既存タピオカ密集地という理由で選定。ジ アレイは第3四半期までに英国でさらに2店舗を出店予定、次のターゲットはマンチェスター。",
    },
    category: "EXPANSION",
    sourceSlug: "regional-foodmedia",
    sourceUrl: "https://food-media.example.com/the-alley-london",
    publishedDaysAgo: 12,
    relatedBrands: [{ slug: "the-alley", relevance: "PRIMARY" }],
    relatedCities: [{ slug: "london", relevance: "PRIMARY" }],
    relatedDrinks: [{ slug: "fresh-milk-pearl-tea", relevance: "SECONDARY" }],
  },
  {
    slug: "brown-sugar-comeback-2026",
    titleI18n: {
      en: "Brown sugar bubble tea makes a comeback as chains roll out reformulated recipes",
      "zh-TW": "黑糖珍奶回潮：連鎖品牌端出改版配方",
      "zh-CN": "黑糖珍奶回潮：连锁品牌端出改版配方",
      ja: "黒糖タピオカが復活、各チェーンがリニューアル版を投入",
    },
    summaryI18n: {
      en: "Six years after its 2018 peak, brown sugar drinks are quietly returning as chains release lower-sugar versions targeting health-conscious millennials.",
      "zh-TW": "在 2018 高峰之後六年，黑糖飲品悄然回歸，連鎖品牌推出減糖版本，瞄準健康取向的千禧世代。",
      "zh-CN": "在 2018 高峰之后六年，黑糖饮品悄然回归，连锁品牌推出减糖版本，瞄准健康取向的千禧世代。",
      ja: "2018年のピークから6年、黒糖系ドリンクが復活の兆し。各チェーンは健康志向のミレニアル層向けに低糖バージョンを投入。",
    },
    bodyI18n: {
      en: "Tiger Sugar and several copycats have publicly reduced sugar content by 30%, while keeping the brown-sugar visual signature intact. Industry watchers see it as a nostalgia-driven retention play.",
      "zh-TW": "老虎堂與多家模仿品牌公開將糖量減少 30%，同時保留黑糖視覺特徵。產業觀察者視為基於懷舊的留客策略。",
      "zh-CN": "老虎堂与多家模仿品牌公开将糖量减少 30%，同时保留黑糖视觉特征。产业观察者视为基于怀旧的留客策略。",
      ja: "タイガーシュガーをはじめとする各社は、黒糖シロップの見た目はそのままに、糖分を30%削減すると公表。業界はノスタルジア訴求のリテンション戦略と分析。",
    },
    category: "TREND",
    sourceSlug: "industry-newsletter",
    sourceUrl: "https://industry-newsletter.example.com/brown-sugar-comeback",
    publishedDaysAgo: 18,
    relatedBrands: [{ slug: "tiger-sugar", relevance: "PRIMARY" }],
    relatedCities: [],
    relatedDrinks: [
      { slug: "brown-sugar-pearl-milk-tea", relevance: "PRIMARY" },
      { slug: "dirty-milk-tea", relevance: "SECONDARY" },
    ],
  },
  {
    slug: "oat-milk-bubble-tea-trend",
    titleI18n: {
      en: "Oat milk becomes default option as bubble tea goes plant-based",
      "zh-TW": "燕麥奶成為珍奶店標配選項",
      "zh-CN": "燕麦奶成为珍奶店标配选项",
      ja: "オートミルクがタピオカ店の標準オプションに",
    },
    summaryI18n: {
      en: "Across Asia and the US, major bubble tea chains have moved oat milk from a paid add-on to a default substitute, reflecting strong plant-based demand.",
      "zh-TW": "亞洲與美國的主要珍奶連鎖陸續將燕麥奶從加價選項升級為標準替代品，反映植物奶需求強勁。",
      "zh-CN": "亚洲与美国的主要珍奶连锁陆续将燕麦奶从加价选项升级为标准替代品，反映植物奶需求强劲。",
      ja: "アジアと米国の主要タピオカチェーンが、オートミルクを有料オプションから標準代替品へ格上げ。植物性ミルクの需要を反映。",
    },
    bodyI18n: {
      en: "Suppliers report wholesale oat-milk volumes for boba tea outpacing dairy growth 3-to-1. Brands cite operational simplicity and the appeal to lactose-intolerant Asian customers.",
      "zh-TW": "供應商表示，珍奶用燕麥奶批發量增速為鮮奶的 3 倍。品牌方歸因於營運簡化與亞洲乳糖不耐受客群偏好。",
      "zh-CN": "供应商表示，珍奶用燕麦奶批发量增速为鲜奶的 3 倍。品牌方归因于营运简化与亚洲乳糖不耐受客群偏好。",
      ja: "サプライヤーによれば、タピオカ向けオートミルクの卸売数量は乳製品の3倍速で伸長。各ブランドは運用の簡素化と乳糖不耐性客への対応をメリットに挙げる。",
    },
    category: "TREND",
    sourceSlug: "global-boba-graph-editorial",
    sourceUrl: "https://babo-tea.vercel.app/news/oat-milk-trend",
    publishedDaysAgo: 22,
    relatedBrands: [
      { slug: "chagee", relevance: "MENTIONED" },
      { slug: "the-alley", relevance: "MENTIONED" },
      { slug: "koi-the", relevance: "MENTIONED" },
    ],
    relatedCities: [],
    relatedDrinks: [
      { slug: "matcha-latte", relevance: "SECONDARY" },
      { slug: "oolong-milk-tea", relevance: "SECONDARY" },
    ],
  },
  {
    slug: "tokyo-summer-fruit-tea-surge",
    titleI18n: {
      en: "Tokyo's summer sees record orders for fruit tea over traditional milk tea",
      "zh-TW": "東京盛夏：水果茶訂購量首度超過傳統奶茶",
      "zh-CN": "东京盛夏：水果茶订购量首度超过传统奶茶",
      ja: "東京の夏、フルーツティーの注文数が伝統的なミルクティーを初めて上回る",
    },
    summaryI18n: {
      en: "Aggregated POS data from major chains shows Tokyo summer fruit-tea orders outpacing milk tea for the first time, driven by mango and passion-fruit variants.",
      "zh-TW": "主要連鎖 POS 數據顯示，東京夏季水果茶訂購量首度超越奶茶，芒果與百香果為主力推手。",
      "zh-CN": "主要连锁 POS 数据显示，东京夏季水果茶订购量首度超越奶茶，芒果与百香果为主力推手。",
      ja: "主要チェーンのPOS集計データで、東京の夏季フルーツティー注文数が初めてミルクティーを上回ったことが判明。マンゴーとパッションフルーツがけん引。",
    },
    bodyI18n: {
      en: "The shift correlates with record summer temperatures and Tokyo's preference for lighter, less caloric drinks. Industry analysts expect fruit tea to remain dominant in Japan's summer through 2027.",
      "zh-TW": "此一轉變與創紀錄夏季高溫、東京對清爽低熱量飲品的偏好有關。產業分析師預測水果茶將至少維持到 2027 年的日本夏季主導地位。",
      "zh-CN": "此一转变与创纪录夏季高温、东京对清爽低热量饮品的偏好有关。产业分析师预测水果茶将至少维持到 2027 年的日本夏季主导地位。",
      ja: "この変化は、記録的な猛暑と東京の「軽くて低カロリー」志向に呼応するもの。アナリストは、フルーツティーが2027年まで日本の夏の主流であり続けると予測。",
    },
    category: "CITY_MARKET",
    sourceSlug: "regional-foodmedia",
    sourceUrl: "https://food-media.example.com/tokyo-fruit-tea-summer",
    publishedDaysAgo: 25,
    relatedBrands: [{ slug: "the-alley", relevance: "SECONDARY" }, { slug: "koi-the", relevance: "SECONDARY" }],
    relatedCities: [{ slug: "tokyo", relevance: "PRIMARY" }],
    relatedDrinks: [
      { slug: "mango-green-tea", relevance: "PRIMARY" },
      { slug: "passion-fruit-green-tea", relevance: "PRIMARY" },
    ],
  },
  {
    slug: "koi-the-new-tieguanyin-launch",
    titleI18n: {
      en: "KOI Thé launches premium Tieguanyin milk tea line across Asia",
      "zh-TW": "KOI Thé 推出亞洲精品鐵觀音奶茶系列",
      "zh-CN": "KOI Thé 推出亚洲精品铁观音奶茶系列",
      ja: "KOI Thé、アジア地域でプレミアム鉄観音ミルクティーを発売",
    },
    summaryI18n: {
      en: "KOI Thé has launched a limited Tieguanyin milk tea line sourced directly from Fujian growers, available in Singapore, Tokyo and Taipei.",
      "zh-TW": "KOI Thé 推出鐵觀音奶茶限定系列，茶葉直購自福建茶農，於新加坡、東京、台北上市。",
      "zh-CN": "KOI Thé 推出铁观音奶茶限定系列，茶叶直购自福建茶农，于新加坡、东京、台北上市。",
      ja: "KOI Théが福建省の茶農家から直接調達した鉄観音を使った期間限定ミルクティーをシンガポール・東京・台北で発売。",
    },
    bodyI18n: {
      en: "The launch positions KOI Thé closer to Chinese-style 'modern tea house' brands like CHAGEE and Heytea, signalling broader category shifts toward higher-grade tea sourcing.",
      "zh-TW": "此次上市使 KOI Thé 更接近霸王茶姬、喜茶等中國「新式茶飲」品牌定位，反映類別向更高端茶葉採購的整體位移。",
      "zh-CN": "此次上市使 KOI Thé 更接近霸王茶姬、喜茶等中国「新式茶饮」品牌定位，反映类别向更高端茶叶采购的整体位移。",
      ja: "今回の投入により、KOI Théは覇王茶姫や喜茶など中国系「新茶飲」ブランドのポジションに接近。業界全体が高品質茶葉調達へとシフトしていることを示唆。",
    },
    category: "LAUNCH",
    sourceSlug: "industry-newsletter",
    sourceUrl: "https://industry-newsletter.example.com/koi-the-tieguanyin",
    publishedDaysAgo: 30,
    relatedBrands: [
      { slug: "koi-the", relevance: "PRIMARY" },
      { slug: "chagee", relevance: "SECONDARY" },
    ],
    relatedCities: [
      { slug: "singapore", relevance: "PRIMARY" },
      { slug: "tokyo", relevance: "SECONDARY" },
      { slug: "taipei", relevance: "SECONDARY" },
    ],
    relatedDrinks: [{ slug: "tieguanyin-milk-tea", relevance: "PRIMARY" }],
  },
  {
    slug: "singapore-bubble-tea-licensing-changes",
    titleI18n: {
      en: "Singapore tightens sugar labelling for ready-to-drink beverages, bubble tea affected",
      "zh-TW": "新加坡強化即飲含糖飲品標示，珍奶受影響",
      "zh-CN": "新加坡强化即饮含糖饮品标示，珍奶受影响",
      ja: "シンガポールが即飲飲料の糖分表示を強化、タピオカも対象に",
    },
    summaryI18n: {
      en: "Updated Nutri-Grade rules require all bubble tea chains to display sugar grade on menu boards starting Q2 2026.",
      "zh-TW": "新加坡更新 Nutri-Grade 規範，2026 Q2 起所有珍奶連鎖須在 menu board 標示糖分等級。",
      "zh-CN": "新加坡更新 Nutri-Grade 规范，2026 Q2 起所有珍奶连锁须在 menu board 标示糖分等级。",
      ja: "シンガポールがNutri-Grade規定を改定。2026年第2四半期から、すべてのタピオカチェーンはメニューに糖分グレードを表示する義務化。",
    },
    bodyI18n: {
      en: "The labelling extends prior soft-drink rules to specialty beverages. Bubble tea chains have been given 90 days to comply; some operators are already reformulating signature drinks to qualify for Grade B or above.",
      "zh-TW": "新規範將先前針對汽水的規定延伸至特色飲品。珍奶連鎖享 90 天緩衝期，部分業者已著手調整招牌飲品配方以達到 Grade B 以上。",
      "zh-CN": "新规范将先前针对汽水的规定延伸至特色饮品。珍奶连锁享 90 天缓冲期，部分业者已着手调整招牌饮品配方以达到 Grade B 以上。",
      ja: "新規定は、これまで炭酸飲料に適用されていたルールをスペシャルティ飲料に拡大。タピオカ各社は90日の猶予期間中に対応する必要があり、一部はGrade B以上を取れるよう看板メニューを改良中。",
    },
    category: "CITY_MARKET",
    sourceSlug: "regional-foodmedia",
    sourceUrl: "https://food-media.example.com/singapore-nutri-grade",
    publishedDaysAgo: 35,
    relatedBrands: [{ slug: "koi-the", relevance: "MENTIONED" }, { slug: "gong-cha", relevance: "MENTIONED" }],
    relatedCities: [{ slug: "singapore", relevance: "PRIMARY" }],
    relatedDrinks: [{ slug: "brown-sugar-pearl-milk-tea", relevance: "SECONDARY" }],
  },
  {
    slug: "yifang-winter-melon-revival",
    titleI18n: {
      en: "Yi Fang's winter melon lemon goes viral on TikTok in North America",
      "zh-TW": "一芳冬瓜檸檬於北美 TikTok 爆紅",
      "zh-CN": "一芳冬瓜柠檬于北美 TikTok 爆红",
      ja: "一芳の冬瓜レモン、北米TikTokで急上昇",
    },
    summaryI18n: {
      en: "A series of TikTok videos featuring Yi Fang's signature winter melon lemon tea has driven a 6× weekly order spike at Los Angeles stores.",
      "zh-TW": "一系列以一芳招牌冬瓜檸檬為主角的 TikTok 影片，使其洛杉磯門店週訂購量飆升 6 倍。",
      "zh-CN": "一系列以一芳招牌冬瓜柠檬为主角的 TikTok 视频，使其洛杉矶门店周订购量飙升 6 倍。",
      ja: "一芳の看板「冬瓜レモン」を扱ったTikTok動画群が話題となり、ロサンゼルス各店の週次注文数が6倍に急増。",
    },
    bodyI18n: {
      en: "The trend appears organic, with no paid creator deals reported by Yi Fang HQ. The brand is rushing supply chain capacity to keep pace with new orders.",
      "zh-TW": "此趨勢看似自發，一芳總部並未透露付費合作。品牌正加緊供應鏈擴能以應對訂單。",
      "zh-CN": "此趋势看似自发，一芳总部并未透露付费合作。品牌正加紧供应链扩能以应对订单。",
      ja: "この流行は自然発生的とみられ、一芳本部も有償提携はないと説明。需要急増に対応するため、サプライチェーンの増強を急いでいる。",
    },
    category: "CULTURE",
    sourceSlug: "regional-foodmedia",
    sourceUrl: "https://food-media.example.com/yifang-winter-melon-tiktok",
    publishedDaysAgo: 45,
    relatedBrands: [{ slug: "yifang-fruit-tea", relevance: "PRIMARY" }],
    relatedCities: [{ slug: "los-angeles", relevance: "PRIMARY" }],
    relatedDrinks: [{ slug: "winter-melon-tea", relevance: "PRIMARY" }],
  },
  {
    slug: "chatime-supply-chain-investment",
    titleI18n: {
      en: "Chatime parent La Kaffa invests USD $30M in regional tea supply chain",
      "zh-TW": "日出茶太母公司六角國際投資 3,000 萬美元擴張區域茶葉供應鏈",
      "zh-CN": "日出茶太母公司六角国际投资 3,000 万美元扩张区域茶叶供应链",
      ja: "Chatime親会社のラ・カッファが地域茶葉サプライチェーンに3,000万米ドル投資",
    },
    summaryI18n: {
      en: "Taiwanese parent La Kaffa announces investment in tea processing facilities in Vietnam and Indonesia to secure supply for global franchise growth.",
      "zh-TW": "台灣母公司六角國際宣布在越南、印尼投資茶葉加工廠，鞏固全球加盟擴張的供應端。",
      "zh-CN": "台湾母公司六角国际宣布在越南、印尼投资茶叶加工厂，巩固全球加盟扩张的供应端。",
      ja: "台湾の親会社ラ・カッファが、グローバル加盟展開の供給力確保のため、ベトナム・インドネシアで茶葉加工工場へ投資すると発表。",
    },
    bodyI18n: {
      en: "The investment follows continued double-digit growth in Southeast Asia franchise count. La Kaffa CEO described tea sourcing as 'the bottleneck of the next five years' in a press conference.",
      "zh-TW": "此次投資緊接著東南亞加盟數量持續兩位數成長之後。六角國際 CEO 於記者會將茶葉採購形容為「未來五年的瓶頸」。",
      "zh-CN": "此次投资紧接着东南亚加盟数量持续两位数增长之后。六角国际 CEO 于记者会将茶叶采购形容为「未来五年的瓶颈」。",
      ja: "今回の投資は、東南アジアでの加盟店数が二桁成長を続ける中で行われたもの。ラ・カッファCEOは記者会見で、茶葉調達を「今後5年のボトルネック」と表現。",
    },
    category: "FRANCHISE_INVESTMENT",
    sourceSlug: "industry-newsletter",
    sourceUrl: "https://industry-newsletter.example.com/la-kaffa-supply-chain",
    publishedDaysAgo: 55,
    relatedBrands: [{ slug: "chatime", relevance: "PRIMARY" }],
    relatedCities: [{ slug: "singapore", relevance: "MENTIONED" }],
    relatedDrinks: [],
  },
];
