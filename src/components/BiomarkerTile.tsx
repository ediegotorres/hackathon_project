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
    <button
      type="button"
      onClick={onClick}
      className="h-full w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
    >
      <Card
        className={`h-full ${selected ? "border-teal-500 ring-2 ring-teal-300" : "hover:border-teal-300"}`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--ink-soft)]">{item.label}</p>
              <p className="text-3xl font-semibold tracking-tight">
                {item.value} {item.unit}
              </p>
            </div>
            <StatusChip status={item.status} />
          </div>
          <p className="text-xs font-medium text-[var(--ink-soft)]">{item.rangeText}</p>
          {item.meaning && <p className="text-sm text-[var(--ink)]">{item.meaning}</p>}
        </div>
      </Card>
    </button>
  );
}
