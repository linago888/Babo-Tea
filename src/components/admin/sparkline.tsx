/**
 * 輕量 SVG sparkline — 不依賴外部圖表庫。
 * 數值陣列直接轉成折線；x 軸均勻分佈、y 軸 0 ~ max。
 */
export function Sparkline({
  values,
  width = 200,
  height = 36,
  stroke = "currentColor",
  fill = "none",
  showDots = false,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  showDots?: boolean;
  className?: string;
}) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor" opacity={0.3} fontSize={10}>
          no data
        </text>
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const pad = 2;
  const drawH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + drawH - ((v - min) / range) * drawH;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path d={pathD} stroke={stroke} fill={fill} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showDots
        ? points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={stroke} />
          ))
        : null}
    </svg>
  );
}

/**
 * 水平 bar — 用於 ranking 顯示
 */
export function HBar({
  value,
  max,
  className = "",
  barClassName = "bg-rose-500",
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800 ${className}`}>
      <div className={`h-full rounded ${barClassName}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
