export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const safeMax = max <= 0 ? 100 : max;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className="h-2.5 w-full rounded-full bg-[var(--surface-strong)]">
      <div className="h-2.5 rounded-full bg-[var(--brand)] transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}
