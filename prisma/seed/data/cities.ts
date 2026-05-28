/**
 * 城市 seed — 5 個涵蓋亞洲、北美、歐洲的關鍵市場
 */
import type { MarketMaturity } from "@/generated/prisma/enums";

export interface CitySeed {
  slug: string;
  nameI18n: Record<string, string>;
  countryCode: string;
  adminRegion?: string;
  lat: string;
  lng: string;
  timezone: string;
  population: number;
  avgPriceLocal: string;
  avgPriceCurrency: string;
  marketMaturity: MarketMaturity;
  descriptionI18n: Record<string, string>;
}

export const cities: CitySeed[] = [
  {
    slug: "taipei",
    nameI18n: { en: "Taipei", "zh-TW": "台北", "zh-CN": "台北", ja: "台北" },
    countryCode: "TW",
    adminRegion: "Taipei City",
    lat: "25.033964",
    lng: "121.564468",
    timezone: "Asia/Taipei",
    population: 2700000,
    avgPriceLocal: "55.00",
    avgPriceCurrency: "TWD",
    marketMaturity: "SATURATED",
    descriptionI18n: {
      en: "Taipei is the birthplace of pearl milk tea and remains the world's most saturated bubble tea market, with hundreds of brands competing block by block.",
      "zh-TW": "台北是珍珠奶茶的發源地，至今仍是全球競爭最激烈的珍奶市場，街區內品牌密集競逐。",
      "zh-CN": "台北是珍珠奶茶的发源地，至今仍是全球竞争最激烈的珍奶市场，街区内品牌密集竞逐。",
      ja: "台北はタピオカミルクティーの発祥地であり、ブランドが街区ごとに競い合う、世界で最も飽和度の高い市場です。",
    },
  },
  {
    slug: "tokyo",
    nameI18n: { en: "Tokyo", "zh-TW": "東京", "zh-CN": "东京", ja: "東京" },
    countryCode: "JP",
    adminRegion: "Tokyo",
    lat: "35.689487",
    lng: "139.691711",
    timezone: "Asia/Tokyo",
    population: 13960000,
    avgPriceLocal: "650.00",
    avgPriceCurrency: "JPY",
    marketMaturity: "MATURE",
    descriptionI18n: {
      en: "After two boom waves, Tokyo's bubble tea scene has matured into specialty stores, with both Taiwanese imports and local Japanese brands fighting for shelf space.",
      "zh-TW": "歷經兩波熱潮，東京珍奶場景已沉澱為精品店型態，台灣品牌與在地日系品牌持續競爭。",
      "zh-CN": "历经两波热潮，东京珍奶场景已沉淀为精品店型态，台湾品牌与本土日系品牌持续竞争。",
      ja: "二度のブームを経て、東京のタピオカシーンは専門店型へと成熟。台湾系と日系ブランドが激しく競合しています。",
    },
  },
  {
    slug: "singapore",
    nameI18n: { en: "Singapore", "zh-TW": "新加坡", "zh-CN": "新加坡", ja: "シンガポール" },
    countryCode: "SG",
    adminRegion: "Singapore",
    lat: "1.352083",
    lng: "103.819836",
    timezone: "Asia/Singapore",
    population: 5900000,
    avgPriceLocal: "5.50",
    avgPriceCurrency: "SGD",
    marketMaturity: "MATURE",
    descriptionI18n: {
      en: "Singapore's mall-driven retail makes it a strategic launchpad for Asian bubble tea brands expanding regionally.",
      "zh-TW": "新加坡商場為主的零售結構使其成為珍奶品牌跨區域擴張的戰略起點。",
      "zh-CN": "新加坡商场为主的零售结构使其成为珍奶品牌跨区域扩张的战略起点。",
      ja: "ショッピングモール中心の小売構造を持つシンガポールは、アジアブランドの東南アジア展開拠点として戦略的に重要です。",
    },
  },
  {
    slug: "los-angeles",
    nameI18n: { en: "Los Angeles", "zh-TW": "洛杉磯", "zh-CN": "洛杉矶", ja: "ロサンゼルス" },
    countryCode: "US",
    adminRegion: "California",
    lat: "34.052235",
    lng: "-118.243683",
    timezone: "America/Los_Angeles",
    population: 3900000,
    avgPriceLocal: "6.50",
    avgPriceCurrency: "USD",
    marketMaturity: "GROWING",
    descriptionI18n: {
      en: "With the largest Asian-American population in the US, Los Angeles is the bridgehead market for any bubble tea brand entering North America.",
      "zh-TW": "擁有全美最大亞裔社群的洛杉磯，是任何珍奶品牌進入北美市場的橋頭堡。",
      "zh-CN": "拥有全美最大亚裔社群的洛杉矶，是任何珍奶品牌进入北美市场的桥头堡。",
      ja: "全米最大のアジア系コミュニティを抱えるロサンゼルスは、北米進出を狙うあらゆるタピオカブランドの足がかりとなる市場です。",
    },
  },
  {
    slug: "london",
    nameI18n: { en: "London", "zh-TW": "倫敦", "zh-CN": "伦敦", ja: "ロンドン" },
    countryCode: "GB",
    adminRegion: "England",
    lat: "51.507351",
    lng: "-0.127758",
    timezone: "Europe/London",
    population: 9000000,
    avgPriceLocal: "5.50",
    avgPriceCurrency: "GBP",
    marketMaturity: "GROWING",
    descriptionI18n: {
      en: "London is Europe's bubble tea capital, with Soho and Chinatown leading the trend before brands spread to other UK cities and the EU.",
      "zh-TW": "倫敦是歐洲珍奶版圖的中心，蘇活與中國城率先帶起風潮，品牌再向英國其他城市與歐盟擴散。",
      "zh-CN": "伦敦是欧洲珍奶版图的中心，苏活与中国城率先带起风潮，品牌再向英国其他城市与欧盟扩散。",
      ja: "ロンドンは欧州タピオカ市場の中心地。ソーホーとチャイナタウンが流行を牽引し、英国他都市やEUへ波及していきます。",
    },
  },
];
