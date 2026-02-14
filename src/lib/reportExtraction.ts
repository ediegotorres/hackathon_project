import type { Biomarkers, ExtractedBiomarkerRow } from "@/src/lib/types";

type BiomarkerKey = keyof Biomarkers;

type BloodResultRow = {
  panel: string;
  test: string;
  result: string;
  unit: string;
  referenceRange: string;
  status: string;
};

const PANEL_HEADERS = new Set([
  "Hematology",
  "Biochemistry",
  "Liver Function",
  "Kidney Function",
  "Electrolytes",
  "Thyroid Function",
  "Complete Blood Count",
]);

const NOISE_LINES = new Set([
  "TEST",
  "UNIT",
  "REFERENCE RANGE",
  "RESULT",
  "RESULT STATUS",
]);

const TEST_ALIASES: Record<string, string[]> = {
  "White Blood Cell Count": ["white blood cell count", "wbc"],
  "Red Blood Cell Count": ["red blood cell count", "rbc"],
  Hemoglobin: ["hemoglobin", "hgb", "hb"],
  Hematocrit: ["hematocrit", "hct"],
  "Platelet Count": ["platelet count", "plt"],
  Glucose: ["glucose"],
  Creatinine: ["creatinine"],
  Urea: ["urea"],
  Cholesterol: ["cholesterol"],
  "Alanine Aminotransferase (ALT)": ["alanine aminotransferase", "alt"],
  "Aspartate Aminotransferase (AST)": ["aspartate aminotransferase", "ast"],
  "Alkaline Phosphatase (ALP)": ["alkaline phosphatase", "alp"],
  Bilirubin: ["bilirubin"],
  Albumin: ["albumin"],
  "Mean Corpuscular Volume (MCV)": ["mean corpuscular volume", "mcv"],
  "Mean Corpuscular Hemoglobin (MCH)": ["mean corpuscular hemoglobin", "mch"],
  "Mean Corpuscular Hemoglobin Concentration (MCHC)": ["mean corpuscular hemoglobin concentration", "mchc"],
  "Red Cell Distribution Width CV (RDW-CV)": ["rdw-cv", "rdw cv"],
  "Red Cell Distribution Width SD (RDW-SD)": ["rdw-sd", "rdw sd"],
  "Neutrophils % (NEU%)": ["neu%", "neutrophils"],
  "Lymphocytes % (LYM%)": ["lym%", "lymphocytes"],
  "Monocytes % (MON%)": ["mon%", "monocytes"],
  "Eosinophils % (EOS%)": ["eos%", "eosinophils"],
  "Basophils % (BAS%)": ["bas%", "basophils"],
  "Lymphocytes Absolute (LYM#)": ["lym#", "lymphocytes absolute"],
  "Granulocytes Absolute (GRA#)": ["gra#", "granulocytes absolute"],
  ESR: ["esr", "erythrocyte sedimentation rate"],
  "Thyroid Stimulating Hormone (TSH)": ["thyroid stimulating hormone", "tsh"],
  "Free Thyroxine (FT4)": ["free thyroxine", "ft4"],
};

const PANEL_BY_TEST: Record<string, string> = {
  "White Blood Cell Count": "Hematology",
  "Red Blood Cell Count": "Hematology",
  Hemoglobin: "Hematology",
  Hematocrit: "Hematology",
  "Platelet Count": "Hematology",
  "Mean Corpuscular Volume (MCV)": "Hematology",
  "Mean Corpuscular Hemoglobin (MCH)": "Hematology",
  "Mean Corpuscular Hemoglobin Concentration (MCHC)": "Hematology",
  "Red Cell Distribution Width CV (RDW-CV)": "Hematology",
  "Red Cell Distribution Width SD (RDW-SD)": "Hematology",
  "Neutrophils % (NEU%)": "Hematology",
  "Lymphocytes % (LYM%)": "Hematology",
  "Monocytes % (MON%)": "Hematology",
  "Eosinophils % (EOS%)": "Hematology",
  "Basophils % (BAS%)": "Hematology",
  "Lymphocytes Absolute (LYM#)": "Hematology",
  "Granulocytes Absolute (GRA#)": "Hematology",
  ESR: "Hematology",
  Glucose: "Biochemistry",
  Creatinine: "Biochemistry",
  Urea: "Biochemistry",
  Cholesterol: "Biochemistry",
  "Alanine Aminotransferase (ALT)": "Liver Function",
  "Aspartate Aminotransferase (AST)": "Liver Function",
  "Alkaline Phosphatase (ALP)": "Liver Function",
  Bilirubin: "Liver Function",
  Albumin: "Liver Function",
  "Thyroid Stimulating Hormone (TSH)": "Thyroid Function",
  "Free Thyroxine (FT4)": "Thyroid Function",
};

const EXPECTED_UNIT_PATTERNS: Record<string, RegExp[]> = {
  "White Blood Cell Count": [/10\^3\/uL/i, /10\^9\/L/i],
  "Red Blood Cell Count": [/10\^6\/uL/i, /10\^12\/L/i],
  Hemoglobin: [/g\/dL/i],
  Hematocrit: [/%/],
  "Platelet Count": [/10\^3\/uL/i, /10\^9\/L/i],
  Glucose: [/mg\/dL/i],
  Creatinine: [/mg\/dL/i],
  Urea: [/mg\/dL/i],
  Cholesterol: [/mg\/dL/i],
  "Alanine Aminotransferase (ALT)": [/U\/L/i],
  "Aspartate Aminotransferase (AST)": [/U\/L/i],
  "Alkaline Phosphatase (ALP)": [/U\/L/i],
  Bilirubin: [/mg\/dL/i],
  Albumin: [/g\/dL/i],
  "Mean Corpuscular Volume (MCV)": [/fl/i],
  "Mean Corpuscular Hemoglobin (MCH)": [/pg/i],
  "Mean Corpuscular Hemoglobin Concentration (MCHC)": [/g\/dL/i],
  "Red Cell Distribution Width CV (RDW-CV)": [/%/],
  "Red Cell Distribution Width SD (RDW-SD)": [/fl/i],
  "Neutrophils % (NEU%)": [/%/],
  "Lymphocytes % (LYM%)": [/%/],
  "Monocytes % (MON%)": [/%/],
  "Eosinophils % (EOS%)": [/%/],
  "Basophils % (BAS%)": [/%/],
  "Lymphocytes Absolute (LYM#)": [/10\^3\/uL/i],
  "Granulocytes Absolute (GRA#)": [/10\^3\/uL/i],
  ESR: [/mm\/hr/i],
  "Thyroid Stimulating Hormone (TSH)": [/μIU\/mL/i, /uIU\/mL/i],
  "Free Thyroxine (FT4)": [/ng\/dL/i],
};

const SUPPORTED_KEY_ALIASES: Record<BiomarkerKey, string[]> = {
  totalChol: ["total cholesterol", "cholesterol total", "cholesterol"],
  ldl: ["ldl", "ldl cholesterol", "ldl-c", "low density lipoprotein", "low-density lipoprotein"],
  hdl: ["hdl", "hdl cholesterol", "hdl-c", "high density lipoprotein", "high-density lipoprotein"],
  triglycerides: ["triglycerides", "triglyceride", "tg", "trigs"],
  glucose: ["glucose", "fasting glucose", "blood glucose"],
  a1c: [
    "hemoglobin a1c",
    "haemoglobin a1c",
    "hba1c",
    "a1c",
    "a1 c",
    "glycated hemoglobin",
    "glycosylated hemoglobin",
  ],
};

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[%]/g, " % ")
    .replace(/[^\da-z.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBloodResults(rawText: string): BloodResultRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const inlineRows = parseInlineRows(lines);
  const columnRows = parseColumnarRows(lines);
  const genericColumnRows = parseGenericColumnBlocks(lines);
  const primaryRows = dedupeRows([...inlineRows, ...columnRows, ...genericColumnRows]).filter(isPlausibleRow);
  if (primaryRows.length >= 8) {
    return consolidateRows(primaryRows);
  }

  const sequentialRows = parseSequentialRows(lines);
  return consolidateRows(dedupeRows([...primaryRows, ...sequentialRows]).filter(isPlausibleRow));
}

function parseGenericColumnBlocks(lines: string[]): BloodResultRow[] {
  type TestEntry = { test: string; panel: string };
  type Block = {
    tests: TestEntry[];
    units: string[];
    ranges: string[];
    results: string[];
    statuses: string[];
  };

  const blocks: Block[] = [];
  let block: Block = { tests: [], units: [], ranges: [], results: [], statuses: [] };
  let inTable = false;
  let currentPanel = "Unknown";

  const isBlockComplete = (value: Block): boolean =>
    value.tests.length > 0 && value.results.length >= value.tests.length;

  const flush = () => {
    if (block.tests.length > 0 && (block.results.length > 0 || block.ranges.length > 0)) {
      blocks.push(block);
    }
    block = { tests: [], units: [], ranges: [], results: [], statuses: [] };
    inTable = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("Page ")) {
      continue;
    }

    const panelLabel = normalizePanelLabel(trimmed);
    if (panelLabel) {
      currentPanel = panelLabel;
      continue;
    }

    const token = normalizeToken(trimmed);
    if (token === "test" || token === "testname") {
      if (isBlockComplete(block)) {
        flush();
      }
      inTable = true;
      continue;
    }
    if (
      token === "unit" ||
      token === "units" ||
      token === "referencerange" ||
      token === "normalrange" ||
      token === "result" ||
      token === "resultstatus" ||
      token === "status"
    ) {
      inTable = true;
      continue;
    }

    if (!inTable) {
      continue;
    }

    if (/digitally signed|public key|test id/i.test(trimmed)) {
      flush();
      continue;
    }

    if (isLikelyTestName(trimmed) && isBlockComplete(block)) {
      flush();
      inTable = true;
    }

    if (isLikelyTestName(trimmed)) {
      const test = canonicalizeTest(trimmed);
      if (test) {
        block.tests.push({ test, panel: resolvePanel(currentPanel, test) });
      }
      continue;
    }
    if (isStatus(trimmed)) {
      block.statuses.push(normalizeStatus(trimmed));
      continue;
    }
    if (isReferenceRange(trimmed)) {
      block.ranges.push(normalizeRange(trimmed));
      continue;
    }
    if (isUnit(trimmed)) {
      block.units.push(normalizeUnit(trimmed));
      continue;
    }
    if (isResultValue(trimmed)) {
      block.results.push(normalizeResult(trimmed));
    }
  }

  flush();

  const rows: BloodResultRow[] = [];
  for (const value of blocks) {
    for (let i = 0; i < value.tests.length; i += 1) {
      const test = value.tests[i];
      const result = value.results[i] ?? "";
      const referenceRange = value.ranges[i] ?? "";
      const unit = value.units[i] ?? "";
      if (!result && !referenceRange) {
        continue;
      }
      rows.push({
        panel: test.panel,
        test: test.test,
        result,
        unit,
        referenceRange,
        status: value.statuses[i] ?? (result && referenceRange ? deriveStatus(result, referenceRange) : "Unknown"),
      });
    }
  }
  return rows;
}

function parseInlineRows(lines: string[]): BloodResultRow[] {
  const rows: BloodResultRow[] = [];
  let currentPanel = "Unknown";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isPanelHeader(line)) {
      currentPanel = normalizePanel(line);
      continue;
    }
    if (NOISE_LINES.has(line.toUpperCase()) || line.startsWith("Page ") || isStatus(line)) {
      continue;
    }

    const test = canonicalizeTest(line);
    if (!test) {
      continue;
    }

    const a = lines[i + 1] ?? "";
    const b = lines[i + 2] ?? "";
    const c = lines[i + 3] ?? "";
    const d = lines[i + 4] ?? "";

    if (isUnit(a) && isReferenceRange(b) && isResultValue(c)) {
      rows.push({
        panel: resolvePanel(currentPanel, test),
        test,
        result: normalizeResult(c),
        unit: a,
        referenceRange: normalizeRange(b),
        status: isStatus(d) ? normalizeStatus(d) : deriveStatus(c, b),
      });
      i += isStatus(d) ? 4 : 3;
      continue;
    }

    if (isResultValue(a) && isReferenceRange(b) && isUnit(c)) {
      rows.push({
        panel: resolvePanel(currentPanel, test),
        test,
        result: normalizeResult(a),
        unit: c,
        referenceRange: normalizeRange(b),
        status: isStatus(d) ? normalizeStatus(d) : deriveStatus(a, b),
      });
      i += isStatus(d) ? 4 : 3;
    }
  }

  return rows;
}

function parseColumnarRows(lines: string[]): BloodResultRow[] {
  const testHeaderIdx = lines.findIndex((line) => normalizeToken(line).includes("testname"));
  const rangeHeaderIdx = lines.findIndex(
    (line) => normalizeToken(line).includes("normalrange") || normalizeToken(line).includes("referencerange"),
  );
  const unitsHeaderIdx = lines.findIndex(
    (line) => normalizeToken(line) === "units" || normalizeToken(line) === "unit",
  );

  if (testHeaderIdx === -1 || rangeHeaderIdx === -1 || unitsHeaderIdx === -1) {
    return [];
  }

  const resultStartIdx = findFirstResultIndex(lines, testHeaderIdx + 1, rangeHeaderIdx);
  if (resultStartIdx === -1) {
    return [];
  }

  const tests = lines
    .slice(testHeaderIdx + 1, Math.min(resultStartIdx, rangeHeaderIdx))
    .map(canonicalizeTest)
    .filter((value): value is string => Boolean(value));

  const results = lines.slice(resultStartIdx, rangeHeaderIdx).filter(isResultValue).map(normalizeResult);
  const ranges = lines.slice(rangeHeaderIdx + 1, unitsHeaderIdx).filter(isReferenceRange).map(normalizeRange);
  const units = lines
    .slice(unitsHeaderIdx + 1)
    .filter((line) => isUnit(line))
    .slice(0, tests.length);

  const maxRows = Math.min(tests.length, results.length);
  const rows: BloodResultRow[] = [];
  for (let i = 0; i < maxRows; i += 1) {
    const test = tests[i];
    const referenceRange = ranges[i] ?? "";
    const result = results[i] ?? "";
    rows.push({
      panel: resolvePanel("Unknown", test),
      test,
      result,
      unit: units[i] ?? "",
      referenceRange,
      status: referenceRange ? deriveStatus(result, referenceRange) : "Unknown",
    });
  }

  return rows;
}

function parseSequentialRows(lines: string[]): BloodResultRow[] {
  const rows: BloodResultRow[] = [];
  const sectionStart = findSectionStart(lines);
  const sectionEnd = findSectionEnd(lines, sectionStart);
  const section = lines.slice(sectionStart, sectionEnd);

  const tests: Array<{ idx: number; name: string }> = [];
  for (let i = 0; i < section.length; i += 1) {
    const canonical = canonicalizeTest(section[i]);
    if (canonical) {
      tests.push({ idx: i, name: canonical });
    }
  }
  if (!tests.length) {
    return rows;
  }

  const resultIdxs = section.map((line, idx) => (isResultValue(line) ? idx : -1)).filter((idx) => idx >= 0);
  const rangeIdxs = section.map((line, idx) => (isReferenceRange(line) ? idx : -1)).filter((idx) => idx >= 0);
  const unitIdxs = section.map((line, idx) => (isUnit(line) ? idx : -1)).filter((idx) => idx >= 0);

  let resultCursor = 0;
  let rangeCursor = 0;
  let unitCursor = 0;

  for (const test of tests) {
    const resultPos = nextIndexAtOrAfter(resultIdxs, Math.max(test.idx + 1, resultCursor));
    const rangePos = nextIndexAtOrAfter(rangeIdxs, Math.max(test.idx + 1, rangeCursor));
    const unitPos = nextIndexAtOrAfter(unitIdxs, Math.max(test.idx + 1, unitCursor));

    if (resultPos === -1 || rangePos === -1) {
      continue;
    }

    resultCursor = resultPos + 1;
    rangeCursor = rangePos + 1;
    if (unitPos !== -1) {
      unitCursor = unitPos + 1;
    }

    const result = normalizeResult(section[resultPos]);
    const referenceRange = normalizeRange(section[rangePos]);
    rows.push({
      panel: resolvePanel("Unknown", test.name),
      test: test.name,
      result,
      unit: unitPos === -1 ? "" : section[unitPos],
      referenceRange,
      status: deriveStatus(result, referenceRange),
    });
  }

  return rows;
}

function findFirstResultIndex(lines: string[], start: number, end: number): number {
  for (let i = start; i < end; i += 1) {
    if (isResultValue(lines[i])) {
      return i;
    }
  }
  return -1;
}

function findSectionStart(lines: string[]): number {
  const markers = ["completebloodcount", "hematology", "testname"];
  for (let i = 0; i < lines.length; i += 1) {
    const token = normalizeToken(lines[i]);
    if (markers.some((marker) => token.includes(marker))) {
      return i;
    }
  }
  return 0;
}

function findSectionEnd(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i += 1) {
    const token = normalizeToken(lines[i]);
    if (token.includes("digitallysigned") || token.includes("doctor")) {
      return i;
    }
  }
  return lines.length;
}

function nextIndexAtOrAfter(sortedIdxs: number[], minValue: number): number {
  for (const idx of sortedIdxs) {
    if (idx >= minValue) {
      return idx;
    }
  }
  return -1;
}

function dedupeRows(rows: BloodResultRow[]): BloodResultRow[] {
  const seen = new Set<string>();
  const deduped: BloodResultRow[] = [];
  for (const row of rows) {
    const key = [row.test, row.result, row.unit, row.referenceRange].join("|").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }
  return deduped;
}

function consolidateRows(rows: BloodResultRow[]): BloodResultRow[] {
  const byTest = new Map<string, BloodResultRow>();
  for (const row of rows) {
    const existing = byTest.get(row.test);
    if (!existing || scoreRow(row) > scoreRow(existing)) {
      byTest.set(row.test, row);
    }
  }
  return Array.from(byTest.values());
}

function scoreRow(row: BloodResultRow): number {
  let score = 0;
  if (row.unit) {
    score += 2;
  }
  if (row.referenceRange) {
    score += 2;
  }
  if (row.status !== "Unknown") {
    score += 1;
  }
  if (isPlausibleRow(row)) {
    score += 3;
  }
  return score;
}

function isPlausibleRow(row: BloodResultRow): boolean {
  if (!row.test || !row.result) {
    return false;
  }
  const latinChars = (row.test.match(/[A-Za-z]/g) ?? []).length;
  if (latinChars < 3) {
    return false;
  }
  if (row.unit && (canonicalizeKnownTest(row.unit) || /^(neu|lym|mon|eos|bas)%$/i.test(row.unit.trim()))) {
    return false;
  }
  const patterns = EXPECTED_UNIT_PATTERNS[row.test];
  if (!patterns || row.unit === "") {
    return true;
  }
  return patterns.some((pattern) => pattern.test(row.unit));
}

function isPanelHeader(value: string): boolean {
  const normalized = normalizeToken(value);
  for (const header of PANEL_HEADERS) {
    if (normalizeToken(header) === normalized) {
      return true;
    }
  }
  return false;
}

function normalizePanel(value: string): string {
  if (normalizeToken(value) === "completebloodcount") {
    return "Hematology";
  }
  return value;
}

function canonicalizeTest(value: string): string | null {
  const known = canonicalizeKnownTest(value);
  if (known) {
    return known;
  }
  if (!isLikelyTestName(value)) {
    return null;
  }
  return cleanTestName(value);
}

function canonicalizeKnownTest(value: string): string | null {
  const token = normalizeToken(value);
  if (!token) {
    return null;
  }

  for (const [canonical, aliases] of Object.entries(TEST_ALIASES)) {
    if (
      aliases.some((alias) => {
        const aliasToken = normalizeToken(alias);
        return token === aliasToken || token.startsWith(aliasToken) || token.endsWith(aliasToken);
      })
    ) {
      return canonical;
    }
  }
  return null;
}

function resolvePanel(currentPanel: string, test: string): string {
  if (currentPanel !== "Unknown") {
    return currentPanel;
  }
  return PANEL_BY_TEST[test] ?? "Unknown";
}

function isLikelyTestName(value: string): boolean {
  const v = value.trim();
  if (!v || v.length < 2 || v.length > 120) {
    return false;
  }
  if (isPanelHeader(v) || NOISE_LINES.has(v.toUpperCase())) {
    return false;
  }
  if (isReferenceRange(v) || isStatus(v) || isResultValue(v) || isUnit(v)) {
    return false;
  }
  if (!/[A-Za-z]/.test(v)) {
    return false;
  }
  if (/^(name|age|gender|doctor|date|email|sample|results|verified by)$/i.test(v)) {
    return false;
  }
  return true;
}

function cleanTestName(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[;:,]+$/, "").trim();
}

function normalizePanelLabel(value: string): string | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }
  if (isPanelHeader(cleaned)) {
    return normalizePanel(cleaned);
  }
  if (
    /function$/i.test(cleaned) ||
    /^biochemistry$/i.test(cleaned) ||
    /^hematology$/i.test(cleaned) ||
    /^electrolytes$/i.test(cleaned)
  ) {
    return cleaned;
  }
  return null;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9#%]+/g, "");
}

function isUnit(value: string): boolean {
  const v = value.replace(/\s+/g, "");
  return (
    v === "%" ||
    /^x?10\^\d+\/[a-z0-9µμ]+$/i.test(v) ||
    /^(mg\/dL|g\/dL|U\/L|mmol\/L|mL\/min(?:\/1\.73m²)?|ng\/dL|μIU\/mL|uIU\/mL|mm\/hr|fl|pg)$/i.test(v)
  );
}

function isReferenceRange(value: string): boolean {
  return /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(value) || /^up to\s+\d+(\.\d+)?$/i.test(value);
}

function isResultValue(value: string): boolean {
  return /^\s*-?\d+(\.\d+)?\s*$/.test(value);
}

function isStatus(value: string): boolean {
  return /^(normal|low|high|abnormal|borderline)$/i.test(value);
}

function normalizeStatus(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeResult(value: string): string {
  const number = extractFirstNumber(value);
  return number === null ? value : String(number);
}

function normalizeRange(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUnit(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(/10\*3/gi, "10^3")
    .replace(/10\*6/gi, "10^6")
    .replace(/ul/gi, "uL");
}

function deriveStatus(result: string, referenceRange: string): string {
  const resultValue = extractFirstNumber(result);
  const range = parseRange(referenceRange);
  if (resultValue === null || range === null) {
    return "Unknown";
  }

  if (resultValue < range.min) {
    return "Low";
  }
  if (resultValue > range.max) {
    return "High";
  }
  return "Normal";
}

function parseRange(value: string): { min: number; max: number } | null {
  const normalized = value.trim().toLowerCase();
  const between = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (between) {
    return { min: Number(between[1]), max: Number(between[2]) };
  }

  const upTo = normalized.match(/up to\s+(\d+(?:\.\d+)?)/);
  if (upTo) {
    return { min: 0, max: Number(upTo[1]) };
  }
  return null;
}

function extractFirstNumber(value: string): number | null {
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }
  return Number(match[0]);
}

function mapSupportedKeyFromName(name: string): BiomarkerKey | undefined {
  const normalized = normalizeForMatch(name);
  let best: { key: BiomarkerKey; aliasLength: number } | null = null;

  for (const [key, aliases] of Object.entries(SUPPORTED_KEY_ALIASES) as Array<[BiomarkerKey, string[]]>) {
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

export interface BiomarkerExtractionResult {
  allBiomarkers: ExtractedBiomarkerRow[];
  warnings: string[];
}

export function extractBiomarkersFromText(rawText: string): BiomarkerExtractionResult {
  const warnings: string[] = [];
  if (!rawText.trim()) {
    return {
      allBiomarkers: [],
      warnings: ["No readable text was extracted from this file."],
    };
  }

  const rows = extractBloodResults(rawText);
  const allBiomarkers = rows.reduce<ExtractedBiomarkerRow[]>((acc, row) => {
    const numericValue = extractFirstNumber(row.result);
    if (numericValue === null) {
      return acc;
    }
    acc.push({
      name: row.test,
      value: numericValue,
      mappedKey: mapSupportedKeyFromName(row.test),
      unit: row.unit || undefined,
      referenceRange: row.referenceRange || undefined,
      status: row.status === "Unknown" ? undefined : row.status,
    });
    return acc;
  }, []);

  if (allBiomarkers.length === 0) {
    warnings.push("No biomarker rows were parsed from this file.");
  }

  return {
    allBiomarkers,
    warnings,
  };
}
