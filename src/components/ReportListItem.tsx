import Link from "next/link";
import { Button } from "@/src/components/Button";
import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
import type { LabReport } from "@/src/lib/types";
import { Card } from "@/src/components/Card";
import { formatDate } from "@/src/lib/utils";

export function ReportListItem({ report }: { report: LabReport }) {
  const coreBiomarkers = resolveCoreBiomarkers(report);
  const coreEntries = [
    ["Total Chol", coreBiomarkers.totalChol, "mg/dL"],
    ["LDL", coreBiomarkers.ldl, "mg/dL"],
    ["HDL", coreBiomarkers.hdl, "mg/dL"],
    ["Triglycerides", coreBiomarkers.triglycerides, "mg/dL"],
    ["Glucose", coreBiomarkers.glucose, "mg/dL"],
    ["A1c", coreBiomarkers.a1c, "%"],
  ].filter((entry) => typeof entry[1] === "number") as Array<[string, number, string]>;

  const coreKeysWithValues = new Set(coreEntries.map(([label]) => label));
  const extraEntries = (report.additionalBiomarkers ?? [])
    .filter((item) => {
      if (!item.mappedKey) return true;
      if (item.mappedKey === "totalChol") return !coreKeysWithValues.has("Total Chol");
      if (item.mappedKey === "ldl") return !coreKeysWithValues.has("LDL");
      if (item.mappedKey === "hdl") return !coreKeysWithValues.has("HDL");
      if (item.mappedKey === "triglycerides") return !coreKeysWithValues.has("Triglycerides");
      if (item.mappedKey === "glucose") return !coreKeysWithValues.has("Glucose");
      if (item.mappedKey === "a1c") return !coreKeysWithValues.has("A1c");
      return true;
    })
    .map((item) => [item.name, item.value, item.unit ?? ""] as [string, number, string]);

  const allEntries = [...coreEntries, ...extraEntries];
  const previewEntries = allEntries.slice(0, 4);
  const remainingCount = Math.max(0, allEntries.length - previewEntries.length);

  return (
    <Card className="bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-strong)_100%)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">Report: {formatDate(report.dateISO)}</p>
          {allEntries.length > 0 ? (
            <>
              <p className="text-xs font-medium text-[var(--ink-soft)]">{`${allEntries.length} marker${allEntries.length === 1 ? "" : "s"} captured`}</p>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
                {previewEntries.map(([label, value, unit], index) => (
                  <span key={`${label}-${index}`}>
                    {`${label}: ${value}${unit ? ` ${unit}` : ""}`}
                  </span>
                ))}
                {remainingCount > 0 ? <span>{`+${remainingCount} more`}</span> : null}
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--ink-soft)]">No biomarkers captured</p>
          )}
        </div>
        <Link href={`/report/${report.id}`} className="shrink-0">
          <Button className="min-w-28">View Results</Button>
        </Link>
      </div>
    </Card>
  );
}
