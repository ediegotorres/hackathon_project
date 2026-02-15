"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { StatusChip } from "@/src/components/StatusChip";
import { generateMockAnalysis } from "@/src/lib/analyze";
import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
import { deleteReportById, loadAnalysis, loadReports } from "@/src/lib/storage";
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

type MarkerCardStatus = "high" | "borderline" | "normal" | "neutral";
type UnifiedMarker = {
  id: string;
  compareKey: string;
  label: string;
  value: number;
  unit?: string;
  status: MarkerCardStatus;
  rangeText?: string;
  meaning?: string;
  contributors?: string[];
  questions?: string[];
  coreKey?: MarkerKey;
};

function markerFromAnalysis(analysis: AnalysisResult | null, key: MarkerKey) {
  return analysis?.biomarkers.find((item) => item.key === key) ?? null;
}

function mapStatus(value?: string): MarkerCardStatus {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "high" || normalized === "abnormal") return "high";
  if (normalized === "borderline" || normalized === "low") return "borderline";
  if (normalized === "normal") return "normal";
  return "neutral";
}

function normalizeMarkerName(name: string) {
  return name.toLowerCase().replace(/[^\da-z]+/g, " ").replace(/\s+/g, " ").trim();
}

function deltaView(current?: number, previous?: number) {
  if (typeof current !== "number") {
    return { value: 0, trend: "neutral" as const };
  }
  if (typeof previous !== "number") {
    return { value: current, trend: "new" as const };
  }
  const delta = Number((current - previous).toFixed(2));
  if (delta === 0) return { value: 0, trend: "neutral" as const };
  return delta > 0 ? { value: delta, trend: "up" as const } : { value: delta, trend: "down" as const };
}

export default function ReportResultsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const reports = useMemo<LabReport[]>(() => loadReports(), []);
  const savedAnalysis = useMemo<AnalysisResult | null>(() => loadAnalysis(reportId), [reportId]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const currentReport = useMemo(
    () => reports.find((item) => item.id === reportId) ?? null,
    [reports, reportId],
  );
  const currentBiomarkers = useMemo(
    () => (currentReport ? resolveCoreBiomarkers(currentReport) : {}),
    [currentReport],
  );
  const previousReport = useMemo(() => {
    if (!currentReport) return null;
    const ordered = [...reports].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    const index = ordered.findIndex((item) => item.id === currentReport.id);
    const previous = index >= 0 ? (ordered[index + 1] ?? null) : null;
    if (!previous) return null;
    return { ...previous, biomarkers: resolveCoreBiomarkers(previous) };
  }, [reports, currentReport]);
  const fallbackAnalysis = useMemo(() => {
    if (!currentReport) return null;
    return generateMockAnalysis({ ...currentReport, biomarkers: currentBiomarkers });
  }, [currentReport, currentBiomarkers]);
  const analysis = useMemo(() => {
    if (!savedAnalysis) return fallbackAnalysis;
    if (!fallbackAnalysis) return savedAnalysis;

    const mergedMap = new Map<string, AnalysisResult["biomarkers"][number]>();
    for (const item of fallbackAnalysis.biomarkers) mergedMap.set(item.key, item);
    for (const item of savedAnalysis.biomarkers) mergedMap.set(item.key, item);

    const savedHasCounts =
      savedAnalysis.overall.highCount > 0 ||
      savedAnalysis.overall.borderlineCount > 0 ||
      savedAnalysis.overall.normalCount > 0;

    return {
      ...savedAnalysis,
      overall: savedHasCounts ? savedAnalysis.overall : fallbackAnalysis.overall,
      biomarkers: Array.from(mergedMap.values()),
    };
  }, [savedAnalysis, fallbackAnalysis]);
  const allMarkers = useMemo<UnifiedMarker[]>(() => {
    if (!currentReport) return [];

    const coreMarkers: UnifiedMarker[] = markerDefs.reduce<UnifiedMarker[]>((acc, marker) => {
      const value = currentBiomarkers[marker.key];
      if (typeof value !== "number") return acc;
      const analysisItem = markerFromAnalysis(analysis, marker.key);
      acc.push({
        id: `core-${marker.key}`,
        compareKey: `core:${marker.key}`,
        coreKey: marker.key,
        label: marker.label,
        value,
        unit: marker.unit,
        status: analysisItem?.status ?? "neutral",
        rangeText: analysisItem?.rangeText,
        meaning: analysisItem?.meaning,
        contributors: analysisItem?.contributors,
        questions: analysisItem?.questions,
      });
      return acc;
    }, []);

    const coreKeysInOverview = new Set(coreMarkers.map((item) => item.coreKey));
    const extraMarkers: UnifiedMarker[] = (currentReport.additionalBiomarkers ?? []).reduce<UnifiedMarker[]>(
      (acc, item, index) => {
        if (item.mappedKey && coreKeysInOverview.has(item.mappedKey)) {
          return acc;
        }
        acc.push({
          id: `extra-${index}-${item.name}`,
          compareKey: `extra:${normalizeMarkerName(item.name)}`,
          label: item.name,
          value: item.value,
          unit: item.unit,
          status: mapStatus(item.status),
          rangeText: item.referenceRange ? `Range ${item.referenceRange}` : undefined,
        });
        return acc;
      },
      [],
    );

    return [...coreMarkers, ...extraMarkers];
  }, [analysis, currentBiomarkers, currentReport]);
  const previousMarkerValues = useMemo(() => {
    const values = new Map<string, number>();
    if (!previousReport) return values;

    markerDefs.forEach((marker) => {
      const value = previousReport.biomarkers[marker.key];
      if (typeof value === "number") {
        values.set(`core:${marker.key}`, value);
      }
    });

    (previousReport.additionalBiomarkers ?? []).forEach((item) => {
      if (item.mappedKey) return;
      const key = normalizeMarkerName(item.name);
      if (!key) return;
      values.set(`extra:${key}`, item.value);
    });

    return values;
  }, [previousReport]);
  const activeMarker = useMemo(() => {
    if (allMarkers.length === 0) return null;
    return allMarkers.find((item) => item.id === selectedMarkerId) ?? allMarkers[0];
  }, [allMarkers, selectedMarkerId]);

  const summary = analysis?.overall ?? { highCount: 0, borderlineCount: 0, normalCount: 0 };

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

  const onDeleteReport = () => {
    setDeleting(true);
    deleteReportById(reportId);
    router.push("/history");
  };

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
          {confirmDeleteOpen ? (
            <div className="flex items-center gap-2">
              <Button variant="danger" onClick={onDeleteReport} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="border-[var(--line)] bg-[var(--surface-strong)] text-[var(--ink-soft)] hover:!border-rose-700 hover:!bg-rose-600 hover:!text-white"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete Report
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,1fr)]">
        <section className="space-y-5">
          {allMarkers.length > 0 ? (
            <Card title="Biomarker Overview" subtitle="Select a marker to view details and context.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {allMarkers.map((marker) => {
                  const isSelected = activeMarker?.id === marker.id;
                  return (
                    <button
                      key={marker.id}
                      type="button"
                      aria-label={`Select ${marker.label} marker`}
                      onClick={() => setSelectedMarkerId(marker.id)}
                      className={`rounded-2xl border p-4 text-left motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                        isSelected
                          ? "border-[var(--brand)] bg-[var(--surface-strong)] shadow-sm"
                          : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--brand)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ink-soft)]">{marker.label}</p>
                        <StatusChip status={marker.status} />
                      </div>
                      <p className="mt-2 text-2xl font-bold tracking-tight">
                        {`${marker.value} ${marker.unit ?? ""}`.trim()}
                      </p>
                      {marker.rangeText ? (
                        <p className="mt-2 text-xs font-medium text-[var(--ink-soft)]">{marker.rangeText}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {allMarkers.length > 0 ? (
            <Card title="Since Last Report">
              {previousReport ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {allMarkers.map((marker) => {
                    const delta = deltaView(marker.value, previousMarkerValues.get(marker.compareKey));
                    return (
                      <p
                        key={`delta-${marker.id}`}
                        className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{marker.label}</span>{" "}
                        <span
                          className={
                            delta.trend === "up"
                              ? "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"
                              : delta.trend === "down"
                                ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800"
                                : delta.trend === "new"
                                  ? "inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-800"
                                : "inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-0.5 font-semibold text-[var(--ink-soft)]"
                          }
                        >
                          {delta.trend === "up"
                            ? `^ +${delta.value} Elevated`
                            : delta.trend === "down"
                              ? `v ${delta.value} Improved`
                              : delta.trend === "new"
                                ? `* NEW ${delta.value}`
                                : "0 Stable"}
                        </span>
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--ink-soft)]">Add another report to see changes over time.</p>
              )}
            </Card>
          ) : null}

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
            ) : activeMarker ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-soft)]">{activeMarker.label}</p>
                  <p className="text-3xl font-bold tracking-tight">
                    {`${activeMarker.value} ${activeMarker.unit ?? ""}`.trim()}
                  </p>
                </div>
                {activeMarker.meaning || activeMarker.contributors?.length || activeMarker.questions?.length ? (
                  <>
                    <section>
                      <h3 className="text-sm font-semibold">What it means</h3>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">
                        {activeMarker.meaning || "Use the provided range and clinical context to interpret this value."}
                      </p>
                    </section>
                    <section>
                      <h3 className="text-sm font-semibold">Common contributors</h3>
                      {activeMarker.contributors?.length ? (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                          {activeMarker.contributors.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">Details not available for this marker.</p>
                      )}
                    </section>
                    <section>
                      <h3 className="text-sm font-semibold">Questions</h3>
                      {activeMarker.questions?.length ? (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                          {activeMarker.questions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-[var(--ink-soft)]">Details not available for this marker.</p>
                      )}
                    </section>
                  </>
                ) : (
                  <section>
                    <h3 className="text-sm font-semibold">What it means</h3>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {activeMarker.rangeText
                        ? `Use this reported range for context: ${activeMarker.rangeText}.`
                        : "No interpretation text was generated for this marker."}
                    </p>
                  </section>
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
