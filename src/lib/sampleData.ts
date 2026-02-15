import { generateMockAnalysis } from "@/src/lib/analyze";
import { saveAnalysis, saveProfile, saveReports, setDemoMode } from "@/src/lib/storage";
import type { AnalysisResult, LabReport, UserProfile } from "@/src/lib/types";
import { makeId } from "@/src/lib/utils";

function makeReport(dateISO: string, biomarkers: LabReport["biomarkers"], notes: string): LabReport {
  return {
    id: makeId("report"),
    dateISO,
    biomarkers,
    notes,
    createdAtISO: new Date().toISOString(),
  };
}

export async function seedSampleData() {
  const profile: UserProfile = {
    id: makeId("profile"),
    name: "Jane Doe",
    age: 38,
    sexAtBirth: "female",
    heightCm: 168,
    weightKg: 72,
    activityLevel: "moderate",
    goals: "Improve LDL and fasting glucose trends before annual checkup.",
    lifestyleNotes: "Walks 4x/week, reduced late-night snacking over last 2 months.",
  };

  const reports = [
    makeReport(
      "2025-09-01",
      { totalChol: 232, ldl: 156, hdl: 44, triglycerides: 188, glucose: 108, a1c: 5.9 },
      "Initial panel with elevated LDL and borderline glucose markers.",
    ),
    makeReport(
      "2025-11-20",
      { totalChol: 218, ldl: 142, hdl: 49, triglycerides: 162, glucose: 103, a1c: 5.7 },
      "Improving trend after diet and training changes.",
    ),
    makeReport(
      "2026-01-25",
      { totalChol: 198, ldl: 124, hdl: 54, triglycerides: 138, glucose: 96, a1c: 5.5 },
      "Latest panel shows broad improvements and better metabolic markers.",
    ),
  ].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  saveProfile(profile);
  saveReports(reports);
  for (const report of reports) {
    let analysis: AnalysisResult;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, report }),
      });
      if (!response.ok) throw new Error("Sample analysis API request failed.");
      analysis = (await response.json()) as AnalysisResult;
    } catch {
      analysis = generateMockAnalysis(report, profile);
    }
    saveAnalysis(report.id, analysis);
  }
  setDemoMode("sample");

  return { profile, reports };
}
