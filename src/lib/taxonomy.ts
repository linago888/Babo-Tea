import type { TaxonomyKind } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

/**
 * 取得整套 taxonomy → labelI18n 對照表。
 * 用法：const labels = await loadTaxonomyLabels();
 *       labels.get('TEA_BASE:green')  →  { en: 'Green tea', ... }
 *
 * 全表只有 ~50 筆，每個 drink 詳情頁取一次即可（ISR cache）。
 */
export async function loadTaxonomyLabels(): Promise<Map<string, unknown>> {
  const rows = await prisma.taxonomy.findMany({
    where: { status: "PUBLISHED" },
    select: { kind: true, code: true, labelI18n: true },
  });
  return new Map(rows.map((r) => [`${r.kind}:${r.code}`, r.labelI18n]));
}

/** 將 (kind, code) 對轉成 locale 化的標籤；找不到 fallback 到 code 本身 */
export function taxonomyLabel(
  labels: Map<string, unknown>,
  kind: TaxonomyKind,
  code: string,
  locale: Locale,
): string {
  const field = labels.get(`${kind}:${code}`);
  return field ? pickI18n(field, locale, { fallback: code }) : code;
}
