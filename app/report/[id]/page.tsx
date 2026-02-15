"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { StatusChip } from "@/src/components/StatusChip";
import { generateMockAnalysis } from "@/src/lib/analyze";
import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
import { normalizeMarkerName, statusForAdditionalMarker, summarizeReportStatuses } from "@/src/lib/markerStatus";
import { deleteReportById, loadAnalysis, loadReports } from "@/src/lib/storage";
import type { AnalysisResult, Biomarkers, LabReport } from "@/src/lib/types";
import { formatDate, makeId } from "@/src/lib/utils";

type MarkerKey = keyof Biomarkers;

const markerDefs: Array<{ key: MarkerKey; label: string; unit: string }> = [
  { key: "redBloodCellCount", label: "RBC Count", unit: "million cells/mcL" },
  { key: "Haemoglobin", label: "Haemoglobin", unit: "g/dL" },
  { key: "Glucose", label: "Glucose", unit: "mg/dL" },
  { key: "Creatinine", label: "Creatinine", unit: "mg/dL" },
  { key: "Urea", label: "Urea", unit: "mg/dL" },
  { key: "Cholesterol", label: "Cholesterol", unit: "mg/dL" },
  { key: "ALT", label: "ALT", unit: "U/L" },
  { key: "AST", label: "AST", unit: "U/L" },
  { key: "ALP", label: "ALP", unit: "U/L" },
  { key: "Bilirubin", label: "Bilirubin", unit: "mg/dL" },
  { key: "Albumin", label: "Albumin", unit: "g/dL" },
  { key: "GFR", label: "GFR", unit: "mL/min" },
  { key: "BUN", label: "BUN", unit: "mg/dL" },
  { key: "Sodium", label: "Sodium", unit: "mEq/L" },
  { key: "Potassium", label: "Potassium", unit: "mEq/L" },
  { key: "Calcium", label: "Calcium", unit: "mg/dL" },
  { key: "TSH", label: "TSH", unit: "mIU/L" },
  { key: "FT4", label: "FT4", unit: "ng/dL" },
];

type MarkerCardStatus = "high" | "borderline" | "normal" | "low" | "neutral";
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

type MarkerEducation = {
  aliases: string[];
  whatIsIt: string;
  whyItMatters: string;
  contributors?: string[];
  questions?: string[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function markerFromAnalysis(analysis: AnalysisResult | null, key: MarkerKey) {
  return analysis?.biomarkers.find((item) => item.key === key) ?? null;
}

function bloodPressureContext(name: string) {
  const normalized = normalizeMarkerName(name);

  if (normalized.includes("systolic blood pressure")) {
    return {
      rangeText: "Typical resting range: 90-120 mmHg",
      meaning:
        "Systolic pressure is the top blood pressure number and reflects artery pressure while the heart beats.",
      contributors: [
        "Recent stress, caffeine, or activity before measurement",
        "Hydration status and sleep quality",
        "Cuff size/positioning and measurement technique",
      ],
      questions: [
        "Should I collect a 7-day home BP average for better context?",
        "What systolic target fits my age and risk profile?",
      ],
    };
  }

  if (normalized.includes("diastolic blood pressure")) {
    return {
      rangeText: "Typical resting range: 60-80 mmHg",
      meaning:
        "Diastolic pressure is the bottom blood pressure number and reflects artery pressure between heart beats.",
      contributors: [
        "Stress, stimulants, and recovery state",
        "Sleep consistency and daily sodium intake",
        "Measurement timing and seated rest before reading",
      ],
      questions: [
        "Do these diastolic readings warrant repeat checks at home?",
        "How should I monitor trends versus one-off readings?",
      ],
    };
  }

  if (normalized === "pulse" || normalized.includes("heart rate")) {
    return {
      rangeText: "Typical resting range: 60-100 bpm",
      meaning:
        "Pulse reflects heart beats per minute and can vary with activity, stress, hydration, and medication.",
      contributors: [
        "Recent movement, anxiety, caffeine, or illness",
        "Hydration, sleep, and cardiorespiratory fitness",
        "Time of day and device measurement accuracy",
      ],
      questions: [
        "Should I track resting pulse at the same time each day?",
        "At what threshold should I seek follow-up if symptoms occur?",
      ],
    };
  }

  return null;
}

const markerEducationLibrary: MarkerEducation[] = [
  {
    aliases: ["haemoglobin", "hemoglobin", "hb", "hgb"],
    whatIsIt:
      "Haemoglobin is the oxygen-carrying protein inside red blood cells. It helps move oxygen from your lungs to your body.",
    whyItMatters:
      "If haemoglobin is low, you may feel tired, weak, or short of breath. If high, it can reflect dehydration, smoking, altitude, or other conditions.",
    contributors: ["Iron, B12, and folate status", "Hydration level", "Blood loss or chronic disease"],
    questions: [
      "Could this value explain fatigue, breathlessness, or low stamina?",
      "Do I need iron, B12, folate, or ferritin testing?",
      "When should I repeat a complete blood count?",
    ],
  },
  {
    aliases: ["red blood cell count", "rbc count", "rbc"],
    whatIsIt: "Red blood cell count is the number of red blood cells in a blood sample.",
    whyItMatters:
      "It helps assess oxygen delivery and can support anemia evaluation when interpreted with haemoglobin, MCV, and related markers.",
  },
  {
    aliases: ["pcv", "hematocrit", "haematocrit", "hct"],
    whatIsIt: "PCV (hematocrit) is the percentage of blood volume made up by red blood cells.",
    whyItMatters:
      "It helps show whether blood is relatively diluted or concentrated and supports interpretation of anemia or dehydration.",
  },
  {
    aliases: ["mean corpuscular volume", "mcv"],
    whatIsIt: "MCV is the average size of your red blood cells.",
    whyItMatters: "It helps classify anemia patterns, for example smaller cells versus larger cells.",
  },
  {
    aliases: ["mean corpuscular hemoglobin", "mch"],
    whatIsIt: "MCH is the average amount of hemoglobin in each red blood cell.",
    whyItMatters: "It helps add context to red blood cell indices when evaluating anemia patterns.",
  },
  {
    aliases: ["mean corpuscular hemoglobin concentration", "mchc"],
    whatIsIt: "MCHC is the concentration of hemoglobin inside red blood cells.",
    whyItMatters: "It helps evaluate whether red blood cells are relatively pale or concentrated in hemoglobin.",
  },
  {
    aliases: ["rdw", "rdw cv", "rdw sd"],
    whatIsIt: "RDW shows how much red blood cell sizes vary from each other.",
    whyItMatters:
      "Higher variation can support early nutritional deficiency or mixed blood cell populations, alongside other CBC markers.",
  },
  {
    aliases: ["total wbc count", "white blood cell count", "wbc count", "wbc"],
    whatIsIt: "Total WBC count is the number of white blood cells that help fight infection and inflammation.",
    whyItMatters:
      "Very low or high values can reflect infection, inflammation, medication effects, or bone marrow-related conditions.",
  },
  {
    aliases: ["neutrophils", "neu%", "neutrophils %"],
    whatIsIt: "Neutrophils are white blood cells that respond quickly to bacterial infections and acute inflammation.",
    whyItMatters: "Shifts can happen with infection, stress, steroid use, and inflammatory conditions.",
  },
  {
    aliases: ["lymphocytes", "lym%", "lymphocytes %"],
    whatIsIt: "Lymphocytes are white blood cells involved in immune memory, viral defense, and antibody responses.",
    whyItMatters: "Changes can occur with viral illness, immune conditions, stress responses, and some medications.",
  },
  {
    aliases: ["monocytes", "mon%", "monocytes %"],
    whatIsIt: "Monocytes are immune cells involved in cleanup and longer-term inflammatory responses.",
    whyItMatters: "Persistent shifts can reflect chronic inflammation or recovery phase after infection.",
  },
  {
    aliases: ["eosinophils", "eos%", "eosinophils %"],
    whatIsIt: "Eosinophils are white blood cells often linked to allergy, asthma, and some parasitic infections.",
    whyItMatters: "Higher values can suggest allergic or eosinophilic inflammatory patterns in context.",
  },
  {
    aliases: ["basophils", "bas%", "basophils %"],
    whatIsIt: "Basophils are a small white blood cell population involved in allergic and inflammatory signaling.",
    whyItMatters: "Large changes are uncommon and should be interpreted with total white cell patterns.",
  },
  {
    aliases: ["platelet count", "platelet", "plt"],
    whatIsIt: "Platelets are cell fragments that help blood clot and stop bleeding.",
    whyItMatters:
      "Low counts can increase bleeding risk; very high counts can be reactive or occasionally increase clotting risk.",
  },
];

function findMarkerEducation(name: string) {
  const normalized = normalizeMarkerName(name);
  if (!normalized) return null;

  for (const entry of markerEducationLibrary) {
    const matched = entry.aliases.some((alias) => {
      const aliasNormalized = normalizeMarkerName(alias);
      return (
        normalized === aliasNormalized ||
        normalized.includes(aliasNormalized) ||
        aliasNormalized.includes(normalized)
      );
    });
    if (matched) return entry;
  }
  return null;
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
  const [rightPanelTab, setRightPanelTab] = useState<"details" | "chat">("details");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "Ask me about this report or trends versus your previous report. I can explain markers in plain language.",
    },
  ]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

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
        const context = bloodPressureContext(item.name);
        acc.push({
          id: `extra-${index}-${item.name}`,
          compareKey: `extra:${normalizeMarkerName(item.name)}`,
          label: item.name,
          value: item.value,
          unit: item.unit,
          status: statusForAdditionalMarker(item.name, item.value, item.status),
          rangeText: item.referenceRange ? `Range ${item.referenceRange}` : context?.rangeText,
          meaning: context?.meaning,
          contributors: context?.contributors,
          questions: context?.questions,
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
  const activeMarkerEducation = useMemo(() => {
    if (!activeMarker) return null;
    return findMarkerEducation(activeMarker.label);
  }, [activeMarker]);
  const activeContributorItems = useMemo(() => {
    if (!activeMarker) return [];
    if (activeMarker.contributors?.length) return activeMarker.contributors;
    return activeMarkerEducation?.contributors ?? [];
  }, [activeMarker, activeMarkerEducation]);
  const activeQuestionItems = useMemo(() => {
    if (!activeMarker) return [];
    if (activeMarker.questions?.length) return activeMarker.questions;
    return activeMarkerEducation?.questions ?? [];
  }, [activeMarker, activeMarkerEducation]);

  const summary = useMemo(
    () =>
      currentReport
        ? summarizeReportStatuses(currentReport, analysis)
        : { highCount: 0, borderlineCount: 0, normalCount: 0, lowCount: 0 },
    [analysis, currentReport],
  );

  useEffect(() => {
    if (rightPanelTab !== "chat") return;
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, rightPanelTab]);

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

  const onSendChatMessage = async () => {
    if (chatLoading) return;
    const question = chatInput.trim();
    if (!question || !currentReport) return;

    const userMessage: ChatMessage = {
      id: makeId("user-chat"),
      role: "user",
      content: question,
    };
    const nextConversation = [...chatMessages, userMessage];

    setChatMessages(nextConversation);
    setChatInput("");
    setChatError("");
    setChatLoading(true);

    try {
      const normalizedCurrentReport: LabReport = {
        ...currentReport,
        biomarkers: currentBiomarkers,
      };

      const response = await fetch("/api/report-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          currentReport: normalizedCurrentReport,
          previousReport: previousReport ?? null,
          summaryText: analysis?.summaryText ?? null,
          conversation: nextConversation.map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to get AI response.");
      }

      const answer = payload.answer?.trim() || "I could not generate a response from the report data.";
      setChatMessages((prev) => [
        ...prev,
        {
          id: makeId("assistant-chat"),
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get AI response.";
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
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
            High {summary.highCount} | Borderline {summary.borderlineCount} | Normal {summary.normalCount} | Low {summary.lowCount}
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
          <Card title={rightPanelTab === "details" ? "Marker Details" : "AI Chat"}>
            <div className="mb-4 inline-flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
              <button
                type="button"
                onClick={() => setRightPanelTab("details")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  rightPanelTab === "details"
                    ? "bg-white text-[var(--ink)] shadow-sm"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                Marker Details
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab("chat")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  rightPanelTab === "chat"
                    ? "bg-white text-[var(--ink)] shadow-sm"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                Ask AI
              </button>
            </div>

            {rightPanelTab === "details" ? (
              !analysis ? (
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
                  <section>
                    <h3 className="text-sm font-semibold">What this marker is</h3>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {activeMarkerEducation?.whatIsIt ||
                        `${activeMarker.label} is a reported lab marker from this panel. Interpret it with trends and clinical context.`}
                    </p>
                  </section>
                  <section>
                    <h3 className="text-sm font-semibold">Why it matters</h3>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {activeMarker.meaning ||
                        activeMarkerEducation?.whyItMatters ||
                        (activeMarker.rangeText
                          ? `Use this reported range for context: ${activeMarker.rangeText}.`
                          : "No interpretation text was generated for this marker.")}
                    </p>
                  </section>
                  {activeContributorItems.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-semibold">Common contributors</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                        {activeContributorItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {activeQuestionItems.length > 0 ? (
                    <section>
                      <h3 className="text-sm font-semibold">Questions</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                        {activeQuestionItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
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
              )
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--ink-soft)]">Ask about this report or trends versus your previous report.</p>

                <div
                  ref={chatScrollRef}
                  className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
                >
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "ml-8 bg-teal-600 text-white"
                          : "mr-8 border border-[var(--line)] bg-white text-[var(--ink)]"
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                  {chatLoading ? <p className="text-xs text-[var(--ink-soft)]">AI is thinking...</p> : null}
                </div>

                {chatError ? <p className="text-xs text-[var(--danger)]">{chatError}</p> : null}

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void onSendChatMessage();
                      }
                    }}
                    disabled={chatLoading}
                    placeholder="Ask: Why is my RBC borderline? How did this change from last report?"
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                  />
                  <Button
                    type="button"
                    className="h-9 w-full"
                    onClick={() => void onSendChatMessage()}
                    disabled={chatLoading}
                  >
                    {chatLoading ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
