/**
 * 新聞來源 seed — 3 個示範來源
 * 真實上線會用實際媒體（Nikkei、Food Navigator Asia、TechInAsia、業界自媒體 PR 等）
 */
import type { SourceKind } from "@/generated/prisma/enums";

export interface SourceSeed {
  slug: string;
  nameI18n: Record<string, string>;
  domain: string;
  countryCode?: string;
  primaryLanguage: string;
  kind: SourceKind;
  credibilityScore?: number;
}

export const sources: SourceSeed[] = [
  {
    slug: "global-boba-graph-editorial",
    nameI18n: { en: "Global Boba Graph Editorial", "zh-TW": "Global Boba Graph 編輯部", "zh-CN": "Global Boba Graph 编辑部", ja: "Global Boba Graph 編集部" },
    domain: "babo-tea.vercel.app",
    primaryLanguage: "en",
    kind: "TRADE_PRESS",
    credibilityScore: 95,
  },
  {
    slug: "industry-newsletter",
    nameI18n: { en: "Beverage Industry Newsletter", "zh-TW": "飲品產業週報", "zh-CN": "饮品产业周报", ja: "飲料業界ニュースレター" },
    domain: "industry-newsletter.example.com",
    primaryLanguage: "en",
    kind: "TRADE_PRESS",
    credibilityScore: 80,
  },
  {
    slug: "regional-foodmedia",
    nameI18n: { en: "Regional Food Media", "zh-TW": "區域飲食媒體", "zh-CN": "区域饮食媒体", ja: "地域フードメディア" },
    domain: "food-media.example.com",
    primaryLanguage: "en",
    kind: "MAINSTREAM_MEDIA",
    credibilityScore: 75,
  },
];
