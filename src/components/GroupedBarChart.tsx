type BarSeries = {
  id: string;
  label: string;
  color: string;
};

type BarDatum = {
  label: string;
  values: Record<string, number | undefined>;
};

export function GroupedBarChart({
  data,
  series,
  height = 260,
}: {
  data: BarDatum[];
  series: BarSeries[];
  height?: number;
}) {
  if (!data.length || !series.length) {
    return (
      <div className="h-[220px] rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)]" />
    );
  }

  const paddingTop = 12;
  const paddingRight = 16;
  const paddingBottom = 42;
  const paddingLeft = 44;
  const chartHeight = height - paddingTop - paddingBottom;
  const groupWidth = 92;
  const width = Math.max(640, paddingLeft + paddingRight + data.length * groupWidth);

  const maxValue = Math.max(
    1,
    ...data.flatMap((datum) =>
      series.map((item) => (typeof datum.values[item.id] === "number" ? (datum.values[item.id] as number) : 0)),
    ),
  );
  const barGap = 6;
  const innerWidth = groupWidth - 20;
  const barWidth = Math.max(8, (innerWidth - (series.length - 1) * barGap) / series.length);
  const yTicks = 5;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] min-w-[640px] w-full">
          {Array.from({ length: yTicks + 1 }).map((_, index) => {
            const ratio = index / yTicks;
            const y = paddingTop + chartHeight * ratio;
            const value = Number((maxValue * (1 - ratio)).toFixed(1));
            return (
              <g key={`grid-${index}`}>
                <line
                  x1={paddingLeft}
                  x2={width - paddingRight}
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="4 4"
                />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
                  {value}
                </text>
              </g>
            );
          })}

          {data.map((datum, groupIndex) => {
            const groupStart = paddingLeft + groupIndex * groupWidth + 10;
            return (
              <g key={`${datum.label}-${groupIndex}`}>
                {series.map((item, seriesIndex) => {
                  const raw = datum.values[item.id];
                  if (typeof raw !== "number") return null;
                  const barHeight = (raw / maxValue) * chartHeight;
                  const x = groupStart + seriesIndex * (barWidth + barGap);
                  const y = paddingTop + (chartHeight - barHeight);
                  return (
                    <g key={`${item.id}-${groupIndex}`}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={item.color}>
                        <title>{`${datum.label} | ${item.label}: ${raw}`}</title>
                      </rect>
                    </g>
                  );
                })}
                <text
                  x={groupStart + innerWidth / 2}
                  y={height - 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--ink-soft)"
                >
                  {datum.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-2">
        {series.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)]"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

