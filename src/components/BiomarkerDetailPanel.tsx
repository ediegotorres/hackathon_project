import { Card } from "@/src/components/Card";
import { StatusChip } from "@/src/components/StatusChip";
import type { AnalysisResult } from "@/src/lib/types";

type Biomarker = AnalysisResult["biomarkers"][number];

export function BiomarkerDetailPanel({
  biomarker,
  emptyText = "Select a marker to see details.",
}: {
  biomarker: Biomarker | null;
  emptyText?: string;
}) {
  if (!biomarker) {
    return (
      <Card title="Marker Details">
        <p className="text-sm text-[var(--ink-soft)]">{emptyText}</p>
      </Card>
    );
  }

  return (
    <Card title={biomarker.label} subtitle={`${biomarker.value} ${biomarker.unit}`}>
      <div className="space-y-4">
        <StatusChip status={biomarker.status} />
        <p className="text-sm text-[var(--ink-soft)]">{biomarker.meaning || "No detail available yet."}</p>
        <div>
          <h3 className="text-sm font-semibold">Contributors</h3>
          {biomarker.contributors && biomarker.contributors.length > 0 ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
              {biomarker.contributors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-[var(--ink-soft)]">No contributors listed.</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Questions</h3>
          {biomarker.questions && biomarker.questions.length > 0 ? (
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
              {biomarker.questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-[var(--ink-soft)]">No questions listed.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
