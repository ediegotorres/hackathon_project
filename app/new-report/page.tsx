"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";
import { generateMockAnalysis } from "@/src/lib/analyze";
import { inferMappedKey } from "@/src/lib/biomarkerMapping";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { Input } from "@/src/components/Input";
import { LoadingOverlay } from "@/src/components/LoadingOverlay";
import { loadProfile, loadReports, saveAnalysis, saveReports } from "@/src/lib/storage";
import type { AdditionalBiomarker, AnalysisResult, LabReport, ReportExtractionResponse } from "@/src/lib/types";
import { makeId } from "@/src/lib/utils";

type AdditionalBiomarkerFormItem = {
  id: string;
  name: string;
  value: string;
  mappedKey?: keyof LabReport["biomarkers"];
  unit: string;
  referenceRange: string;
  status: string;
};

export default function NewReportPage() {
  const router = useRouter();
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportType, setReportType] = useState<NonNullable<LabReport["reportType"]>>("blood_report");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [additionalBiomarkers, setAdditionalBiomarkers] = useState<AdditionalBiomarkerFormItem[]>([]);
  const [additionalErrors, setAdditionalErrors] = useState<Record<string, string>>({});
  const [bloodPressure, setBloodPressure] = useState({ systolic: "", diastolic: "", pulse: "" });
  const [bloodPressureErrors, setBloodPressureErrors] = useState<{
    systolic?: string;
    diastolic?: string;
    pulse?: string;
  }>({});

  const filledCount = useMemo(
    () => additionalBiomarkers.filter((item) => item.name.trim() && item.value.trim()).length,
    [additionalBiomarkers],
  );
  const canAnalyze = useMemo(() => {
    if (!dateISO) return false;
    if (reportType === "blood_pressure") {
      return Boolean(
        bloodPressure.systolic.trim() && bloodPressure.diastolic.trim() && bloodPressure.pulse.trim(),
      );
    }
    return filledCount >= 1;
  }, [bloodPressure.diastolic, bloodPressure.pulse, bloodPressure.systolic, dateISO, filledCount, reportType]);

  const validateAdditionalBiomarkers = () => {
    const nextErrors: Record<string, string> = {};
    additionalBiomarkers.forEach((item) => {
      if (!item.name.trim()) {
        nextErrors[item.id] = "Add a biomarker name.";
        return;
      }
      const parsed = Number(item.value.trim());
      if (!item.value.trim() || !Number.isFinite(parsed)) {
        nextErrors[item.id] = "Enter a numeric value.";
      }
    });
    setAdditionalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateBloodPressure = () => {
    const nextErrors: { systolic?: string; diastolic?: string; pulse?: string } = {};
    const systolic = Number(bloodPressure.systolic.trim());
    const diastolic = Number(bloodPressure.diastolic.trim());
    const pulse = Number(bloodPressure.pulse.trim());

    if (!bloodPressure.systolic.trim() || !Number.isFinite(systolic)) {
      nextErrors.systolic = "Enter a numeric systolic value.";
    }
    if (!bloodPressure.diastolic.trim() || !Number.isFinite(diastolic)) {
      nextErrors.diastolic = "Enter a numeric diastolic value.";
    }
    if (!bloodPressure.pulse.trim() || !Number.isFinite(pulse)) {
      nextErrors.pulse = "Enter a numeric pulse value.";
    }

    setBloodPressureErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadMessage("");
    setExtractionWarnings([]);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-report", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ReportExtractionResponse | { error?: string };
      if (!response.ok) {
        const message = "error" in payload && payload.error ? payload.error : "Failed to extract report data.";
        throw new Error(message);
      }

      const extraction = payload as ReportExtractionResponse;
      const extractedRows = extraction.allBiomarkers.map((row) => ({
        id: makeId("additional-marker"),
        name: row.name,
        value: String(row.value),
        mappedKey: row.mappedKey,
        unit: row.unit ?? "",
        referenceRange: row.referenceRange ?? "",
        status: row.status ?? "",
      }));

      setUploadedFileName(extraction.fileName);
      setAdditionalBiomarkers(extractedRows);
      setAdditionalErrors({});
      setExtractionWarnings(extraction.warnings);

      if (extractedRows.length > 0) {
        setUploadMessage(
          `Imported ${extractedRows.length} biomarker value${extractedRows.length === 1 ? "" : "s"} from ${extraction.fileName}.`,
        );
      } else {
        setUploadMessage(`No biomarker values were found in ${extraction.fileName}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to extract report data.";
      setUploadError(message);
      setUploadedFileName("");
      setAdditionalBiomarkers([]);
      setAdditionalErrors({});
      setExtractionWarnings([]);
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const updateAdditionalBiomarker = (id: string, patch: Partial<AdditionalBiomarkerFormItem>) => {
    setAdditionalBiomarkers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setAdditionalErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addAdditionalBiomarkerRow = () => {
    setAdditionalBiomarkers((prev) => [
      ...prev,
      {
        id: makeId("additional-marker"),
        name: "",
        value: "",
        unit: "",
        referenceRange: "",
        status: "",
      },
    ]);
  };

  const removeAdditionalBiomarkerRow = (id: string) => {
    setAdditionalBiomarkers((prev) => prev.filter((item) => item.id !== id));
    setAdditionalErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const onAnalyze = async () => {
    setFormError("");
    if (!canAnalyze) {
      setFormError(
        reportType === "blood_pressure"
          ? "Enter a report date and valid Sys/Dia/Pul values."
          : "Enter a report date and at least 1 biomarker value.",
      );
      return;
    }
    if (reportType === "blood_report" && !validateAdditionalBiomarkers()) return;
    if (reportType === "blood_pressure" && !validateBloodPressure()) return;

    const additionalPayload =
      reportType === "blood_pressure"
        ? ([
            {
              name: "Systolic Blood Pressure",
              value: Number(bloodPressure.systolic.trim()),
              unit: "mmHg",
            },
            {
              name: "Diastolic Blood Pressure",
              value: Number(bloodPressure.diastolic.trim()),
              unit: "mmHg",
            },
            {
              name: "Pulse",
              value: Number(bloodPressure.pulse.trim()),
              unit: "bpm",
            },
          ] satisfies AdditionalBiomarker[])
        : additionalBiomarkers.reduce<AdditionalBiomarker[]>((acc, item) => {
            const name = item.name.trim();
            const value = Number(item.value.trim());
            const mappedKey = item.mappedKey ?? inferMappedKey(name);
            if (!name || !Number.isFinite(value)) {
              return acc;
            }

            acc.push({
              name,
              value,
              mappedKey,
              unit: item.unit.trim() || undefined,
              referenceRange: item.referenceRange.trim() || undefined,
              status: item.status.trim() || undefined,
            });
            return acc;
          }, []);

    const coreBiomarkers =
      reportType === "blood_pressure"
        ? {}
        : additionalPayload.reduce<LabReport["biomarkers"]>((acc, item) => {
            if (!item.mappedKey) return acc;
            if (typeof acc[item.mappedKey] === "number") return acc;
            acc[item.mappedKey] = item.value;
            return acc;
          }, {});

    const report: LabReport = {
      id: makeId("report"),
      dateISO,
      reportType,
      biomarkers: coreBiomarkers,
      additionalBiomarkers: additionalPayload.length ? additionalPayload : undefined,
      notes: notes.trim() || undefined,
      createdAtISO: new Date().toISOString(),
    };

    const current = loadReports();
    saveReports([report, ...current].sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
    const profile = loadProfile();

    setLoading(true);
    let analysis: AnalysisResult;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, report }),
      });
      if (!response.ok) throw new Error("Analysis API unavailable");
      analysis = (await response.json()) as AnalysisResult;
    } catch {
      analysis = generateMockAnalysis(report, profile);
    } finally {
      setLoading(false);
    }

    saveAnalysis(report.id, analysis);
    router.push(`/report/${report.id}`);
  };

  return (
    <div className="space-y-8">
      <LoadingOverlay show={loading} label="Running analysis..." />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Upload a report to parse biomarkers, then review before analysis.</p>
      </div>
      <Card subtitle="Educational interpretation only. Confirm decisions with your clinician.">
        <div className="grid gap-4">
          <Input
            label="Report Date"
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
          />

          <label htmlFor="report-type" className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink-soft)]">Input Type</span>
            <select
              id="report-type"
              value={reportType}
              onChange={(e) => {
                const nextType = e.target.value as NonNullable<LabReport["reportType"]>;
                setReportType(nextType);
                setFormError("");
              }}
              className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-sm text-[var(--ink)] motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <option value="blood_report">Blood Report</option>
              <option value="blood_pressure">Blood Pressure Monitor</option>
            </select>
          </label>

          {reportType === "blood_report" ? (
            <>
              <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Import From File</h2>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    Upload an image, PDF, or text report to parse biomarker rows.
                  </p>
                </div>
                <label htmlFor="report-upload" className="block space-y-1.5">
                  <span className="text-sm font-medium text-[var(--ink-soft)]">Report File</span>
                  <input
                    id="report-upload"
                    type="file"
                    accept="image/*,.pdf,.txt,.csv,.tsv,.json,.xml"
                    onChange={onFileUpload}
                    disabled={uploading || loading}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface)] file:px-3 file:py-1.5 file:text-xs file:font-semibold motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                  />
                </label>
                {uploading ? <p className="text-sm text-[var(--ink-soft)]">Extracting report values...</p> : null}
                {uploadMessage ? <p className="text-sm text-emerald-700">{uploadMessage}</p> : null}
                {uploadError ? <p className="text-sm text-[var(--danger)]">{uploadError}</p> : null}
                {uploadedFileName ? <p className="text-xs text-[var(--ink-soft)]">Source: {uploadedFileName}</p> : null}
                {extractionWarnings.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--ink-soft)]">
                    {extractionWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Biomarkers</h2>
                  <Button type="button" variant="secondary" className="h-8 px-3 text-xs" onClick={addAdditionalBiomarkerRow}>
                    Add Row
                  </Button>
                </div>
                {additionalBiomarkers.length === 0 ? (
                  <p className="text-sm text-[var(--ink-soft)]">
                    No biomarkers yet. Upload a report or add rows manually.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {additionalBiomarkers.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            id={`${item.id}-name`}
                            label="Biomarker Name"
                            value={item.name}
                            onChange={(event) => updateAdditionalBiomarker(item.id, { name: event.target.value })}
                          />
                          <Input
                            id={`${item.id}-value`}
                            label="Value"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={item.value}
                            error={additionalErrors[item.id]}
                            onChange={(event) => updateAdditionalBiomarker(item.id, { value: event.target.value })}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)]">
                          {item.unit ? <span>Unit: {item.unit}</span> : null}
                          {item.referenceRange ? <span>Range: {item.referenceRange}</span> : null}
                          {item.status ? <span>Status: {item.status}</span> : null}
                        </div>
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-3 text-xs"
                            onClick={() => removeAdditionalBiomarkerRow(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Blood Pressure Inputs</h2>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">Enter Sys, Dia, and Pul values from your monitor reading.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Systolic (Sys)"
                  type="number"
                  inputMode="decimal"
                  value={bloodPressure.systolic}
                  error={bloodPressureErrors.systolic}
                  onChange={(e) => {
                    setBloodPressure((prev) => ({ ...prev, systolic: e.target.value }));
                    setBloodPressureErrors((prev) => ({ ...prev, systolic: undefined }));
                  }}
                />
                <Input
                  label="Diastolic (Dia)"
                  type="number"
                  inputMode="decimal"
                  value={bloodPressure.diastolic}
                  error={bloodPressureErrors.diastolic}
                  onChange={(e) => {
                    setBloodPressure((prev) => ({ ...prev, diastolic: e.target.value }));
                    setBloodPressureErrors((prev) => ({ ...prev, diastolic: undefined }));
                  }}
                />
                <Input
                  label="Pulse (Pul)"
                  type="number"
                  inputMode="decimal"
                  value={bloodPressure.pulse}
                  error={bloodPressureErrors.pulse}
                  onChange={(e) => {
                    setBloodPressure((prev) => ({ ...prev, pulse: e.target.value }));
                    setBloodPressureErrors((prev) => ({ ...prev, pulse: undefined }));
                  }}
                />
              </div>
            </section>
          )}

          <label htmlFor="report-notes" className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink-soft)]">Notes</span>
            <textarea
              id="report-notes"
              rows={4}
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-describedby="report-notes-count"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              placeholder="Context from this draw, fasting state, medication changes, etc."
            />
            <p id="report-notes-count" className="text-xs text-[var(--ink-soft)]">
              {notes.length}/400
            </p>
          </label>
        </div>
        {formError ? <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p> : null}
        <div className="mt-5">
          <Button onClick={onAnalyze} disabled={!canAnalyze} className="h-11 px-6 text-base shadow-md">
            Analyze
          </Button>
        </div>
      </Card>
    </div>
  );
}
