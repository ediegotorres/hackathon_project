import Link from "next/link";
import { Button } from "@/src/components/Button";
import type { LabReport } from "@/src/lib/types";
import { Card } from "@/src/components/Card";
import { formatDate } from "@/src/lib/utils";

export function ReportListItem({ report }: { report: LabReport }) {
  const markers = [
    ["LDL", report.biomarkers.ldl],
    ["HDL", report.biomarkers.hdl],
    ["Glucose", report.biomarkers.glucose],
    ["A1c", report.biomarkers.a1c],
  ].filter((entry) => typeof entry[1] === "number") as Array<[string, number]>;

  return (
    <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fcfb_100%)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">Report: {formatDate(report.dateISO)}</p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
            {markers.length > 0
              ? markers.map(([label, value]) => <span key={label}>{`${label}: ${value}`}</span>)
              : "No biomarkers captured"}
          </div>
        </div>
        <Link href={`/report/${report.id}`} className="shrink-0">
          <Button className="min-w-28">View Results</Button>
        </Link>
      </div>
    </Card>
  );
}
