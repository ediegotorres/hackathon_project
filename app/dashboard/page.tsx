"use client";

import Link from "next/link";
import { useState } from "react";
import { AtAGlanceCard } from "@/src/components/AtAGlanceCard";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { ProgressBar } from "@/src/components/ProgressBar";
import { ReportListItem } from "@/src/components/ReportListItem";
import { Sparkline } from "@/src/components/Sparkline";
import { StatusChip } from "@/src/components/StatusChip";
import { resolveCoreBiomarkers } from "@/src/lib/biomarkerMapping";
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

function normalizeMarkerName(name: string) {
  return name.toLowerCase().replace(/[^\da-z]+/g, " ").replace(/\s+/g, " ").trim();
}

export default function DashboardPage() {
  const [profile] = useState<UserProfile | null>(() => loadProfile());
  const [reports] = useState<LabReport[]>(() => loadReports());
  const [trendKey, setTrendKey] = useState<keyof LabReport["biomarkers"]>("ldl");
  const normalizedReports = reports.map((report) => ({ ...report, biomarkers: resolveCoreBiomarkers(report) }));

  const latestReport = normalizedReports[0] ?? null;
  const latestAnalysis = latestReport ? loadAnalysis(latestReport.id) : null;
  const completeCount = profileCompleteness(profile);
  const sortedForTrend = [...normalizedReports]
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map((report) => ({
      label: formatDate(report.dateISO),
      value: report.biomarkers[trendKey],
    }))
    .filter((item): item is { label: string; value: number } => typeof item.value === "number");
  const trendValues = sortedForTrend.map((item) => item.value);
  const trendLabels = sortedForTrend.map((item) => item.label);
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
        <h1 className="text-3xl font-bold tracking-tight">
          {profile?.name ? `${profile.name}'s Dashboard` : "Dashboard"}
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
        <Card className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fcfb_100%)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Flags</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-700">High</p>
              <p className="text-2xl font-bold text-rose-700">{latestAnalysis?.overall.highCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Borderline</p>
              <p className="text-2xl font-bold text-amber-700">{latestAnalysis?.overall.borderlineCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Normal</p>
              <p className="text-2xl font-bold text-emerald-700">{latestAnalysis?.overall.normalCount ?? 0}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">From latest saved analysis</p>
        </Card>
        <AtAGlanceCard label="Tracked Biomarkers" value={trackedValue} subtitle={trackedSubtitle} />
      </section>
      <div className="flex flex-wrap gap-2">
        <StatusChip status="high" label={`High ${latestAnalysis?.overall.highCount ?? 0}`} />
        <StatusChip status="borderline" label={`Borderline ${latestAnalysis?.overall.borderlineCount ?? 0}`} />
        <StatusChip status="normal" label={`Normal ${latestAnalysis?.overall.normalCount ?? 0}`} />
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--ink-soft)]">Marker</p>
          <select
            aria-label="Select marker for trend preview"
            value={trendKey}
            onChange={(e) => setTrendKey(e.target.value as keyof LabReport["biomarkers"])}
            className="h-9 rounded-xl border border-[var(--line)] bg-white px-3 text-sm motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            <option value="ldl">LDL</option>
            <option value="hdl">HDL</option>
            <option value="totalChol">Total Chol</option>
            <option value="triglycerides">Triglycerides</option>
            <option value="glucose">Glucose</option>
            <option value="a1c">A1C</option>
          </select>
        </div>
        {trendValues.length >= 2 ? (
          <div className="space-y-2">
            <Sparkline values={trendValues} labels={trendLabels} />
            <p className="text-sm text-[var(--ink-soft)]">
              {`Showing ${trendValues.length} data points for ${trendKey}.`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">
            Add at least 2 reports with this marker to show a trend line.
          </p>
        )}
      </Card>
    </div>
  );
}

