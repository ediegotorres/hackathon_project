import type { AnalysisResult, Biomarkers, LabReport, Status, UserProfile } from "@/src/lib/types";

type BiomarkerDef = {
  key: keyof Biomarkers;
  label: string;
  unit: string;
  highAt: number;
  borderlineAt: number;
  inverse?: boolean;
  rangeText: string;
  meaning: string;
  questions: string[];
};

const biomarkerDefs: BiomarkerDef[] = [
  {
    key: "totalChol",
    label: "Total Cholesterol",
    unit: "mg/dL",
    highAt: 240,
    borderlineAt: 200,
    rangeText: "Optimal < 200, Borderline 200-239, High >= 240",
    meaning: "Tracks overall cholesterol burden.",
    questions: ["Should I adjust dietary fat quality?", "Do I need repeat lipid testing?"],
  },
  {
    key: "ldl",
    label: "LDL",
    unit: "mg/dL",
    highAt: 160,
    borderlineAt: 130,
    rangeText: "Optimal < 130, Borderline 130-159, High >= 160",
    meaning: "Higher LDL can increase long-term cardiovascular risk.",
    questions: ["Would a repeat fasting panel help?", "How aggressive should LDL reduction be?"],
  },
  {
    key: "hdl",
    label: "HDL",
    unit: "mg/dL",
    highAt: 40,
    borderlineAt: 50,
    inverse: true,
    rangeText: "Lower is generally less protective. Goal >= 50",
    meaning: "HDL is one marker related to lipid transport.",
    questions: ["How can activity and nutrition improve HDL?", "Should I track this quarterly?"],
  },
  {
    key: "triglycerides",
    label: "Triglycerides",
    unit: "mg/dL",
    highAt: 200,
    borderlineAt: 150,
    rangeText: "Optimal < 150, Borderline 150-199, High >= 200",
    meaning: "Can reflect metabolic and dietary patterns.",
    questions: ["Could refined carbs be affecting this value?", "Should I check insulin resistance markers?"],
  },
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    highAt: 126,
    borderlineAt: 100,
    rangeText: "Typical fasting target < 100, Borderline 100-125, High >= 126",
    meaning: "Helps monitor blood sugar trends.",
    questions: ["Should I pair this with continuous monitoring?", "What lifestyle targets matter most?"],
  },
  {
    key: "a1c",
    label: "Hemoglobin A1c",
    unit: "%",
    highAt: 6.5,
    borderlineAt: 5.7,
    rangeText: "Typical target < 5.7, Borderline 5.7-6.4, High >= 6.5",
    meaning: "Represents average blood glucose over ~3 months.",
    questions: ["How often should I re-test A1c?", "What is my realistic A1c target?"],
  },
];

function statusForValue(value: number, def: BiomarkerDef): Status {
  if (def.inverse) {
    if (value < def.highAt) return "high";
    if (value < def.borderlineAt) return "borderline";
    return "normal";
  }

  if (value >= def.highAt) return "high";
  if (value >= def.borderlineAt) return "borderline";
  return "normal";
}

function scoreStatus(value: number, normalMax: number, borderlineMax: number): Status {
  if (value > borderlineMax) return "high";
  if (value > normalMax) return "borderline";
  return "normal";
}

export function generateMockAnalysis(report: LabReport, profile?: UserProfile | null): AnalysisResult {
  const biomarkerItems = biomarkerDefs
    .map((def) => {
      const value = report.biomarkers[def.key];
      if (typeof value !== "number") return null;
      const status = statusForValue(value, def);
      const contributors = [
        profile?.activityLevel ? `Activity level: ${profile.activityLevel}` : null,
        profile?.goals ? `Goal context: ${profile.goals}` : null,
      ].filter(Boolean) as string[];

      return {
        key: def.key,
        label: def.label,
        value: Number(value.toFixed(2)),
        unit: def.unit,
        status,
        rangeText: def.rangeText,
        meaning: def.meaning,
        contributors,
        questions: def.questions,
      };
    })
    .filter(Boolean) as AnalysisResult["biomarkers"];

  const counts = biomarkerItems.reduce(
    (acc, item) => {
      if (item.status === "high") acc.highCount += 1;
      if (item.status === "borderline") acc.borderlineCount += 1;
      if (item.status === "normal") acc.normalCount += 1;
      return acc;
    },
    { highCount: 0, borderlineCount: 0, normalCount: 0 },
  );

  const totalChol = report.biomarkers.totalChol;
  const hdl = report.biomarkers.hdl;
  const ldl = report.biomarkers.ldl;
  const glucose = report.biomarkers.glucose;
  const a1c = report.biomarkers.a1c;
  const derived: AnalysisResult["derived"] = [];

  if (typeof totalChol === "number" && typeof hdl === "number" && hdl > 0) {
    const ratio = Number((totalChol / hdl).toFixed(2));
    derived.push({
      key: "tc_hdl_ratio",
      label: "Total Chol / HDL Ratio",
      value: ratio,
      status: scoreStatus(ratio, 3.5, 5),
    });
  }

  if (typeof totalChol === "number" && typeof hdl === "number") {
    const nonHdl = Number((totalChol - hdl).toFixed(1));
    derived.push({
      key: "non_hdl",
      label: "Non-HDL Cholesterol",
      value: nonHdl,
      unit: "mg/dL",
      status: scoreStatus(nonHdl, 130, 160),
    });
  }

  if (typeof glucose === "number" && typeof a1c === "number") {
    const eAG = Number((28.7 * a1c - 46.7).toFixed(1));
    derived.push({
      key: "estimated_avg_glucose",
      label: "Estimated Avg Glucose",
      value: eAG,
      unit: "mg/dL",
      status: scoreStatus(eAG, 117, 140),
    });
  }

  const summaryText =
    counts.highCount > 0
      ? "Some biomarkers are elevated. Treat this as educational trend tracking and review with a clinician."
      : counts.borderlineCount > 0
        ? "Most biomarkers are in-range with a few borderline values. Continue monitoring and discuss context with a clinician."
        : "Current biomarkers trend in normal ranges. Keep monitoring over time and confirm interpretation with your clinician.";

  return {
    overall: counts,
    biomarkers: biomarkerItems,
    derived,
    summaryText,
    nextSteps: [
      "Repeat labs on a clinician-recommended schedule.",
      "Track lifestyle changes and compare trend direction over time.",
      "Use these outputs as educational support, not diagnosis.",
    ],
    doctorQuestions: [
      "Which values should be prioritized based on my personal history?",
      "What follow-up interval is appropriate for these trends?",
      "Are there additional tests needed for better context?",
    ],
  };
}
