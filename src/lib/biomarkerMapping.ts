import type { Biomarkers, LabReport } from "@/src/lib/types";

const SUPPORTED_MARKER_ALIASES: Record<keyof Biomarkers, string[]> = {
  redBloodCellCount: ["rbc", "red blood cell", "red blood cell count", "erythrocytes"],
  Haemoglobin: ["hemoglobin", "haemoglobin", "hgb", "hb"],
  Glucose: ["glucose", "fasting glucose", "blood glucose"],
  Creatinine: ["creatinine", "serum creatinine"],
  Urea: ["urea", "blood urea nitrogen", "bun"],
  Cholesterol: ["cholesterol", "total cholesterol", "cholesterol total"],
  ALT: ["alt", "alanine aminotransferase", "sgpt", "alat"],
  AST: ["ast", "aspartate aminotransferase", "sgot", "asat"],
  ALP: ["alp", "alkaline phosphatase"],
  Bilirubin: ["bilirubin", "total bilirubin"],
  Albumin: ["albumin", "serum albumin"],
  GFR: ["gfr", "glomerular filtration rate"],
  BUN: ["bun", "blood urea nitrogen", "urea nitrogen"],
  Sodium: ["sodium", "serum sodium", "na"],
  Potassium: ["potassium", "serum potassium", "k"],
  Calcium: ["calcium", "serum calcium", "ca"],
  TSH: ["tsh", "thyroid stimulating hormone"],
  FT4: ["ft4", "free t4", "free thyroxine"],
};

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\da-z.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferMappedKey(name: string): keyof Biomarkers | undefined {
  const normalized = normalizeForMatch(name);
  let best: { key: keyof Biomarkers; aliasLength: number } | null = null;

  for (const [key, aliases] of Object.entries(SUPPORTED_MARKER_ALIASES) as Array<[keyof Biomarkers, string[]]>) {
    for (const alias of aliases) {
      const aliasNormalized = normalizeForMatch(alias);
      if (!aliasNormalized || !normalized.includes(aliasNormalized)) continue;
      if (!best || aliasNormalized.length > best.aliasLength) {
        best = { key, aliasLength: aliasNormalized.length };
      }
    }
  }

  return best?.key;
}

export function resolveCoreBiomarkers(report: LabReport): Biomarkers {
  const merged: Biomarkers = { ...report.biomarkers };

  for (const item of report.additionalBiomarkers ?? []) {
    const mappedKey = item.mappedKey ?? inferMappedKey(item.name);
    if (!mappedKey) continue;
    if (typeof merged[mappedKey] === "number") continue;
    merged[mappedKey] = item.value;
  }

  return merged;
}

