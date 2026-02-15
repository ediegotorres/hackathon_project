import type { AnalysisResult, LabReport, UserProfile } from "@/src/lib/types";

const PROFILE_KEY = "lablens.profile";
const REPORTS_KEY = "lablens.reports";
const ANALYSIS_PREFIX = "lablens.analysis.";
const DEMO_MODE_KEY = "lablens.demoMode";

function isBrowser() {
  return typeof window !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadProfile(): UserProfile | null {
  if (!isBrowser()) return null;
  return safeParse<UserProfile | null>(window.localStorage.getItem(PROFILE_KEY), null);
}

export function saveProfile(profile: UserProfile) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadReports(): LabReport[] {
  if (!isBrowser()) return [];
  const reports = safeParse<LabReport[]>(window.localStorage.getItem(REPORTS_KEY), []);
  return reports.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

export function saveReports(reports: LabReport[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function loadAnalysis(reportId: string): AnalysisResult | null {
  if (!isBrowser()) return null;
  return safeParse<AnalysisResult | null>(
    window.localStorage.getItem(`${ANALYSIS_PREFIX}${reportId}`),
    null,
  );
}

export function saveAnalysis(reportId: string, analysis: AnalysisResult) {
  if (!isBrowser()) return;
  window.localStorage.setItem(`${ANALYSIS_PREFIX}${reportId}`, JSON.stringify(analysis));
}

export function deleteReportById(reportId: string) {
  if (!isBrowser()) return;
  const reports = loadReports().filter((report) => report.id !== reportId);
  saveReports(reports);
  window.localStorage.removeItem(`${ANALYSIS_PREFIX}${reportId}`);
}

export function setDemoMode(mode: "sample" | "none") {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEMO_MODE_KEY, mode);
}

export function loadDemoMode(): "sample" | "none" {
  if (!isBrowser()) return "none";
  const value = window.localStorage.getItem(DEMO_MODE_KEY);
  return value === "sample" ? "sample" : "none";
}

export function clearLabLensData() {
  if (!isBrowser()) return;
  const keys = Object.keys(window.localStorage);
  keys.forEach((key) => {
    if (key === PROFILE_KEY || key === REPORTS_KEY || key.startsWith(ANALYSIS_PREFIX) || key === DEMO_MODE_KEY) {
      window.localStorage.removeItem(key);
    }
  });
}
