export function Sparkline({
  values,
  width = 520,
  height = 120,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return <div className="h-[120px] rounded-xl border border-dashed border-[var(--line)] bg-white" />;
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

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[120px] w-full rounded-xl border border-[var(--line)] bg-white p-2">
      <polyline fill="none" stroke="#0f766e" strokeWidth="3" points={points} strokeLinejoin="round" strokeLinecap="round" />
      <polyline fill="none" stroke="#99f6e4" strokeWidth="8" points={points} opacity={0.35} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
