type Status = "normal" | "borderline" | "high" | "neutral";

const classes: Record<Status, string> = {
  normal: "bg-emerald-100 text-emerald-800",
  borderline: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
};

export function StatusChip({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${classes[status]}`}>
      {label ?? status}
    </span>
  );
}
