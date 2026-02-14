import type { Biomarkers, ExtractedBiomarkerRow } from "@/src/lib/types";

type BiomarkerKey = keyof Biomarkers;

type BiomarkerDef = {
  key: BiomarkerKey;
  aliases: string[];
  suppressIfContains?: string[];
};

const BIOMARKER_DEFS: BiomarkerDef[] = [
  {
    key: "totalChol",
    aliases: [
      "total cholesterol",
      "total chol",
      "cholesterol total",
      "cholesterol, total",
      "total serum cholesterol",
      "cholesterol",
    ],
    suppressIfContains: ["hdl", "ldl"],
  },
  {
    key: "ldl",
    aliases: [
      "ldl cholesterol",
      "ldl-c",
      "ldl",
      "low density lipoprotein",
      "low-density lipoprotein",
      "ldl calc",
      "calculated ldl",
    ],
  },
  {
    key: "hdl",
    aliases: ["hdl cholesterol", "hdl-c", "hdl", "high density lipoprotein", "high-density lipoprotein"],
  },
  {
    key: "triglycerides",
    aliases: ["triglycerides", "triglyceride", "tg", "trigs"],
  },
  {
    key: "glucose",
    aliases: ["fasting glucose", "blood glucose", "glucose"],
  },
  {
    key: "a1c",
    aliases: [
      "hemoglobin a1c",
      "haemoglobin a1c",
      "glycated hemoglobin",
      "glycosylated hemoglobin",
      "hba1c",
      "hb a1c",
      "a1c",
      "a1 c",
    ],
  },
];

const PANEL_HEADERS = new Set([
  "hematology",
  "biochemistry",
  "liver function",
  "kidney function",
  "electrolytes",
  "thyroid function",
  "complete blood count",
]);

const TABLE_HEADER_TOKENS = new Set([
  "test",
  "testname",
  "unit",
  "units",
  "result",
  "results",
  "reference",
  "referencerange",
  "normalrange",
  "status",
  "resultstatus",
]);

const RANGE_ONLY_PATTERN = /^\s*-?\d+(?:\.\d+)?\s*-\s*-?\d+(?:\.\d+)?\s*$/;
const UP_TO_RANGE_PATTERN = /^\s*up\s*to\s*-?\d+(?:\.\d+)?\s*$/i;
const UNIT_ONLY_PATTERN =
  /^\s*(%|mg\/dL|mg\/L|mmol\/L|g\/dL|U\/L|IU\/L|ng\/dL|ng\/mL|pg\/mL|uIU\/mL|μIU\/mL|mm\/hr|mL\/min(?:\/1\.73m²)?|x?10\^\d+\/[A-Za-z0-9μµ]+)\s*$/i;
const STATUS_ONLY_PATTERN = /^\s*(normal|high|low|borderline|abnormal)\s*$/i;
const RESULT_ONLY_PATTERN = /^\s*-?\d+(?:\.\d+)?\s*$/;

const METADATA_LINE_PATTERN =
  /^(blood test results|processing details|sample|gender|age|email|verified by|page \d+ of \d+|dr\.|central health|johnatan doe|john doe)$/i;

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[%]/g, " % ")
    .replace(/[^\da-z.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cleanTestName(value: string) {
  return value.replace(/\s+/g, " ").replace(/[;:,]+$/, "").trim();
}

function isRangeOnlyLine(line: string) {
  return RANGE_ONLY_PATTERN.test(line) || UP_TO_RANGE_PATTERN.test(line);
}

function isUnitOnlyLine(line: string) {
  return UNIT_ONLY_PATTERN.test(line.trim());
}

function isStatusOnlyLine(line: string) {
  return STATUS_ONLY_PATTERN.test(line.trim());
}

function isResultOnlyLine(line: string) {
  return RESULT_ONLY_PATTERN.test(line.trim());
}

function isTableHeaderLine(line: string) {
  const token = normalizeToken(line);
  if (!token) return false;
  if (TABLE_HEADER_TOKENS.has(token)) return true;
  return (
    token.includes("referencerange") ||
    token.includes("normalrange") ||
    token.includes("resultstatus") ||
    token.includes("testname")
  );
}

function isPanelHeaderLine(line: string) {
  return PANEL_HEADERS.has(line.trim().toLowerCase());
}

function isMetadataLine(line: string) {
  return METADATA_LINE_PATTERN.test(line.trim());
}

function normalizeStatus(value: string) {
  const lower = value.trim().toLowerCase();
  if (!lower) return "";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalizeRange(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUnit(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/x10\^/gi, "10^")
    .replace(/10\*3/gi, "10^3")
    .replace(/10\*6/gi, "10^6")
    .replace(/ul/gi, "uL");
}

function parseRange(value: string): { min: number; max: number } | null {
  const normalized = value.trim().toLowerCase();
  const between = normalized.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (between) {
    return { min: Number(between[1]), max: Number(between[2]) };
  }
  const upTo = normalized.match(/up to\s+(-?\d+(?:\.\d+)?)/);
  if (upTo) {
    return { min: Number.NEGATIVE_INFINITY, max: Number(upTo[1]) };
  }
  return null;
}

function deriveStatusFromRange(value: number, referenceRange?: string) {
  if (!referenceRange) return "";
  const range = parseRange(referenceRange);
  if (!range) return "";
  if (value < range.min) return "Low";
  if (value > range.max) return "High";
  return "Normal";
}

function isLikelyTestName(value: string) {
  const line = value.trim();
  if (!line || line.length > 140) return false;
  if (!/[A-Za-z]/.test(line)) return false;
  if (isRangeOnlyLine(line) || isUnitOnlyLine(line) || isStatusOnlyLine(line) || isResultOnlyLine(line)) {
    return false;
  }
  if (isPanelHeaderLine(line) || isTableHeaderLine(line) || isMetadataLine(line)) {
    return false;
  }
  if (/^(results|result|sample|gender|age|email|verified by|doctor)$/i.test(line)) {
    return false;
  }
  return true;
}

function mapSupportedKeyFromName(name: string): BiomarkerKey | undefined {
  const normalizedName = normalizeForMatch(name);
  let bestMatch: { key: BiomarkerKey; score: number } | null = null;

  for (const def of BIOMARKER_DEFS) {
    if (def.suppressIfContains?.some((token) => normalizedName.includes(token))) {
      continue;
    }
    for (const alias of def.aliases) {
      const aliasToken = normalizeForMatch(alias);
      if (!aliasToken || !normalizedName.includes(aliasToken)) continue;
      const score = aliasToken.length;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { key: def.key, score };
      }
    }
  }

  return bestMatch?.key;
}

function dedupeExtractedRows(rows: ExtractedBiomarkerRow[]) {
  const seen = new Set<string>();
  const deduped: ExtractedBiomarkerRow[] = [];
  for (const row of rows) {
    const key = `${normalizeForMatch(row.name)}|${row.value}|${row.unit ?? ""}|${row.referenceRange ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function extractTabularBiomarkerRows(rawText: string): ExtractedBiomarkerRow[] {
  const lines = rawText
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);

  const rows: ExtractedBiomarkerRow[] = [];
  let inTableSection = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isTableHeaderLine(line)) {
      inTableSection = true;
      continue;
    }
    if (!inTableSection) continue;
    if (isPanelHeaderLine(line) || isMetadataLine(line)) continue;
    if (!isLikelyTestName(line)) continue;

    let consumed = 0;
    let unit = "";
    let referenceRange = "";
    let status = "";
    let resultValue: number | null = null;

    for (let offset = 1; offset <= 6; offset += 1) {
      const next = lines[index + offset];
      if (!next) break;
      if (isPanelHeaderLine(next) || isTableHeaderLine(next) || isMetadataLine(next)) break;
      if (isLikelyTestName(next) && resultValue === null && offset > 1) break;

      if (!unit && isUnitOnlyLine(next)) {
        unit = normalizeUnit(next);
        consumed = offset;
        continue;
      }
      if (!referenceRange && isRangeOnlyLine(next)) {
        referenceRange = normalizeRange(next);
        consumed = offset;
        continue;
      }
      if (resultValue === null && isResultOnlyLine(next)) {
        const parsed = Number(next.trim());
        if (Number.isFinite(parsed)) {
          resultValue = Number(parsed.toFixed(3));
          consumed = offset;
          continue;
        }
      }
      if (!status && isStatusOnlyLine(next)) {
        status = normalizeStatus(next);
        consumed = offset;
      }
    }

    if (resultValue !== null) {
      const name = cleanTestName(line);
      rows.push({
        name,
        value: resultValue,
        mappedKey: mapSupportedKeyFromName(name),
        unit: unit || undefined,
        referenceRange: referenceRange || undefined,
        status: status || deriveStatusFromRange(resultValue, referenceRange) || undefined,
      });
      index += consumed;
    }
  }

  return dedupeExtractedRows(rows);
}

export interface BiomarkerExtractionResult {
  allBiomarkers: ExtractedBiomarkerRow[];
  warnings: string[];
}

export function extractBiomarkersFromText(rawText: string): BiomarkerExtractionResult {
  const allBiomarkers = extractTabularBiomarkerRows(rawText);
  const warnings: string[] = [];

  if (!rawText.trim()) {
    warnings.push("No readable text was extracted from this file.");
  }
  if (allBiomarkers.length === 0) {
    warnings.push("No biomarker rows were parsed from this file.");
  }

  return {
    allBiomarkers,
    warnings,
  };
}
