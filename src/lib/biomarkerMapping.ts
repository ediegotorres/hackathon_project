import type { Biomarkers, LabReport } from "@/src/lib/types";

const SUPPORTED_MARKER_ALIASES: Record<keyof Biomarkers, string[]> = {
  totalChol: ["total cholesterol", "cholesterol total", "cholesterol"],
  ldl: ["ldl", "ldl cholesterol", "ldl-c", "low density lipoprotein", "low-density lipoprotein"],
  hdl: ["hdl", "hdl cholesterol", "hdl-c", "high density lipoprotein", "high-density lipoprotein"],
  triglycerides: ["triglycerides", "triglyceride", "tg", "trigs"],
  glucose: ["glucose", "fasting glucose", "blood glucose"],
  a1c: ["hemoglobin a1c", "haemoglobin a1c", "hba1c", "a1c", "a1 c", "glycated hemoglobin"],
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

