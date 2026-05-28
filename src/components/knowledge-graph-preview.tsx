import Link from "next/link";

import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

/**
 * 首頁知識圖譜預覽 — 5 brand × 5 city 用兩列圓圈 + 連線（brand_cities edge）
 * 純 SVG，無 JS、無動畫；視覺暗示「資料是 graph」的概念
 */
export async function KnowledgeGraphPreview({ locale }: { locale: Locale }) {
  // 抓 brand_cities 邊；只取前 5 brand + 5 city
  const edges = await prisma.brandCity.findMany({
    where: { status: "ACTIVE" },
    include: {
      brand: { select: { slug: true, nameI18n: true } },
      city: { select: { slug: true, nameI18n: true } },
    },
  });

  // 依出現頻率挑 top 5 brand 與 top 5 city
  const brandFreq = new Map<string, { slug: string; nameI18n: unknown; count: number }>();
  const cityFreq = new Map<string, { slug: string; nameI18n: unknown; count: number }>();
  for (const e of edges) {
    const b = brandFreq.get(e.brand.slug) ?? { ...e.brand, count: 0 };
    b.count++;
    brandFreq.set(e.brand.slug, b);
    const c = cityFreq.get(e.city.slug) ?? { ...e.city, count: 0 };
    c.count++;
    cityFreq.set(e.city.slug, c);
  }

  const topBrands = [...brandFreq.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const topCities = [...cityFreq.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const brandSet = new Set(topBrands.map((b) => b.slug));
  const citySet = new Set(topCities.map((c) => c.slug));
  const filteredEdges = edges.filter(
    (e) => brandSet.has(e.brand.slug) && citySet.has(e.city.slug),
  );

  // SVG layout — 上下兩列，brand 在上、city 在下
  const W = 1000;
  const H = 360;
  const TOP_Y = 80;
  const BOTTOM_Y = 280;
  const SIDE = 80;

  function xFor(i: number, total: number) {
    if (total <= 1) return W / 2;
    return SIDE + ((W - SIDE * 2) * i) / (total - 1);
  }

  const brandPos = new Map<string, { x: number; y: number }>();
  topBrands.forEach((b, i) =>
    brandPos.set(b.slug, { x: xFor(i, topBrands.length), y: TOP_Y }),
  );
  const cityPos = new Map<string, { x: number; y: number }>();
  topCities.forEach((c, i) =>
    cityPos.set(c.slug, { x: xFor(i, topCities.length), y: BOTTOM_Y }),
  );

  return (
    <figure className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Knowledge graph preview: top brands connected to top cities"
      >
        {/* Edges */}
        {filteredEdges.map((e) => {
          const a = brandPos.get(e.brand.slug);
          const b = cityPos.get(e.city.slug);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.brandId}-${e.cityId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              strokeWidth="1"
              className="text-amber-300 dark:text-amber-800"
            />
          );
        })}

        {/* Brand nodes */}
        {topBrands.map((b) => {
          const p = brandPos.get(b.slug)!;
          return (
            <Link key={b.slug} href={`/${locale}/brands/${b.slug}`} prefetch={false}>
              <circle
                cx={p.x}
                cy={p.y}
                r={20}
                className="fill-amber-700 stroke-white dark:stroke-neutral-900"
                strokeWidth="3"
              />
              <text
                x={p.x}
                y={p.y - 32}
                textAnchor="middle"
                className="fill-neutral-700 dark:fill-neutral-300"
                fontSize="14"
                fontWeight="600"
              >
                {pickI18n(b.nameI18n, locale)}
              </text>
            </Link>
          );
        })}

        {/* City nodes */}
        {topCities.map((c) => {
          const p = cityPos.get(c.slug)!;
          return (
            <Link key={c.slug} href={`/${locale}/cities/${c.slug}`} prefetch={false}>
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                className="fill-sky-700 stroke-white dark:stroke-neutral-900"
                strokeWidth="3"
              />
              <text
                x={p.x}
                y={p.y + 38}
                textAnchor="middle"
                className="fill-neutral-700 dark:fill-neutral-300"
                fontSize="13"
                fontWeight="500"
              >
                {pickI18n(c.nameI18n, locale)}
              </text>
            </Link>
          );
        })}

        {/* Legend */}
        <g transform={`translate(20, ${H - 24})`}>
          <circle cx="0" cy="0" r="6" className="fill-amber-700" />
          <text x="12" y="4" className="fill-neutral-500 dark:fill-neutral-400" fontSize="11">
            Brand
          </text>
          <circle cx="76" cy="0" r="6" className="fill-sky-700" />
          <text x="88" y="4" className="fill-neutral-500 dark:fill-neutral-400" fontSize="11">
            City
          </text>
        </g>
      </svg>
    </figure>
  );
}
