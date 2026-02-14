"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { generateMockAnalysis } from "@/src/lib/analyze";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { Input } from "@/src/components/Input";
import { LoadingOverlay } from "@/src/components/LoadingOverlay";
import { loadProfile, loadReports, saveAnalysis, saveReports } from "@/src/lib/storage";
import type { AnalysisResult, LabReport } from "@/src/lib/types";
import { makeId, toNumberOrUndefined } from "@/src/lib/utils";

type MarkerForm = {
  totalChol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  glucose: string;
  a1c: string;
};

type MarkerErrors = Partial<Record<keyof MarkerForm, string>>;

const limits: Record<keyof MarkerForm, { min: number; max: number }> = {
  totalChol: { min: 0, max: 400 },
  ldl: { min: 0, max: 300 },
  hdl: { min: 0, max: 200 },
  triglycerides: { min: 0, max: 1000 },
  glucose: { min: 0, max: 500 },
  a1c: { min: 0, max: 20 },
};

export default function NewReportPage() {
  const router = useRouter();
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [biomarkers, setBiomarkers] = useState<MarkerForm>({
    totalChol: "",
    ldl: "",
    hdl: "",
    triglycerides: "",
    glucose: "",
    a1c: "",
  });
  const [errors, setErrors] = useState<MarkerErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const filledCount = useMemo(
    () => Object.values(biomarkers).filter((value) => value.trim().length > 0).length,
    [biomarkers],
  );
  const canAnalyze = Boolean(dateISO) && filledCount >= 2;

  const validateMarkers = () => {
    const nextErrors: MarkerErrors = {};
    (Object.keys(biomarkers) as Array<keyof MarkerForm>).forEach((key) => {
      const raw = biomarkers[key].trim();
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        nextErrors[key] = "Enter a numeric value.";
        return;
      }
      if (parsed < limits[key].min || parsed > limits[key].max) {
        nextErrors[key] = `Use ${limits[key].min}-${limits[key].max}.`;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onAnalyze = async () => {
    setFormError("");
    if (!canAnalyze) {
      setFormError("Enter a report date and at least 2 biomarker values.");
      return;
    }
    if (!validateMarkers()) return;

    const report: LabReport = {
      id: makeId("report"),
      dateISO,
      biomarkers: {
        totalChol: toNumberOrUndefined(biomarkers.totalChol),
        ldl: toNumberOrUndefined(biomarkers.ldl),
        hdl: toNumberOrUndefined(biomarkers.hdl),
        triglycerides: toNumberOrUndefined(biomarkers.triglycerides),
        glucose: toNumberOrUndefined(biomarkers.glucose),
        a1c: toNumberOrUndefined(biomarkers.a1c),
      },
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
    <div className="space-y-6">
      <LoadingOverlay show={loading} label="Running analysis..." />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Report</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Enter values from your lab portal. Units shown are typical.</p>
      </div>
      <Card subtitle="Educational interpretation only. Confirm decisions with your clinician.">
        <div className="grid gap-4">
          <Input
            label="Report Date"
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
          />

          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Lipids</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Total Cholesterol"
                type="number"
                min={0}
                max={400}
                step="any"
                inputMode="decimal"
                helperText="mg/dL"
                value={biomarkers.totalChol}
                error={errors.totalChol}
                onChange={(e) => setBiomarkers((prev) => ({ ...prev, totalChol: e.target.value }))}
              />
              <Input
                label="LDL"
                type="number"
                min={0}
                max={300}
                step="any"
                inputMode="decimal"
                helperText="mg/dL"
                value={biomarkers.ldl}
                error={errors.ldl}
                onChange={(e) => setBiomarkers((prev) => ({ ...prev, ldl: e.target.value }))}
              />
              <Input
                label="HDL"
                type="number"
                min={0}
                max={200}
                step="any"
                inputMode="decimal"
                helperText="mg/dL"
                value={biomarkers.hdl}
                error={errors.hdl}
                onChange={(e) => setBiomarkers((prev) => ({ ...prev, hdl: e.target.value }))}
              />
              <Input
                label="Triglycerides"
                type="number"
                min={0}
                max={1000}
                step="any"
                inputMode="decimal"
                helperText="mg/dL"
                value={biomarkers.triglycerides}
                error={errors.triglycerides}
                onChange={(e) => setBiomarkers((prev) => ({ ...prev, triglycerides: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Glucose</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Glucose"
                type="number"
                min={0}
                max={500}
                step="any"
                inputMode="decimal"
                helperText="mg/dL"
                value={biomarkers.glucose}
                error={errors.glucose}
                onChange={(e) => setBiomarkers((prev) => ({ ...prev, glucose: e.target.value }))}
              />
              <Input
                label="A1C"
                type="number"
                min={0}
                max={20}
                step="any"
                inputMode="decimal"
                helperText="%"
                value={biomarkers.a1c}
                error={errors.a1c}
                onChange={(e) => setBiomarkers((prev) => ({ ...prev, a1c: e.target.value }))}
              />
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">Notes</span>
            <textarea
              rows={4}
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] focus-visible:outline-none"
              placeholder="Context from this draw, fasting state, medication changes, etc."
            />
            <p className="text-xs text-[var(--muted)]">{notes.length}/400</p>
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
