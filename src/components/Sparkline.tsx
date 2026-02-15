export function Sparkline({
  values,
  labels,
  width = 520,
  height = 120,
}: {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return <div className="h-[120px] rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-strong)]" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const xStep = width / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = index * xStep;
      const y = height - ((value - min) / span) * (height - 14) - 7;
      return `${x},${y}`;
    })
    .join(" ");
  const yTicks = [max, min + span / 2, min].map((value) => Number(value.toFixed(2)));

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[140px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-2">
        <line x1="0" y1="7" x2={width} y2="7" stroke="#e2e8f0" strokeDasharray="4 4" />
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
        <line x1="0" y1={height - 7} x2={width} y2={height - 7} stroke="#e2e8f0" strokeDasharray="4 4" />
        <polyline fill="none" stroke="#99f6e4" strokeWidth="8" points={points} opacity={0.35} strokeLinejoin="round" strokeLinecap="round" />
        <polyline fill="none" stroke="#0f766e" strokeWidth="3" points={points} strokeLinejoin="round" strokeLinecap="round" />
        {values.map((value, index) => {
          const x = index * xStep;
          const y = height - ((value - min) / span) * (height - 14) - 7;
          return <circle key={`${value}-${index}`} cx={x} cy={y} r="3.5" fill="#0f766e" />;
        })}
      </svg>
      <div className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
        <span>{`Max ${yTicks[0]}`}</span>
        <span>{`Mid ${yTicks[1]}`}</span>
        <span>{`Min ${yTicks[2]}`}</span>
      </div>
      {labels?.length === values.length ? (
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--ink-soft)]">
          <span className="truncate">{labels[0]}</span>
          <span className="truncate text-right">{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}
