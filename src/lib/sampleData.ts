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
      {
        redBloodCellCount: 4.2,
        Haemoglobin: 13.8,
        Glucose: 118,
        Creatinine: 1.1,
        Urea: 28,
        Cholesterol: 238,
        ALT: 35,
        AST: 32,
        ALP: 72,
        Bilirubin: 0.8,
        Albumin: 4.0,
        GFR: 68,
        BUN: 26,
        Sodium: 140,
        Potassium: 4.1,
        Calcium: 9.5,
        TSH: 2.3,
        FT4: 1.1,
      },
      "Initial panel with elevated cholesterol and borderline glucose markers.",
    ),
    makeReport(
      "2025-11-20",
      {
        redBloodCellCount: 4.3,
        Haemoglobin: 14.0,
        Glucose: 105,
        Creatinine: 1.0,
        Urea: 24,
        Cholesterol: 215,
        ALT: 28,
        AST: 28,
        ALP: 68,
        Bilirubin: 0.7,
        Albumin: 4.2,
        GFR: 72,
        BUN: 22,
        Sodium: 141,
        Potassium: 4.2,
        Calcium: 9.6,
        TSH: 2.1,
        FT4: 1.15,
      },
      "Improving trend after diet and exercise changes.",
    ),
    makeReport(
      "2026-01-25",
      {
        redBloodCellCount: 4.4,
        Haemoglobin: 14.2,
        Glucose: 95,
        Creatinine: 0.9,
        Urea: 22,
        Cholesterol: 192,
        ALT: 24,
        AST: 26,
        ALP: 65,
        Bilirubin: 0.6,
        Albumin: 4.3,
        GFR: 76,
        BUN: 20,
        Sodium: 142,
        Potassium: 4.3,
        Calcium: 9.7,
        TSH: 2.0,
        FT4: 1.2,
      },
      "Latest panel shows broad improvements across all metabolic markers.",
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
