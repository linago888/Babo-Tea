/**
 * 品牌 seed — 10 個全球珍奶代表品牌
 * 註：店數、上市年份等以公開資料近似，僅供 demo；正式上線前由編輯團隊核實
 */
import type { BusinessModel, PriceTier } from "@/generated/prisma/enums";

export interface BrandSeed {
  slug: string;
  nameI18n: Record<string, string>;
  countryCode: string;
  foundedYear: number;
  headquartersCitySlug?: string;
  businessModel: BusinessModel;
  priceTier: PriceTier;
  positioningTags: string[];
  descriptionI18n: Record<string, string>;
  officialWebsite?: string;
  socialHandles?: Record<string, string>;
  /** 本品牌主要市場（country_code），用來生成 brand_cities */
  mainCitySlugs: string[];
}

export const brands: BrandSeed[] = [
  {
    slug: "gong-cha",
    nameI18n: { en: "Gong cha", "zh-TW": "貢茶", "zh-CN": "贡茶", ja: "ゴンチャ" },
    countryCode: "TW",
    foundedYear: 2006,
    headquartersCitySlug: "taipei",
    businessModel: "FRANCHISE",
    priceTier: "MID",
    positioningTags: ["tea-focused", "value"],
    descriptionI18n: {
      en: "Founded in Kaohsiung, Gong cha is one of the most internationally recognized Taiwanese bubble tea brands, with locations across 20+ countries.",
      "zh-TW": "貢茶於高雄創立，是國際辨識度最高的台灣珍奶品牌之一，據點遍及二十多個國家。",
      "zh-CN": "贡茶于高雄创立，是国际辨识度最高的台湾珍奶品牌之一，据点遍及二十多个国家。",
      ja: "高雄発のゴンチャは、世界20カ国以上に展開する台湾発タピオカブランドの代表格です。",
    },
    socialHandles: { instagram: "gongcha_official" },
    mainCitySlugs: ["taipei", "tokyo", "singapore", "los-angeles", "london"],
  },
  {
    slug: "chagee",
    nameI18n: { en: "CHAGEE", "zh-TW": "霸王茶姬", "zh-CN": "霸王茶姬", ja: "覇王茶姫" },
    countryCode: "CN",
    foundedYear: 2017,
    businessModel: "HYBRID",
    priceTier: "PREMIUM",
    positioningTags: ["tea-focused", "premium", "instagrammable"],
    descriptionI18n: {
      en: "CHAGEE elevates Chinese tea culture into a contemporary premium experience, expanding from Yunnan to Southeast Asia and the US.",
      "zh-TW": "霸王茶姬將中國原葉茶文化升級為當代精品體驗，從雲南拓展至東南亞與美國。",
      "zh-CN": "霸王茶姬将中国原叶茶文化升级为当代精品体验，从云南拓展至东南亚与美国。",
      ja: "覇王茶姫は中国茶文化を現代的なプレミアム体験へと再構築し、雲南から東南アジア・米国へと展開しています。",
    },
    socialHandles: { instagram: "chagee.us" },
    mainCitySlugs: ["singapore", "los-angeles"],
  },
  {
    slug: "coco-fresh-tea-juice",
    nameI18n: { en: "CoCo Fresh Tea & Juice", "zh-TW": "都可", "zh-CN": "都可", ja: "CoCo都可" },
    countryCode: "TW",
    foundedYear: 1997,
    headquartersCitySlug: "taipei",
    businessModel: "FRANCHISE",
    priceTier: "VALUE",
    positioningTags: ["value", "fruit-tea"],
    descriptionI18n: {
      en: "Founded in 1997, CoCo is one of the longest-running mass-market bubble tea franchises, with a strong presence in mainland China and Southeast Asia.",
      "zh-TW": "都可成立於 1997 年，是最早國際化的大眾珍奶連鎖之一，在中國與東南亞市佔率高。",
      "zh-CN": "都可成立于 1997 年，是最早国际化的大众珍奶连锁之一，在中国与东南亚市占率高。",
      ja: "1997年創業のCoCoは、大衆向けタピオカチェーンの老舗。中国本土と東南アジアで圧倒的シェアを誇ります。",
    },
    socialHandles: { instagram: "coco_official_tea" },
    mainCitySlugs: ["taipei", "singapore", "london"],
  },
  {
    slug: "the-alley",
    nameI18n: { en: "The Alley", "zh-TW": "鹿角巷", "zh-CN": "鹿角巷", ja: "ジ アレイ" },
    countryCode: "TW",
    foundedYear: 2013,
    headquartersCitySlug: "taipei",
    businessModel: "HYBRID",
    priceTier: "PREMIUM",
    positioningTags: ["premium", "instagrammable", "tea-focused"],
    descriptionI18n: {
      en: "The Alley pioneered the 'hand-brewed' premium positioning and the deer-antler logo became a global Instagram fixture from 2018 onwards.",
      "zh-TW": "鹿角巷主打手作精品定位，鹿角 logo 自 2018 年起成為全球 Instagram 流行符號。",
      "zh-CN": "鹿角巷主打手作精品定位，鹿角 logo 自 2018 年起成为全球 Instagram 流行符号。",
      ja: "ジ アレイは「手作りプレミアム」のポジショニングを確立。鹿の角ロゴは2018年以降、世界的なインスタの定番となりました。",
    },
    socialHandles: { instagram: "thealleyofficial" },
    mainCitySlugs: ["taipei", "tokyo", "los-angeles", "london"],
  },
  {
    slug: "tiger-sugar",
    nameI18n: { en: "Tiger Sugar", "zh-TW": "老虎堂", "zh-CN": "老虎堂", ja: "タイガーシュガー" },
    countryCode: "TW",
    foundedYear: 2017,
    businessModel: "FRANCHISE",
    priceTier: "MID",
    positioningTags: ["instagrammable", "tea-focused"],
    descriptionI18n: {
      en: "Tiger Sugar's brown sugar tiger-stripe milk tea sparked a global craze in 2018; the brand remains synonymous with the brown sugar drink category.",
      "zh-TW": "老虎堂的黑糖虎紋鮮奶於 2018 年掀起全球熱潮，至今仍是黑糖飲品類的代名詞。",
      "zh-CN": "老虎堂的黑糖虎纹鲜奶于 2018 年掀起全球热潮，至今仍是黑糖饮品类的代名词。",
      ja: "タイガーシュガーの黒糖タイガーストライプミルクは2018年に世界的ブームを起こし、黒糖系の代名詞となっています。",
    },
    socialHandles: { instagram: "tigersugar_official" },
    mainCitySlugs: ["taipei", "tokyo", "singapore", "los-angeles"],
  },
  {
    slug: "sharetea",
    nameI18n: { en: "Sharetea", "zh-TW": "歇腳亭", "zh-CN": "歇脚亭", ja: "Sharetea" },
    countryCode: "TW",
    foundedYear: 1992,
    businessModel: "FRANCHISE",
    priceTier: "MID",
    positioningTags: ["value", "fruit-tea"],
    descriptionI18n: {
      en: "Sharetea (歇腳亭) is one of the earliest Taiwanese exporters, with stable mall-anchored locations in North America and Australia.",
      "zh-TW": "歇腳亭是最早外銷海外的台灣珍奶品牌之一，在北美與澳洲商場系統穩定發展。",
      "zh-CN": "歇脚亭是最早外销海外的台湾珍奶品牌之一，在北美与澳洲商场系统稳定发展。",
      ja: "Sharetea（歇腳亭）は台湾系の海外進出パイオニアの一つ。北米と豪州のショッピングモールで安定した店舗網を持ちます。",
    },
    socialHandles: { instagram: "sharetea_official" },
    mainCitySlugs: ["los-angeles", "london", "singapore"],
  },
  {
    slug: "chatime",
    nameI18n: { en: "Chatime", "zh-TW": "日出茶太", "zh-CN": "日出茶太", ja: "Chatime" },
    countryCode: "TW",
    foundedYear: 2005,
    businessModel: "FRANCHISE",
    priceTier: "VALUE",
    positioningTags: ["value"],
    descriptionI18n: {
      en: "Chatime is the international franchise face of La Kaffa, with one of the broadest country footprints among Taiwanese bubble tea chains.",
      "zh-TW": "日出茶太是六角國際旗下的國際加盟品牌，國家覆蓋為台系珍奶最廣之一。",
      "zh-CN": "日出茶太是六角国际旗下的国际加盟品牌，国家覆盖为台系珍奶最广之一。",
      ja: "Chatimeはラ・カッファ・グループの国際加盟ブランドで、台湾系タピオカチェーンの中で最も広い国別展開を誇ります。",
    },
    socialHandles: { instagram: "chatimeglobal" },
    mainCitySlugs: ["singapore", "london", "los-angeles"],
  },
  {
    slug: "koi-the",
    nameI18n: { en: "KOI Thé", "zh-TW": "50 嵐", "zh-CN": "50 岚", ja: "KOI Thé" },
    countryCode: "TW",
    foundedYear: 2006,
    headquartersCitySlug: "singapore",
    businessModel: "DIRECT",
    priceTier: "MID",
    positioningTags: ["tea-focused", "value"],
    descriptionI18n: {
      en: "KOI Thé is the international arm of Taiwan's 50 Lan, with direct-operated stores known for high consistency across Asia.",
      "zh-TW": "KOI Thé 為台灣 50 嵐的國際品牌，以直營高品質一致性聞名於亞洲市場。",
      "zh-CN": "KOI Thé 为台湾 50 岚的国际品牌，以直营高品质一致性闻名于亚洲市场。",
      ja: "KOI Théは台湾「50嵐」の国際ブランドで、直営店ならではの品質一貫性でアジア市場に定評があります。",
    },
    socialHandles: { instagram: "koi_official" },
    mainCitySlugs: ["singapore", "tokyo", "taipei"],
  },
  {
    slug: "happy-lemon",
    nameI18n: { en: "Happy Lemon", "zh-TW": "快樂檸檬", "zh-CN": "快乐柠檬", ja: "Happy Lemon" },
    countryCode: "CN",
    foundedYear: 2006,
    businessModel: "FRANCHISE",
    priceTier: "VALUE",
    positioningTags: ["value", "fruit-tea"],
    descriptionI18n: {
      en: "Happy Lemon popularized cheese-foam and lemon-based teas internationally, with strong North American mall coverage.",
      "zh-TW": "快樂檸檬以海鹽奶蓋與檸檬茶系列風靡海外，在北美商場據點密集。",
      "zh-CN": "快乐柠檬以海盐奶盖与柠檬茶系列风靡海外，在北美商场据点密集。",
      ja: "ハッピーレモンはチーズフォームとレモン系ドリンクで海外に進出。北米のショッピングモールに多数出店しています。",
    },
    mainCitySlugs: ["los-angeles", "singapore"],
  },
  {
    slug: "yifang-fruit-tea",
    nameI18n: { en: "Yi Fang Taiwan Fruit Tea", "zh-TW": "一芳", "zh-CN": "一芳", ja: "一芳水果茶" },
    countryCode: "TW",
    foundedYear: 2016,
    headquartersCitySlug: "taipei",
    businessModel: "FRANCHISE",
    priceTier: "MID",
    positioningTags: ["fruit-tea", "health-oriented"],
    descriptionI18n: {
      en: "Yi Fang built its brand on classic Taiwanese fruit teas — winter melon lemon and sugarcane mojito remain its signatures globally.",
      "zh-TW": "一芳以台灣經典水果茶起家，冬瓜檸檬與甘蔗 mojito 仍是其全球招牌。",
      "zh-CN": "一芳以台湾经典水果茶起家，冬瓜柠檬与甘蔗 mojito 仍是其全球招牌。",
      ja: "一芳は台湾の伝統的なフルーツティーで知られ、冬瓜レモンとサトウキビモヒートは世界共通の看板メニューです。",
    },
    mainCitySlugs: ["taipei", "tokyo", "los-angeles"],
  },
];
