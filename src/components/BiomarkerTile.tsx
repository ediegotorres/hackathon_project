import type { AnalysisResult } from "@/src/lib/types";
import { Card } from "@/src/components/Card";
import { StatusChip } from "@/src/components/StatusChip";

type BiomarkerItem = AnalysisResult["biomarkers"][number];

export function BiomarkerTile({
  item,
  selected,
  onClick,
}: {
  item: BiomarkerItem;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="h-full w-full text-left">
      <Card className={`h-full transition ${selected ? "ring-2 ring-[var(--brand)]" : "hover:border-slate-300"}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--muted)]">{item.label}</p>
            <p className="text-2xl font-semibold">
              {item.value} {item.unit}
            </p>
          </div>
          <StatusChip status={item.status} />
        </div>
        <p className="text-xs text-[var(--muted)]">{item.rangeText}</p>
        {item.meaning && <p className="text-sm text-[var(--ink)]">{item.meaning}</p>}
      </div>
      </Card>
    </button>
  );
}
