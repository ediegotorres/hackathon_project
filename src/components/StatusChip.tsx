type Status = "normal" | "borderline" | "high" | "neutral";

const classes: Record<Status, string> = {
  normal: "border border-emerald-300 bg-emerald-100 text-emerald-900",
  borderline: "border border-amber-300 bg-amber-100 text-amber-900",
  high: "border border-rose-300 bg-rose-100 text-rose-900 motion-safe:animate-[pulse-soft_2.2s_ease-in-out_infinite]",
  neutral: "border border-slate-300 bg-slate-100 text-slate-800",
};

export function StatusChip({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes[status]}`}>
      {label ?? status}
    </span>
  );
}
