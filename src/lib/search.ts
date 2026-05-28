/**
 * Phase 2.8 — cross-entity search
 *
 * 設計：
 * - 平行查 4 種實體（brand/city/drink/news），每種按 ILIKE 命中後返
 * - 用 jsonb path operator `->>` 抓當前 locale 的字串值；name/title 命中
 *   權重高於 description/summary
 * - 不依賴 pg_trgm，所有 Postgres 安裝都能跑；之後資料量大可升 FTS / Meilisearch
 *
 * 結果限制：每種實體 10 筆，總計 ≤ 40。
 */
import type { Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export interface SearchHit {
  kind: "brand" | "city" | "drink" | "news";
  slug: string;
  name: string;
  excerpt?: string;
  /** 搜尋命中位置：name = 命中 name/title；body = 命中 description/summary */
  matchedOn: "name" | "body";
}

export interface SearchResults {
  query: string;
  total: number;
  brands: SearchHit[];
  cities: SearchHit[];
  drinks: SearchHit[];
  news: SearchHit[];
}

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function extractJsonText(field: unknown, locale: Locale): string {
  if (!field || typeof field !== "object") return "";
  const v = (field as Record<string, unknown>)[locale];
  return typeof v === "string" ? v : "";
}

function makeExcerpt(text: string, q: string, around = 80): string {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text.slice(0, around * 2);
  const start = Math.max(0, idx - around);
  const end = Math.min(text.length, idx + q.length + around);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/**
 * 主入口。query 為空時回空結果。
 */
export async function search(rawQuery: string, locale: Locale): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length === 0) {
    return { query: "", total: 0, brands: [], cities: [], drinks: [], news: [] };
  }

  const pattern = `%${escapeLike(q)}%`;

  // 用 raw SQL 因為 Prisma 7 對 jsonb path + ILIKE 的型別支援還不完整
  // ::text 是為了讓 ILIKE 作用於 jsonb extract 後的字串
  const [brands, cities, drinks, news] = await Promise.all([
    prisma.$queryRaw<
      Array<{ slug: string; name: string | null; description: string | null; matched_on: string }>
    >`
      SELECT slug,
             name_i18n->>${locale} as name,
             description_i18n->>${locale} as description,
             CASE
               WHEN lower(name_i18n->>${locale}) LIKE lower(${pattern}) THEN 'name'
               ELSE 'body'
             END as matched_on
      FROM brands
      WHERE status = 'published'
        AND (
          lower(coalesce(name_i18n->>${locale}, '')) LIKE lower(${pattern})
          OR lower(coalesce(description_i18n->>${locale}, '')) LIKE lower(${pattern})
        )
      ORDER BY (lower(name_i18n->>${locale}) LIKE lower(${pattern})) DESC, slug
      LIMIT 10
    `,
    prisma.$queryRaw<
      Array<{ slug: string; name: string | null; description: string | null; matched_on: string }>
    >`
      SELECT slug,
             name_i18n->>${locale} as name,
             description_i18n->>${locale} as description,
             CASE
               WHEN lower(name_i18n->>${locale}) LIKE lower(${pattern}) THEN 'name'
               ELSE 'body'
             END as matched_on
      FROM cities
      WHERE status = 'published'
        AND (
          lower(coalesce(name_i18n->>${locale}, '')) LIKE lower(${pattern})
          OR lower(coalesce(description_i18n->>${locale}, '')) LIKE lower(${pattern})
        )
      ORDER BY (lower(name_i18n->>${locale}) LIKE lower(${pattern})) DESC, slug
      LIMIT 10
    `,
    prisma.$queryRaw<
      Array<{ slug: string; name: string | null; description: string | null; matched_on: string }>
    >`
      SELECT slug,
             name_i18n->>${locale} as name,
             description_i18n->>${locale} as description,
             CASE
               WHEN lower(name_i18n->>${locale}) LIKE lower(${pattern}) THEN 'name'
               ELSE 'body'
             END as matched_on
      FROM drinks
      WHERE status = 'published'
        AND (
          lower(coalesce(name_i18n->>${locale}, '')) LIKE lower(${pattern})
          OR lower(coalesce(description_i18n->>${locale}, '')) LIKE lower(${pattern})
        )
      ORDER BY (lower(name_i18n->>${locale}) LIKE lower(${pattern})) DESC, slug
      LIMIT 10
    `,
    prisma.$queryRaw<
      Array<{ slug: string; title: string | null; summary: string | null; matched_on: string }>
    >`
      SELECT slug,
             title_i18n->>${locale} as title,
             summary_i18n->>${locale} as summary,
             CASE
               WHEN lower(title_i18n->>${locale}) LIKE lower(${pattern}) THEN 'name'
               ELSE 'body'
             END as matched_on
      FROM news
      WHERE status = 'published'
        AND (
          lower(coalesce(title_i18n->>${locale}, '')) LIKE lower(${pattern})
          OR lower(coalesce(summary_i18n->>${locale}, '')) LIKE lower(${pattern})
        )
      ORDER BY (lower(title_i18n->>${locale}) LIKE lower(${pattern})) DESC, published_at DESC
      LIMIT 10
    `,
  ]);

  const brandHits: SearchHit[] = brands.map((b) => ({
    kind: "brand",
    slug: b.slug,
    name: b.name ?? b.slug,
    excerpt: makeExcerpt(b.description ?? "", q),
    matchedOn: b.matched_on as "name" | "body",
  }));
  const cityHits: SearchHit[] = cities.map((c) => ({
    kind: "city",
    slug: c.slug,
    name: c.name ?? c.slug,
    excerpt: makeExcerpt(c.description ?? "", q),
    matchedOn: c.matched_on as "name" | "body",
  }));
  const drinkHits: SearchHit[] = drinks.map((d) => ({
    kind: "drink",
    slug: d.slug,
    name: d.name ?? d.slug,
    excerpt: makeExcerpt(d.description ?? "", q),
    matchedOn: d.matched_on as "name" | "body",
  }));
  const newsHits: SearchHit[] = news.map((n) => ({
    kind: "news",
    slug: n.slug,
    name: n.title ?? n.slug,
    excerpt: makeExcerpt(n.summary ?? "", q),
    matchedOn: n.matched_on as "name" | "body",
  }));

  return {
    query: q,
    total: brandHits.length + cityHits.length + drinkHits.length + newsHits.length,
    brands: brandHits,
    cities: cityHits,
    drinks: drinkHits,
    news: newsHits,
  };
}

// 與 pickI18n 機制保持備援
// 註：上述 raw SQL 預設 locale 沒命中時不會做 fallback。若要 fallback，
// 可在這層多查 zh-TW + en 然後 dedupe。目前選擇精準（命中當前 locale）。
export { extractJsonText };
