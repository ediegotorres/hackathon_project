import { inferMappedKey } from "@/src/lib/biomarkerMapping";
import type { ExtractedBiomarkerRow } from "@/src/lib/types";

const defaultModels = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;
const MAX_OCR_CHARS = 35000;

type LlmRow = {
  test: string;
  value: number | null;
  unit: string | null;
  referenceRange: string | null;
  panel: string | null;
  confidence: number;
  sourceText: string | null;
};

type GeminiResponsePayload = {
  rows?: unknown;
};

export interface AiBiomarkerExtractionResult {
  allBiomarkers: ExtractedBiomarkerRow[];
  warnings: string[];
}

function getApiKey() {
  return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function getModelCandidates() {
  const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
  const models = configuredModel ? [configuredModel, ...defaultModels] : [...defaultModels];
  return [...new Set(models)];
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0.5;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeUnit(value: string | null | undefined) {
  if (!value) return undefined;
  return value
    .replace(/\s+/g, "")
    .replace(/μ/g, "u")
    .replace(/ul/gi, "uL")
    .replace(/10\*3/gi, "10^3")
    .replace(/10\*6/gi, "10^6")
    .trim();
}

function isMetadataLikeName(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return true;
  if (/^(lab\s*no|patient\s*name|sex|gender|age|date|ref\.?\s*by|sample|doctor|email|phone|mobile)\b/i.test(compact)) {
    return true;
  }
  if (/^(mr|mrs|ms|dr)\.?\s+/i.test(compact)) {
    return true;
  }
  if (/^[:\-]\s*[a-z]/i.test(compact)) {
    return true;
  }
  return false;
}

function parseFirstRange(value?: string | null) {
  if (!value) return null;
  const match = value.toLowerCase().match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return {
    min: Number(match[1]),
    max: Number(match[2]),
  };
}

function deriveStatus(value: number, referenceRange?: string) {
  const range = parseFirstRange(referenceRange);
  if (!range) return undefined;
  if (value < range.min) return "Low";
  if (value > range.max) return "High";
  return "Normal";
}

const TEST_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "Haemoglobin", aliases: ["hemoglobin", "haemoglobin", "hgb", "hb"] },
  { canonical: "Red Blood Cell Count", aliases: ["rbc", "rbc count", "red blood cell count"] },
  { canonical: "PCV", aliases: ["pcv", "hematocrit", "haematocrit", "hct"] },
  { canonical: "Mean Corpuscular Volume (MCV)", aliases: ["mcv", "mean corpuscular volume"] },
  { canonical: "Mean Corpuscular Hemoglobin (MCH)", aliases: ["mch", "mean corpuscular hemoglobin"] },
  {
    canonical: "Mean Corpuscular Hemoglobin Concentration (MCHC)",
    aliases: ["mchc", "mean corpuscular hemoglobin concentration"],
  },
  { canonical: "RDW", aliases: ["rdw", "rdw-cv", "rdw cv", "rdw-sd", "rdw sd"] },
  { canonical: "Total WBC Count", aliases: ["wbc", "wbc count", "total wbc count", "white blood cell count"] },
  { canonical: "Neutrophils % (NEU%)", aliases: ["neutrophils", "neutrophil", "neu%", "neu"] },
  { canonical: "Lymphocytes % (LYM%)", aliases: ["lymphocytes", "lymphocyte", "lym%", "lym"] },
  { canonical: "Eosinophils % (EOS%)", aliases: ["eosinophils", "eosinophil", "eos%", "eos"] },
  { canonical: "Monocytes % (MON%)", aliases: ["monocytes", "monocyte", "mon%", "mon"] },
  { canonical: "Basophils % (BAS%)", aliases: ["basophils", "basophil", "bas%", "bas"] },
  { canonical: "Platelet Count", aliases: ["platelet", "platelet count", "plt"] },
];

const PLAUSIBLE_BOUNDS: Record<string, { min: number; max: number }> = {
  Haemoglobin: { min: 2, max: 25 },
  "Red Blood Cell Count": { min: 0.5, max: 12 },
  PCV: { min: 5, max: 80 },
  "Mean Corpuscular Volume (MCV)": { min: 30, max: 140 },
  "Mean Corpuscular Hemoglobin (MCH)": { min: 10, max: 60 },
  "Mean Corpuscular Hemoglobin Concentration (MCHC)": { min: 10, max: 60 },
  RDW: { min: 5, max: 40 },
  "Total WBC Count": { min: 100, max: 200000 },
  "Neutrophils % (NEU%)": { min: 0, max: 100 },
  "Lymphocytes % (LYM%)": { min: 0, max: 100 },
  "Eosinophils % (EOS%)": { min: 0, max: 100 },
  "Monocytes % (MON%)": { min: 0, max: 100 },
  "Basophils % (BAS%)": { min: 0, max: 100 },
  "Platelet Count": { min: 1000, max: 5000000 },
};

function canonicalizeTestName(value: string) {
  const normalized = normalizeToken(value);
  for (const entry of TEST_ALIASES) {
    const matched = entry.aliases.some((alias) => {
      const token = normalizeToken(alias);
      return normalized === token || normalized.startsWith(token) || normalized.endsWith(token);
    });
    if (matched) {
      return entry.canonical;
    }
  }
  return value.replace(/\s+/g, " ").replace(/[;:,]+$/, "").trim();
}

function parseLlmRows(payload: unknown): LlmRow[] {
  if (!payload) return [];
  const maybeRows =
    Array.isArray(payload) ? payload : typeof payload === "object" && payload !== null ? (payload as GeminiResponsePayload).rows : null;
  if (!Array.isArray(maybeRows)) return [];

  return maybeRows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const rawTest = typeof item.test === "string" ? item.test.trim() : "";
      if (!rawTest) return null;

      const parsedValue =
        typeof item.value === "number"
          ? item.value
          : typeof item.value === "string"
            ? Number(item.value.replace(/[^\d.-]/g, ""))
            : NaN;

      return {
        test: rawTest,
        value: Number.isFinite(parsedValue) ? parsedValue : null,
        unit: typeof item.unit === "string" ? item.unit.trim() : null,
        referenceRange: typeof item.referenceRange === "string" ? item.referenceRange.trim() : null,
        panel: typeof item.panel === "string" ? item.panel.trim() : null,
        confidence: clampConfidence(item.confidence),
        sourceText: typeof item.sourceText === "string" ? item.sourceText.trim() : null,
      } satisfies LlmRow;
    })
    .filter((row): row is LlmRow => Boolean(row));
}

function cleanGeminiJsonResponse(value: string) {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return cleaned;
}

async function queryGeminiRows(rawText: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key missing");
  }

  const models = getModelCandidates();
  const truncatedInput = rawText.slice(0, MAX_OCR_CHARS);
  const prompt = `You extract structured lab test rows from OCR text.

Return JSON only in this format:
{
  "rows": [
    {
      "test": "string",
      "value": 0,
      "unit": "string or null",
      "referenceRange": "string or null",
      "panel": "string or null",
      "confidence": 0.0,
      "sourceText": "exact short snippet from OCR"
    }
  ]
}

Rules:
- Include only actual lab analyte rows.
- Exclude demographics and metadata such as name, age, sex, date, doctor, lab no.
- Do not infer missing values; use null.
- Keep confidence between 0 and 1.
- Preserve values exactly as seen.

OCR text:
${truncatedInput}`;

  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${responseBody}`);
      }
      const result = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new Error("Gemini returned empty extraction payload");
      }
      const parsed = JSON.parse(cleanGeminiJsonResponse(text));
      return {
        model,
        truncated: rawText.length > MAX_OCR_CHARS,
        rows: parseLlmRows(parsed),
      };
    } catch (error) {
      lastError = error;
      console.warn(`Gemini extraction failed for model "${model}", trying next fallback.`);
    }
  }
  throw lastError ?? new Error("Gemini extraction failed for all configured models");
}

function validateRows(rows: LlmRow[]): AiBiomarkerExtractionResult {
  const warnings: string[] = [];
  const byTest = new Map<string, { row: ExtractedBiomarkerRow; confidence: number }>();

  for (const row of rows) {
    const testName = row.test.trim();
    if (!testName || isMetadataLikeName(testName)) {
      warnings.push(`Skipped metadata-like row "${row.test}".`);
      continue;
    }
    if (row.value === null || !Number.isFinite(row.value)) {
      warnings.push(`Skipped "${row.test}" because value was not numeric.`);
      continue;
    }

    const confidence = clampConfidence(row.confidence);
    if (confidence < 0.3) {
      warnings.push(`Skipped low-confidence row "${row.test}".`);
      continue;
    }

    const canonicalName = canonicalizeTestName(testName);
    const bounds = PLAUSIBLE_BOUNDS[canonicalName];
    if (bounds && (row.value < bounds.min || row.value > bounds.max)) {
      warnings.push(`Skipped "${canonicalName}" because value ${row.value} looked implausible.`);
      continue;
    }

    const normalizedRange = row.referenceRange?.replace(/\s+/g, " ").trim() || undefined;
    const normalizedUnit = normalizeUnit(row.unit);
    const extracted: ExtractedBiomarkerRow = {
      name: canonicalName,
      value: Number(row.value.toFixed(4)),
      mappedKey: inferMappedKey(canonicalName),
      unit: normalizedUnit || undefined,
      referenceRange: normalizedRange,
      status: deriveStatus(row.value, normalizedRange),
    };

    const dedupeKey = normalizeToken(canonicalName);
    const existing = byTest.get(dedupeKey);
    if (!existing || confidence > existing.confidence) {
      byTest.set(dedupeKey, { row: extracted, confidence });
    }
  }

  const allBiomarkers = Array.from(byTest.values()).map((item) => item.row);
  if (allBiomarkers.length === 0) {
    warnings.push("AI parser returned no valid lab rows after validation.");
  }
  return { allBiomarkers, warnings };
}

export function hasGeminiExtractionConfig() {
  return Boolean(getApiKey());
}

export async function extractBiomarkersWithGemini(rawText: string): Promise<AiBiomarkerExtractionResult> {
  const result = await queryGeminiRows(rawText);
  const validated = validateRows(result.rows);
  const warnings = [...validated.warnings];

  if (result.truncated) {
    warnings.push(`OCR text was truncated to ${MAX_OCR_CHARS} characters before AI extraction.`);
  }
  warnings.unshift(`AI extraction used Gemini model: ${result.model}.`);

  return {
    allBiomarkers: validated.allBiomarkers,
    warnings,
  };
}
