import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
import type { AnalysisResult, LabReport } from "@/src/lib/types";

export type MarkerDisplayStatus = "high" | "borderline" | "normal" | "low" | "neutral";

export function normalizeMarkerName(name: string) {
  return name.toLowerCase().replace(/[^\da-z]+/g, " ").replace(/\s+/g, " ").trim();
}

export function mapStatus(value?: string): MarkerDisplayStatus {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "high" || normalized === "abnormal") return "high";
  if (normalized === "borderline") return "borderline";
  if (normalized === "low") return "low";
  if (normalized === "normal") return "normal";
  return "neutral";
}

export function derivedVitalsStatus(name: string, value: number): MarkerDisplayStatus | null {
  const normalized = normalizeMarkerName(name);

  if (normalized.includes("systolic blood pressure")) {
    if (value < 90) return "low";
    if (value >= 140) return "high";
    if (value >= 120) return "borderline";
    return "normal";
  }

  if (normalized.includes("diastolic blood pressure")) {
    if (value < 60) return "low";
    if (value >= 90) return "high";
    if (value >= 80) return "borderline";
    return "normal";
  }

  if (normalized === "pulse" || normalized.includes("heart rate")) {
    if (value < 60) return "low";
    if (value > 110) return "high";
    if (value > 100 && value <= 110) return "borderline";
    return "normal";
  }

  return null;
}

export function statusForAdditionalMarker(name: string, value: number, status?: string): MarkerDisplayStatus {
  const derived = derivedVitalsStatus(name, value);
  if (derived) return derived;
  return mapStatus(status);
}

export function countVisibleStatuses(statuses: MarkerDisplayStatus[]) {
  return statuses.reduce(
    (acc, status) => {
      if (status === "high") acc.highCount += 1;
      if (status === "borderline") acc.borderlineCount += 1;
      if (status === "normal") acc.normalCount += 1;
      if (status === "low") acc.lowCount += 1;
      return acc;
    },
    { highCount: 0, borderlineCount: 0, normalCount: 0, lowCount: 0 },
  );
}

export function summarizeReportStatuses(report: LabReport, analysis: AnalysisResult | null) {
  const coreBiomarkers = resolveCoreBiomarkers(report);
  const coreKeysWithValues = new Set<string>();
  const statuses: MarkerDisplayStatus[] = [];

  Object.entries(coreBiomarkers).forEach(([key, value]) => {
    if (typeof value !== "number") return;
    coreKeysWithValues.add(key);
    const match = analysis?.biomarkers.find((item) => item.key === key);
    statuses.push(mapStatus(match?.status));
  });

  (report.additionalBiomarkers ?? []).forEach((item) => {
    if (item.mappedKey && coreKeysWithValues.has(item.mappedKey)) return;
    statuses.push(statusForAdditionalMarker(item.name, item.value, item.status));
  });

  return countVisibleStatuses(statuses);
}
