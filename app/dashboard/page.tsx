"use client";

import Link from "next/link";
import { useState } from "react";
import { AtAGlanceCard } from "@/src/components/AtAGlanceCard";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { GroupedBarChart } from "@/src/components/GroupedBarChart";
import { ProgressBar } from "@/src/components/ProgressBar";
import { ReportListItem } from "@/src/components/ReportListItem";
import { StatusChip } from "@/src/components/StatusChip";
import { generateMockAnalysis } from "@/src/lib/analyze";
import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
import { normalizeMarkerName, summarizeReportStatuses } from "@/src/lib/markerStatus";
import { loadAnalysis, loadProfile, loadReports } from "@/src/lib/storage";
import type { LabReport, UserProfile } from "@/src/lib/types";
import { formatDate } from "@/src/lib/utils";

function profileCompleteness(profile: UserProfile | null) {
  if (!profile) return 0;
  const checks = [
    Number.isFinite(profile.age) && profile.age > 0,
    Boolean(profile.sexAtBirth),
    Number.isFinite(profile.heightCm) && profile.heightCm > 0,
    Number.isFinite(profile.weightKg) && profile.weightKg > 0,
    Boolean(profile.activityLevel),
  ];
  return checks.filter(Boolean).length;
}

const coreMarkerMeta: Record<keyof LabReport["biomarkers"], { label: string; unit?: string }> = {
  ldl: { label: "LDL", unit: "mg/dL" },
  hdl: { label: "HDL", unit: "mg/dL" },
  totalChol: { label: "Total Chol", unit: "mg/dL" },
  triglycerides: { label: "Triglycerides", unit: "mg/dL" },
  glucose: { label: "Glucose", unit: "mg/dL" },
  a1c: { label: "A1C", unit: "%" },
};

const chartPalette = ["#0f766e", "#14b8a6", "#0ea5e9", "#6366f1", "#f59e0b", "#e11d48", "#84cc16", "#f97316"];

export default function DashboardPage() {
  const [profile] = useState<UserProfile | null>(() => loadProfile());
  const [reports] = useState<LabReport[]>(() => loadReports());
  const normalizedReports = reports.map((report) => ({ ...report, biomarkers: resolveCoreBiomarkers(report) }));

  const latestReport = normalizedReports[0] ?? null;
  const savedLatestAnalysis = latestReport ? loadAnalysis(latestReport.id) : null;
  const latestAnalysis = latestReport ? savedLatestAnalysis ?? generateMockAnalysis(latestReport, profile) : null;
  const latestSummary = latestReport
    ? summarizeReportStatuses(latestReport, latestAnalysis)
    : { highCount: 0, borderlineCount: 0, normalCount: 0, lowCount: 0 };
  const completeCount = profileCompleteness(profile);
  const optionMap = new Map<string, { id: string; label: string; unit?: string; isCore: boolean }>();
  normalizedReports.forEach((report) => {
    (Object.keys(coreMarkerMeta) as Array<keyof LabReport["biomarkers"]>).forEach((key) => {
      const value = report.biomarkers[key];
      if (typeof value !== "number") return;
      if (!optionMap.has(`core:${key}`)) {
        optionMap.set(`core:${key}`, {
          id: `core:${key}`,
          label: coreMarkerMeta[key].label,
          unit: coreMarkerMeta[key].unit,
          isCore: true,
        });
      }
    });

    (report.additionalBiomarkers ?? []).forEach((item) => {
      if (item.mappedKey) return;
      const normalized = normalizeMarkerName(item.name);
      if (!normalized) return;
      const optionId = `extra:${normalized}`;
      if (!optionMap.has(optionId)) {
        optionMap.set(optionId, {
          id: optionId,
          label: item.name,
          unit: item.unit,
          isCore: false,
        });
      }
    });
  });
  const markerOptions = Array.from(optionMap.values()).sort((a, b) => {
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  const [selectedMarkerIds, setSelectedMarkerIds] = useState<string[]>([]);
  const [selectionCustomized, setSelectionCustomized] = useState(false);
  const validSelected = selectedMarkerIds.filter((id) => markerOptions.some((option) => option.id === id));
  const activeMarkerIds =
    validSelected.length > 0
      ? validSelected
      : selectionCustomized
        ? []
        : markerOptions.slice(0, 3).map((option) => option.id);

  const chartSeries = activeMarkerIds
    .map((id, index) => {
      const option = markerOptions.find((item) => item.id === id);
      if (!option) return null;
      return {
        id: option.id,
        label: option.unit ? `${option.label} (${option.unit})` : option.label,
        color: chartPalette[index % chartPalette.length],
      };
    })
    .filter((item): item is { id: string; label: string; color: string } => Boolean(item));

  const orderedReports = [...normalizedReports].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const chartData = orderedReports.map((report) => {
    const values: Record<string, number | undefined> = {};
    activeMarkerIds.forEach((markerId) => {
      if (markerId.startsWith("core:")) {
        const key = markerId.replace("core:", "") as keyof LabReport["biomarkers"];
        values[markerId] = report.biomarkers[key];
        return;
      }
      const markerName = markerId.replace("extra:", "");
      const match = (report.additionalBiomarkers ?? []).find(
        (item) => !item.mappedKey && normalizeMarkerName(item.name) === markerName,
      );
      values[markerId] = typeof match?.value === "number" ? match.value : undefined;
    });
    return {
      label: formatDate(report.dateISO),
      values,
    };
  }).filter((datum) =>
    activeMarkerIds.some((markerId) => typeof datum.values[markerId] === "number"),
  );
  const trackedBiomarkerKeys = new Set<string>();
  normalizedReports.forEach((report) => {
    Object.entries(report.biomarkers).forEach(([key, value]) => {
      if (typeof value === "number") {
        trackedBiomarkerKeys.add(`core:${key}`);
      }
    });
    (report.additionalBiomarkers ?? []).forEach((item) => {
      if (item.mappedKey) {
        trackedBiomarkerKeys.add(`core:${item.mappedKey}`);
        return;
      }
      const normalizedName = normalizeMarkerName(item.name);
      if (normalizedName) {
        trackedBiomarkerKeys.add(`extra:${normalizedName}`);
      }
    });
  });
  const trackedCount = trackedBiomarkerKeys.size;
  const trackedValue = trackedCount === 0 ? "No biomarkers tracked" : String(trackedCount);
  const trackedSubtitle =
    trackedCount === 0 ? "Upload or add biomarkers to start tracking trends." : `${trackedCount} total unique biomarkers`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          {profile?.name ? (
            <>
              <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </span>
              <span>{`${profile.name}'s Dashboard`}</span>
            </>
          ) : (
            "Dashboard"
          )}
        </h1>
        <div className="flex gap-2">
          <Link href="/new-report">
            <Button>New Report</Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <AtAGlanceCard
          label="Latest Report"
          value={latestReport ? formatDate(latestReport.dateISO) : "None yet"}
          subtitle="Most recent report date"
        />
        <Card className="bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-strong)_100%)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Flags</p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center">
              <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.04em] text-rose-700">High</p>
              <p className="text-2xl font-bold text-rose-700">{latestSummary.highCount}</p>
            </div>
            <div className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.02em] text-amber-700">Borderline</p>
              <p className="text-2xl font-bold text-amber-700">{latestSummary.borderlineCount}</p>
            </div>
            <div className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
              <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.04em] text-emerald-700">Normal</p>
              <p className="text-2xl font-bold text-emerald-700">{latestSummary.normalCount}</p>
            </div>
            <div className="flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center">
              <p className="whitespace-nowrap text-[11px] font-semibold uppercase leading-none tracking-[0.04em] text-sky-700">Low</p>
              <p className="text-2xl font-bold text-sky-700">{latestSummary.lowCount}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">From latest report markers</p>
        </Card>
        <AtAGlanceCard label="Tracked Biomarkers" value={trackedValue} subtitle={trackedSubtitle} />
      </section>
      <div className="flex flex-wrap gap-2">
        <StatusChip status="high" label={`High ${latestSummary.highCount}`} />
        <StatusChip status="borderline" label={`Borderline ${latestSummary.borderlineCount}`} />
        <StatusChip status="normal" label={`Normal ${latestSummary.normalCount}`} />
        <StatusChip status="low" label={`Low ${latestSummary.lowCount}`} />
      </div>

      <Card title="Profile Summary">
        {profile ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-[var(--ink)]">Profile completeness</p>
                <p className="text-[var(--ink-soft)]">{completeCount}/5</p>
              </div>
              <ProgressBar value={completeCount} max={5} />
            </div>
            <div className="grid gap-3 text-sm text-[var(--ink-soft)] sm:grid-cols-3">
              <p>Name: {profile.name || "Not provided"}</p>
              <p>Age: {profile.age}</p>
              <p>Sex at birth: {profile.sexAtBirth}</p>
              <p>Activity: {profile.activityLevel}</p>
              <p>Height: {profile.heightCm} cm</p>
              <p>Weight: {profile.weightKg} kg</p>
              <p className="sm:col-span-3">Goals: {profile.goals || "Not provided"}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No profile yet"
            description="Add your profile first so analysis can be contextualized."
            compact
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--ink-soft)]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                <path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
            }
            action={
              <Link href="/profile">
                <Button>Set up Profile</Button>
              </Link>
            }
            secondaryAction={
              <Link
                href="/new-report"
                className="text-[var(--brand)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                Skip for now
              </Link>
            }
          />
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Reports</h2>
        {reports.length === 0 ? (
          <EmptyState
            title="No reports saved"
            description="Create a report to generate trend views and analysis output."
            compact
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--ink-soft)]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 4h14v16H5z" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            }
            action={
              <Link href="/new-report">
                <Button>New Report</Button>
              </Link>
            }
            secondaryAction={
              <Link
                href="/history"
                className="text-[var(--brand)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                View History
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 4).map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <Card title="Trend Preview">
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--ink-soft)]">Displayed markers</p>
            <div className="flex items-center gap-2">
              <select
                aria-label="Add marker to bar chart"
                defaultValue=""
                onChange={(e) => {
                  const markerId = e.target.value;
                  if (!markerId) return;
                  setSelectionCustomized(true);
                  setSelectedMarkerIds((prev) => {
                    const base = prev.length > 0 || selectionCustomized ? prev : activeMarkerIds;
                    return base.includes(markerId) ? base : [...base, markerId];
                  });
                  e.currentTarget.value = "";
                }}
                className="h-9 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-sm motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                <option value="">Add marker...</option>
                {markerOptions
                  .filter((option) => !activeMarkerIds.includes(option.id))
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.unit ? `${option.label} (${option.unit})` : option.label}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3 text-xs"
                onClick={() => {
                  setSelectionCustomized(true);
                  setSelectedMarkerIds([]);
                }}
              >
                Reset graph
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeMarkerIds.map((id) => {
              const option = markerOptions.find((item) => item.id === id);
              if (!option) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectionCustomized(true);
                    setSelectedMarkerIds((prev) => prev.filter((value) => value !== id));
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)] hover:border-rose-500 hover:text-rose-700"
                  aria-label={`Remove ${option.label} from chart`}
                >
                  {option.unit ? `${option.label} (${option.unit})` : option.label}
                  <span aria-hidden="true">x</span>
                </button>
              );
            })}
            {activeMarkerIds.length === 0 ? (
              <span className="text-sm text-[var(--ink-soft)]">Select at least one marker.</span>
            ) : null}
          </div>
        </div>
        {chartSeries.length > 0 && chartData.length > 0 ? (
          <div className="space-y-2">
            <GroupedBarChart data={chartData} series={chartSeries} />
            <p className="text-sm text-[var(--ink-soft)]">
              {`Showing ${chartSeries.length} marker${chartSeries.length === 1 ? "" : "s"} across ${chartData.length} report${chartData.length === 1 ? "" : "s"}.`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">
            Add reports with biomarker values to display the bar chart.
          </p>
        )}
      </Card>
    </div>
  );
}

