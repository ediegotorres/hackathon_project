import Link from "next/link";
import { Button } from "@/src/components/Button";
import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
import type { LabReport } from "@/src/lib/types";
import { Card } from "@/src/components/Card";
import { formatDate } from "@/src/lib/utils";

export function ReportListItem({ report }: { report: LabReport }) {
  const coreBiomarkers = resolveCoreBiomarkers(report);
  const coreEntries = [
    ["Cholesterol", coreBiomarkers.Cholesterol, "mg/dL"],
    ["Glucose", coreBiomarkers.Glucose, "mg/dL"],
    ["Haemoglobin", coreBiomarkers.Haemoglobin, "g/dL"],
    ["Creatinine", coreBiomarkers.Creatinine, "mg/dL"],
    ["TSH", coreBiomarkers.TSH, "mIU/L"],
    ["ALT", coreBiomarkers.ALT, "U/L"],
    ["Urea", coreBiomarkers.Urea, "mg/dL"],
    ["AST", coreBiomarkers.AST, "U/L"],
    ["ALP", coreBiomarkers.ALP, "U/L"],
    ["Bilirubin", coreBiomarkers.Bilirubin, "mg/dL"],
    ["Albumin", coreBiomarkers.Albumin, "g/dL"],
    ["GFR", coreBiomarkers.GFR, "mL/min"],
    ["BUN", coreBiomarkers.BUN, "mg/dL"],
    ["Sodium", coreBiomarkers.Sodium, "mEq/L"],
    ["Potassium", coreBiomarkers.Potassium, "mEq/L"],
    ["Calcium", coreBiomarkers.Calcium, "mg/dL"],
    ["FT4", coreBiomarkers.FT4, "ng/dL"],
    ["Red Blood Cell Count", coreBiomarkers.redBloodCellCount, "million cells/mcL"],
  ].filter((entry) => typeof entry[1] === "number") as Array<[string, number, string]>;

  const coreKeysWithValues = new Set(coreEntries.map(([label]) => label));
  const extraEntries = (report.additionalBiomarkers ?? [])
    .filter((item) => {
      if (!item.mappedKey) return true;
      const mappedLabel = item.mappedKey === "Cholesterol" ? "Cholesterol" :
        item.mappedKey === "Glucose" ? "Glucose" :
        item.mappedKey === "Haemoglobin" ? "Haemoglobin" :
        item.mappedKey === "Creatinine" ? "Creatinine" :
        item.mappedKey === "TSH" ? "TSH" :
        item.mappedKey === "ALT" ? "ALT" :
        item.mappedKey === "Urea" ? "Urea" :
        item.mappedKey === "AST" ? "AST" :
        item.mappedKey === "ALP" ? "ALP" :
        item.mappedKey === "Bilirubin" ? "Bilirubin" :
        item.mappedKey === "Albumin" ? "Albumin" :
        item.mappedKey === "GFR" ? "GFR" :
        item.mappedKey === "BUN" ? "BUN" :
        item.mappedKey === "Sodium" ? "Sodium" :
        item.mappedKey === "Potassium" ? "Potassium" :
        item.mappedKey === "Calcium" ? "Calcium" :
        item.mappedKey === "FT4" ? "FT4" :
        item.mappedKey === "redBloodCellCount" ? "Red Blood Cell Count" : null;
      return !mappedLabel || !coreKeysWithValues.has(mappedLabel);
    })
    .map((item) => [item.name, item.value, item.unit ?? ""] as [string, number, string]);

  const allEntries = [...coreEntries, ...extraEntries];
  const previewEntries = allEntries.slice(0, 6);
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
