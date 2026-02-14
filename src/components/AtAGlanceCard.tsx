import { Card } from "@/src/components/Card";

export function AtAGlanceCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fcfb_100%)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
    </Card>
  );
}
