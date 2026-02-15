import type { AnalysisResult, Biomarkers, LabReport, Status, UserProfile } from "@/src/lib/types";

type BiomarkerDef = {
  key: keyof Biomarkers;
  label: string;
  unit: string;
  normalMin?: number;
  normalMax?: number;
  lowAt?: number;
  highAt?: number;
  rangeText: string;
  meaning: string;
  questions: string[];
};

const biomarkerDefs: BiomarkerDef[] = [
  {
    key: "redBloodCellCount",
    label: "Red Blood Cell Count",
    unit: "million cells/mcL",
    normalMin: 4.0,
    normalMax: 5.5,
    rangeText: "Normal: 4.0-5.5 million cells/mcL",
    meaning: "Measures oxygen-carrying red blood cells.",
    questions: ["Am I showing signs of anemia?", "Could low RBC affect my energy levels?"],
  },
  {
    key: "Haemoglobin",
    label: "Haemoglobin",
    unit: "g/dL",
    normalMin: 12.0,
    normalMax: 17.5,
    rangeText: "Normal: 12.0-17.5 g/dL",
    meaning: "Protein in red blood cells that carries oxygen.",
    questions: ["Is my hemoglobin consistent with my activity level?", "Should I track this for athletic performance?"],
  },
  {
    key: "Glucose",
    label: "Glucose",
    unit: "mg/dL",
    normalMax: 100,
    borderlineAt: 100,
    highAt: 126,
    rangeText: "Normal: < 100, Borderline: 100-125, High: >= 126",
    meaning: "Fasting blood sugar reflects glucose control.",
    questions: ["Should I monitor postprandial glucose?", "What lifestyle impacts this most?"],
  },
  {
    key: "Creatinine",
    label: "Creatinine",
    unit: "mg/dL",
    normalMax: 1.2,
    rangeText: "Normal: < 1.2 mg/dL",
    meaning: "Kidney function marker - waste product clearance.",
    questions: ["Is my kidney function stable?", "Should I monitor hydration?"],
  },
  {
    key: "Urea",
    label: "Urea",
    unit: "mg/dL",
    normalMax: 23,
    rangeText: "Normal: < 23 mg/dL",
    meaning: "Another kidney function indicator.",
    questions: ["How does protein intake affect urea?", "Should I adjust hydration?"],
  },
  {
    key: "Cholesterol",
    label: "Cholesterol",
    unit: "mg/dL",
    normalMax: 200,
    borderlineAt: 200,
    highAt: 240,
    rangeText: "Normal: < 200, Borderline: 200-239, High: >= 240",
    meaning: "Total cholesterol reflects overall lipid burden.",
    questions: ["Should I focus on dietary cholesterol?", "What is my cardiovascular risk?"],
  },
  {
    key: "ALT",
    label: "ALT (Alanine Aminotransferase)",
    unit: "U/L",
    normalMax: 40,
    rangeText: "Normal: < 40 U/L",
    meaning: "Liver enzyme - elevated can indicate liver stress.",
    questions: ["Is my liver function normal?", "Could medications affect this?"],
  },
  {
    key: "AST",
    label: "AST (Aspartate Aminotransferase)",
    unit: "U/L",
    normalMax: 40,
    rangeText: "Normal: < 40 U/L",
    meaning: "Another liver enzyme related to liver health.",
    questions: ["What does AST:ALT ratio tell me?", "Should I be concerned about liver inflammation?"],
  },
  {
    key: "ALP",
    label: "ALP (Alkaline Phosphatase)",
    unit: "U/L",
    normalMax: 120,
    rangeText: "Normal: < 120 U/L",
    meaning: "Enzyme from liver, bones, and other tissues.",
    questions: ["What is driving my ALP level?", "Could this indicate bone turnover?"],
  },
  {
    key: "Bilirubin",
    label: "Bilirubin",
    unit: "mg/dL",
    normalMax: 1.2,
    rangeText: "Normal: < 1.2 mg/dL",
    meaning: "Bile pigment - elevated may indicate liver or hemolysis issues.",
    questions: ["Is my liver processing bile correctly?", "Could hemolysis be involved?"],
  },
  {
    key: "Albumin",
    label: "Albumin",
    unit: "g/dL",
    normalMin: 3.5,
    normalMax: 5.0,
    rangeText: "Normal: 3.5-5.0 g/dL",
    meaning: "Major plasma protein affecting osmotic pressure and nutrient transport.",
    questions: ["Is my protein status adequate?", "Could malnutrition be a factor?"],
  },
  {
    key: "GFR",
    label: "GFR (Glomerular Filtration Rate)",
    unit: "mL/min",
    normalMin: 60,
    rangeText: "Normal: >= 60 mL/min",
    meaning: "Kidney filtration rate - lower suggests reduced kidney function.",
    questions: ["What is my kidney disease risk category?", "Should I modify my diet?"],
  },
  {
    key: "BUN",
    label: "BUN (Blood Urea Nitrogen)",
    unit: "mg/dL",
    normalMax: 23,
    rangeText: "Normal: < 23 mg/dL",
    meaning: "Related to protein metabolism and kidney function.",
    questions: ["How does my protein intake affect BUN?", "Is hydration affecting this?"],
  },
  {
    key: "Sodium",
    label: "Sodium",
    unit: "mEq/L",
    normalMin: 136,
    normalMax: 145,
    rangeText: "Normal: 136-145 mEq/L",
    meaning: "Electrolyte critical for nerve and muscle function.",
    questions: ["Is my hydration status adequate?", "Am I losing electrolytes through sweat?"],
  },
  {
    key: "Potassium",
    label: "Potassium",
    unit: "mEq/L",
    normalMin: 3.5,
    normalMax: 5.0,
    rangeText: "Normal: 3.5-5.0 mEq/L",
    meaning: "Electrolyte essential for heart rhythm and muscle function.",
    questions: ["Should I monitor potassium with medications?", "How does exercise affect this?"],
  },
  {
    key: "Calcium",
    label: "Calcium",
    unit: "mg/dL",
    normalMin: 8.5,
    normalMax: 10.2,
    rangeText: "Normal: 8.5-10.2 mg/dL",
    meaning: "Mineral critical for bones, heart, and nerve function.",
    questions: ["Is my vitamin D intake adequate?", "Should I monitor bone health?"],
  },
  {
    key: "TSH",
    label: "TSH (Thyroid Stimulating Hormone)",
    unit: "mIU/L",
    normalMin: 0.5,
    normalMax: 2.5,
    rangeText: "Normal: 0.5-2.5 mIU/L",
    meaning: "Pituitary hormone controlling thyroid - indicates thyroid function.",
    questions: ["Should I check free T3 and T4?", "Am I experiencing thyroid-related symptoms?"],
  },
  {
    key: "FT4",
    label: "FT4 (Free Thyroxine)",
    unit: "ng/dL",
    normalMin: 0.8,
    normalMax: 1.8,
    rangeText: "Normal: 0.8-1.8 ng/dL",
    meaning: "Active thyroid hormone affecting metabolism and energy.",
    questions: ["How do TSH and FT4 correlate for me?", "Should I adjust thyroid medication?"],
  },
];

function statusForValue(value: number, def: BiomarkerDef): Status {
  // Check high threshold first
  if (def.highAt !== undefined && value >= def.highAt) return "high";
  // Check low threshold
  if (def.lowAt !== undefined && value <= def.lowAt) return "high";
  // Check borderline high
  if (def.normalMax !== undefined && value > def.normalMax) return "borderline";
  // Check borderline low
  if (def.normalMin !== undefined && value < def.normalMin) return "borderline";
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
        key: def.key as string,
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

  const summaryText =
    counts.highCount > 0
      ? "Some biomarkers are elevated. Treat this as educational trend tracking and review with a clinician."
      : counts.borderlineCount > 0
        ? "Most biomarkers are in-range with a few borderline values. Continue monitoring and discuss context with a clinician."
        : "Current biomarkers trend in normal ranges. Keep monitoring over time and confirm interpretation with your clinician.";

  return {
    overall: counts,
    biomarkers: biomarkerItems,
    derived: [],
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
