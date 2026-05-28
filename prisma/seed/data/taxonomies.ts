/**
 * 受控詞彙 seed — data-model.md §4
 * 飲品屬性、品牌定位都引用這些 code。
 */
import type { TaxonomyKind } from "@/generated/prisma/enums";

export interface TaxonomySeed {
  kind: TaxonomyKind;
  code: string;
  labelI18n: Record<string, string>;
  parentCode?: string;
}

export const taxonomies: TaxonomySeed[] = [
  // ── tea_base ─────────────────────────────────
  { kind: "TEA_BASE", code: "green", labelI18n: { en: "Green tea", "zh-TW": "綠茶", "zh-CN": "绿茶", ja: "緑茶" } },
  { kind: "TEA_BASE", code: "black", labelI18n: { en: "Black tea", "zh-TW": "紅茶", "zh-CN": "红茶", ja: "紅茶" } },
  { kind: "TEA_BASE", code: "oolong", labelI18n: { en: "Oolong", "zh-TW": "烏龍茶", "zh-CN": "乌龙茶", ja: "ウーロン茶" } },
  { kind: "TEA_BASE", code: "jasmine", labelI18n: { en: "Jasmine", "zh-TW": "茉莉花茶", "zh-CN": "茉莉花茶", ja: "ジャスミン茶" } },
  { kind: "TEA_BASE", code: "matcha", labelI18n: { en: "Matcha", "zh-TW": "抹茶", "zh-CN": "抹茶", ja: "抹茶" } },
  { kind: "TEA_BASE", code: "earl-grey", labelI18n: { en: "Earl Grey", "zh-TW": "伯爵紅茶", "zh-CN": "伯爵红茶", ja: "アールグレイ" } },
  { kind: "TEA_BASE", code: "pu-erh", labelI18n: { en: "Pu-erh", "zh-TW": "普洱茶", "zh-CN": "普洱茶", ja: "プーアル茶" } },
  { kind: "TEA_BASE", code: "tieguanyin", labelI18n: { en: "Tieguanyin", "zh-TW": "鐵觀音", "zh-CN": "铁观音", ja: "鉄観音" } },
  { kind: "TEA_BASE", code: "winter-melon", labelI18n: { en: "Winter melon", "zh-TW": "冬瓜茶", "zh-CN": "冬瓜茶", ja: "冬瓜茶" } },

  // ── milk_type ────────────────────────────────
  { kind: "MILK_TYPE", code: "dairy", labelI18n: { en: "Dairy", "zh-TW": "鮮奶", "zh-CN": "鲜奶", ja: "牛乳" } },
  { kind: "MILK_TYPE", code: "non-dairy-cream", labelI18n: { en: "Non-dairy creamer", "zh-TW": "奶精", "zh-CN": "奶精", ja: "ノンデイリークリーマー" } },
  { kind: "MILK_TYPE", code: "oat", labelI18n: { en: "Oat milk", "zh-TW": "燕麥奶", "zh-CN": "燕麦奶", ja: "オートミルク" } },
  { kind: "MILK_TYPE", code: "almond", labelI18n: { en: "Almond milk", "zh-TW": "杏仁奶", "zh-CN": "杏仁奶", ja: "アーモンドミルク" } },
  { kind: "MILK_TYPE", code: "soy", labelI18n: { en: "Soy milk", "zh-TW": "豆漿", "zh-CN": "豆浆", ja: "豆乳" } },
  { kind: "MILK_TYPE", code: "coconut", labelI18n: { en: "Coconut milk", "zh-TW": "椰奶", "zh-CN": "椰奶", ja: "ココナッツミルク" } },
  { kind: "MILK_TYPE", code: "condensed", labelI18n: { en: "Condensed milk", "zh-TW": "煉乳", "zh-CN": "炼乳", ja: "練乳" } },
  { kind: "MILK_TYPE", code: "none", labelI18n: { en: "No milk", "zh-TW": "無奶", "zh-CN": "无奶", ja: "ミルクなし" } },

  // ── topping ──────────────────────────────────
  { kind: "TOPPING", code: "tapioca-pearl", labelI18n: { en: "Tapioca pearls", "zh-TW": "珍珠", "zh-CN": "珍珠", ja: "タピオカ" } },
  { kind: "TOPPING", code: "mini-pearl", labelI18n: { en: "Mini pearls", "zh-TW": "波霸", "zh-CN": "波霸", ja: "ミニタピオカ" } },
  { kind: "TOPPING", code: "crystal-boba", labelI18n: { en: "Crystal boba", "zh-TW": "水晶寒天", "zh-CN": "水晶波霸", ja: "クリスタルボバ" } },
  { kind: "TOPPING", code: "pudding", labelI18n: { en: "Pudding", "zh-TW": "布丁", "zh-CN": "布丁", ja: "プリン" } },
  { kind: "TOPPING", code: "grass-jelly", labelI18n: { en: "Grass jelly", "zh-TW": "仙草", "zh-CN": "仙草", ja: "仙草ゼリー" } },
  { kind: "TOPPING", code: "aloe", labelI18n: { en: "Aloe", "zh-TW": "蘆薈", "zh-CN": "芦荟", ja: "アロエ" } },
  { kind: "TOPPING", code: "cheese-foam", labelI18n: { en: "Cheese foam", "zh-TW": "起司奶蓋", "zh-CN": "芝士奶盖", ja: "チーズフォーム" } },
  { kind: "TOPPING", code: "salted-cream", labelI18n: { en: "Salted cream", "zh-TW": "海鹽奶蓋", "zh-CN": "海盐奶盖", ja: "塩クリーム" } },
  { kind: "TOPPING", code: "red-bean", labelI18n: { en: "Red bean", "zh-TW": "紅豆", "zh-CN": "红豆", ja: "あずき" } },
  { kind: "TOPPING", code: "coconut-jelly", labelI18n: { en: "Coconut jelly", "zh-TW": "椰果", "zh-CN": "椰果", ja: "ナタデココ" } },
  { kind: "TOPPING", code: "popping-boba", labelI18n: { en: "Popping boba", "zh-TW": "爆爆珠", "zh-CN": "爆爆珠", ja: "ポッピングボバ" } },
  { kind: "TOPPING", code: "taro-paste", labelI18n: { en: "Taro paste", "zh-TW": "芋泥", "zh-CN": "芋泥", ja: "タロイモペースト" } },

  // ── sweetener ────────────────────────────────
  { kind: "SWEETENER", code: "cane-sugar", labelI18n: { en: "Cane sugar", "zh-TW": "蔗糖", "zh-CN": "蔗糖", ja: "サトウキビ糖" } },
  { kind: "SWEETENER", code: "brown-sugar", labelI18n: { en: "Brown sugar", "zh-TW": "黑糖", "zh-CN": "黑糖", ja: "黒糖" } },
  { kind: "SWEETENER", code: "honey", labelI18n: { en: "Honey", "zh-TW": "蜂蜜", "zh-CN": "蜂蜜", ja: "蜂蜜" } },
  { kind: "SWEETENER", code: "fructose", labelI18n: { en: "Fructose", "zh-TW": "果糖", "zh-CN": "果糖", ja: "果糖" } },
  { kind: "SWEETENER", code: "stevia", labelI18n: { en: "Stevia", "zh-TW": "甜菊糖", "zh-CN": "甜菊糖", ja: "ステビア" } },
  { kind: "SWEETENER", code: "none", labelI18n: { en: "Unsweetened", "zh-TW": "無糖", "zh-CN": "无糖", ja: "無糖" } },

  // ── flavor_tag ───────────────────────────────
  { kind: "FLAVOR_TAG", code: "sweet", labelI18n: { en: "Sweet", "zh-TW": "甜", "zh-CN": "甜", ja: "甘い" } },
  { kind: "FLAVOR_TAG", code: "bitter", labelI18n: { en: "Bitter", "zh-TW": "苦", "zh-CN": "苦", ja: "苦い" } },
  { kind: "FLAVOR_TAG", code: "milky", labelI18n: { en: "Milky", "zh-TW": "奶香", "zh-CN": "奶香", ja: "ミルキー" } },
  { kind: "FLAVOR_TAG", code: "fruity", labelI18n: { en: "Fruity", "zh-TW": "果香", "zh-CN": "果香", ja: "フルーティー" } },
  { kind: "FLAVOR_TAG", code: "floral", labelI18n: { en: "Floral", "zh-TW": "花香", "zh-CN": "花香", ja: "華やか" } },
  { kind: "FLAVOR_TAG", code: "roasted", labelI18n: { en: "Roasted", "zh-TW": "焙香", "zh-CN": "焙香", ja: "ロースト" } },
  { kind: "FLAVOR_TAG", code: "creamy", labelI18n: { en: "Creamy", "zh-TW": "濃郁", "zh-CN": "浓郁", ja: "クリーミー" } },
  { kind: "FLAVOR_TAG", code: "refreshing", labelI18n: { en: "Refreshing", "zh-TW": "清爽", "zh-CN": "清爽", ja: "さっぱり" } },

  // ── positioning_tag ──────────────────────────
  { kind: "POSITIONING_TAG", code: "fruit-tea", labelI18n: { en: "Fruit tea", "zh-TW": "水果茶", "zh-CN": "水果茶", ja: "フルーツティー" } },
  { kind: "POSITIONING_TAG", code: "tea-focused", labelI18n: { en: "Tea-focused", "zh-TW": "原葉茶", "zh-CN": "原叶茶", ja: "本格茶" } },
  { kind: "POSITIONING_TAG", code: "instagrammable", labelI18n: { en: "Instagrammable", "zh-TW": "高顏值", "zh-CN": "高颜值", ja: "インスタ映え" } },
  { kind: "POSITIONING_TAG", code: "value", labelI18n: { en: "Value", "zh-TW": "親民價位", "zh-CN": "亲民价位", ja: "コスパ重視" } },
  { kind: "POSITIONING_TAG", code: "premium", labelI18n: { en: "Premium", "zh-TW": "精品", "zh-CN": "精品", ja: "プレミアム" } },
  { kind: "POSITIONING_TAG", code: "health-oriented", labelI18n: { en: "Health-oriented", "zh-TW": "健康取向", "zh-CN": "健康取向", ja: "ヘルシー志向" } },
];
