import type { AnalysisResult } from "@/src/lib/types";
import { Card } from "@/src/components/Card";
import { StatusChip } from "@/src/components/StatusChip";

type Derived = AnalysisResult["derived"][number];

export function DerivedMetricCard({ metric }: { metric: Derived }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{metric.label}</p>
          <p className="text-xl font-semibold">
            {metric.value}
            {metric.unit ? ` ${metric.unit}` : ""}
          </p>
        </div>
        {metric.status ? <StatusChip status={metric.status} /> : null}
      </div>
    </Card>
  );
}
