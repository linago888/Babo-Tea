import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";

const AXES = ["sweet", "bitter", "milky", "fruity", "floral", "roasted"] as const;
type Axis = (typeof AXES)[number];

interface FlavorProfile {
  sweet?: number;
  bitter?: number;
  milky?: number;
  fruity?: number;
  floral?: number;
  roasted?: number;
}

/**
 * 純 SVG 6 軸雷達 — 不需要 client lib，dark mode 友善。
 *
 * 設計：
 * - SVG viewBox 200×200，中心 (100, 100)，半徑 80
 * - 5 個 gridline 表示 0/1/2/3/4/5 同心六邊形
 * - axis label 在外圍 96px 處
 * - 填色多邊形：amber 主色，opacity 0.35，stroke 較深
 */
export async function FlavorRadar({
  profile,
  locale,
}: {
  profile: FlavorProfile;
  locale: Locale;
}) {
  const t = await getTranslations({ locale });
  const cx = 100;
  const cy = 100;
  const radius = 78;
  const max = 5;

  // 從正上方開始（-90°），順時針 60° 間隔
  function angleFor(i: number): number {
    return -Math.PI / 2 + (i * Math.PI * 2) / AXES.length;
  }

  function pointAt(value: number, axisIdx: number, offset = 0): [number, number] {
    const r = (value / max) * radius + offset;
    const a = angleFor(axisIdx);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }

  // gridlines: 5 個同心六邊形
  const gridLevels = [1, 2, 3, 4, 5];
  const gridPaths = gridLevels.map((lvl) =>
    AXES.map((_, i) => pointAt(lvl, i).join(",")).join(" "),
  );

  // 資料多邊形
  const dataPoints = AXES.map((axis, i) => {
    const v = Math.max(0, Math.min(max, profile[axis as Axis] ?? 0));
    return pointAt(v, i).join(",");
  }).join(" ");

  // 軸線
  const axisLines = AXES.map((_, i) => pointAt(max, i));

  // 標籤位置
  const labels = AXES.map((axis, i) => {
    const [lx, ly] = pointAt(max, i, 18);
    return {
      axis,
      x: lx,
      y: ly,
      label: t(`flavorAxes.${axis}`),
      value: Math.max(0, Math.min(max, profile[axis as Axis] ?? 0)),
    };
  });

  return (
    <figure
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
      aria-label="Flavor profile radar"
    >
      <svg
        viewBox="0 0 200 200"
        className="size-full max-h-64"
        role="img"
        aria-hidden="true"
      >
        {/* gridlines */}
        {gridPaths.map((d, idx) => (
          <polygon
            key={idx}
            points={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            className="text-neutral-300 dark:text-neutral-700"
            opacity={idx === gridLevels.length - 1 ? 1 : 0.5}
          />
        ))}
        {/* 軸線 */}
        {axisLines.map(([x, y], i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-neutral-300 dark:text-neutral-700"
          />
        ))}
        {/* 資料多邊形 */}
        <polygon
          points={dataPoints}
          fill="rgb(217 119 6 / 0.35)"
          stroke="rgb(217 119 6)"
          strokeWidth="1.5"
        />
        {/* 標籤 */}
        {labels.map(({ axis, x, y, label, value }) => {
          const anchor = x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle";
          const dy = y < cy - 5 ? -2 : y > cy + 5 ? 8 : 4;
          return (
            <g key={axis}>
              <text
                x={x}
                y={y + dy}
                textAnchor={anchor}
                className="fill-neutral-700 dark:fill-neutral-300"
                fontSize="9"
                fontWeight="500"
              >
                {label}
              </text>
              <text
                x={x}
                y={y + dy + 10}
                textAnchor={anchor}
                className="fill-neutral-500 dark:fill-neutral-500"
                fontSize="8"
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
