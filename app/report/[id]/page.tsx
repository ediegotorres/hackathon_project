"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { StatusChip } from "@/src/components/StatusChip";
import { loadAnalysis, loadReports } from "@/src/lib/storage";
import type { AnalysisResult, Biomarkers, LabReport } from "@/src/lib/types";
import { formatDate } from "@/src/lib/utils";

type MarkerKey = keyof Biomarkers;

const markerDefs: Array<{ key: MarkerKey; label: string; unit: string }> = [
  { key: "ldl", label: "LDL", unit: "mg/dL" },
  { key: "hdl", label: "HDL", unit: "mg/dL" },
  { key: "totalChol", label: "Total Chol", unit: "mg/dL" },
  { key: "triglycerides", label: "TG", unit: "mg/dL" },
  { key: "glucose", label: "Glucose", unit: "mg/dL" },
  { key: "a1c", label: "A1C", unit: "%" },
];

function markerFromAnalysis(analysis: AnalysisResult | null, key: MarkerKey) {
  return analysis?.biomarkers.find((item) => item.key === key) ?? null;
}

function deltaView(current?: number, previous?: number) {
  if (typeof current !== "number" || typeof previous !== "number") {
    return { text: "--", trend: "neutral" as const };
  }
  const delta = Number((current - previous).toFixed(2));
  if (delta === 0) return { text: "0", trend: "neutral" as const };
  return delta > 0
    ? { text: `UP +${delta}`, trend: "up" as const }
    : { text: `DOWN ${delta}`, trend: "down" as const };
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-48 rounded bg-slate-200 motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="h-32 rounded-xl bg-slate-200 motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="h-32 rounded-xl bg-slate-200 motion-safe:animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

export default function ReportResultsPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [reports, setReports] = useState<LabReport[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<MarkerKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const nextReports = loadReports();
    const currentReport = nextReports.find((item) => item.id === reportId);
    setReports(nextReports);
    setAnalysis(loadAnalysis(reportId));
    if (currentReport) {
      const firstPresent = markerDefs.find((def) => typeof currentReport.biomarkers[def.key] === "number");
      setSelectedKey((firstPresent?.key ?? markerDefs[0].key) as MarkerKey);
    }
    const timer = setTimeout(() => setLoading(false), 280);
    return () => clearTimeout(timer);
  }, [reportId]);

  const currentReport = useMemo(
    () => reports.find((item) => item.id === reportId) ?? null,
    [reports, reportId],
  );
  const previousReport = useMemo(() => {
    if (!currentReport) return null;
    const ordered = [...reports].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    const index = ordered.findIndex((item) => item.id === currentReport.id);
    return index >= 0 ? (ordered[index + 1] ?? null) : null;
  }, [reports, currentReport]);

  const selectedMarkerAnalysis = selectedKey ? markerFromAnalysis(analysis, selectedKey) : null;
  const selectedDef = markerDefs.find((def) => def.key === selectedKey) ?? null;
  const selectedValue = selectedKey && currentReport ? currentReport.biomarkers[selectedKey] : undefined;
  const summary = analysis?.overall ?? { highCount: 0, borderlineCount: 0, normalCount: 0 };

  if (loading) {
    return <Skeleton />;
  }

  if (!currentReport) {
    return (
      <EmptyState
        title="Report not found"
        description="This report does not exist in local storage."
        action={
          <div className="flex justify-center gap-2">
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
            <Link href="/new-report">
              <Button>New Report</Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Results</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">{formatDate(currentReport.dateISO)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold">
            High {summary.highCount} | Borderline {summary.borderlineCount} | Normal {summary.normalCount}
          </p>
          <Link href="/history">
            <Button variant="secondary">Back to History</Button>
          </Link>
          <Link href="/new-report">
            <Button>New Report</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,1fr)]">
        <section className="space-y-5">
          <Card title="Biomarker Overview" subtitle="Select a marker to view details and context.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {markerDefs.map((marker) => {
                const value = currentReport.biomarkers[marker.key];
                const analysisItem = markerFromAnalysis(analysis, marker.key);
                const isSelected = selectedKey === marker.key;
                const status = analysisItem?.status ?? "neutral";
                return (
                  <button
                    key={marker.key}
                    type="button"
                    aria-label={`Select ${marker.label} marker`}
                    onClick={() => setSelectedKey(marker.key)}
                    className={`rounded-2xl border p-4 text-left motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                      isSelected
                        ? "border-[var(--brand)] bg-teal-50/50 shadow-sm"
                        : "border-[var(--line)] bg-white hover:border-teal-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--ink-soft)]">{marker.label}</p>
                      <StatusChip status={status} label={analysisItem ? undefined : "Saved"} />
                    </div>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                      {typeof value === "number" ? `${value} ${marker.unit}` : "Not provided"}
                    </p>
                    {analysisItem?.rangeText ? (
                      <p className="mt-2 text-xs font-medium text-[var(--ink-soft)]">{analysisItem.rangeText}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Since Last Report">
            {previousReport ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {markerDefs.map((marker) => {
                  const delta = deltaView(currentReport.biomarkers[marker.key], previousReport.biomarkers[marker.key]);
                  return (
                    <p key={marker.key} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
                      <span className="font-medium">{marker.label}</span>{" "}
                      <span
                        className={
                          delta.trend === "up"
                            ? "text-amber-700"
                            : delta.trend === "down"
                              ? "text-emerald-700"
                              : "text-[var(--ink-soft)]"
                        }
                      >
                        {delta.text}
                      </span>
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-soft)]">Add another report to see changes over time.</p>
            )}
          </Card>

          <Card title="Plain English Summary">
            <p className="text-sm text-[var(--ink-soft)]">{analysis?.summaryText || "Analysis not available yet."}</p>
          </Card>
          <Card title="Next Steps">
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
              {(analysis?.nextSteps.length
                ? analysis.nextSteps
                : [
                    "Review trends across multiple reports.",
                    "Track changes before your next lab draw.",
                    "Use this view to prepare for clinician discussions.",
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
          <Card title="Questions for Clinician">
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
              {(analysis?.doctorQuestions.length
                ? analysis.doctorQuestions
                : [
                    "Which markers should be prioritized for follow-up?",
                    "How often should these labs be repeated?",
                    "What additional context would improve interpretation?",
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card title="Marker Details">
            {!analysis ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--ink-soft)]">No analysis saved for this report yet.</p>
                <div className="flex gap-2">
                  <Link href="/dashboard">
                    <Button variant="secondary">Back to Dashboard</Button>
                  </Link>
                  <Link href="/new-report">
                    <Button>New Report</Button>
                  </Link>
                </div>
              </div>
            ) : selectedDef ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-soft)]">{selectedDef.label}</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {typeof selectedValue === "number" ? `${selectedValue} ${selectedDef.unit}` : "Not provided"}
                  </p>
                </div>
                {selectedMarkerAnalysis ? (
                  <>
                    <section>
                      <h3 className="text-sm font-semibold">What it means</h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {selectedMarkerAnalysis.meaning || "Details not available for this marker."}
                      </p>
                    </section>
                    <section>
                      <h3 className="text-sm font-semibold">Common contributors</h3>
                      {selectedMarkerAnalysis.contributors?.length ? (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                          {selectedMarkerAnalysis.contributors.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">Details not available for this marker.</p>
                      )}
                    </section>
                    <section>
                      <h3 className="text-sm font-semibold">Questions</h3>
                      {selectedMarkerAnalysis.questions?.length ? (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                          {selectedMarkerAnalysis.questions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">Details not available for this marker.</p>
                      )}
                    </section>
                  </>
                ) : (
                  <p className="text-sm text-[var(--ink-soft)]">Details not available for this marker.</p>
                )}
                <section>
                  <h3 className="text-sm font-semibold">What to ask your clinician</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                    <li>What trend matters most in my context?</li>
                    <li>What follow-up timing is appropriate?</li>
                    <li>Which related tests would add clarity?</li>
                  </ul>
                </section>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-soft)]">Select a marker to see details.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

