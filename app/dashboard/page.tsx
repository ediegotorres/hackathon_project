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

export default function DashboardPage() {
  const [profile] = useState<UserProfile | null>(() => loadProfile());
  const [reports] = useState<LabReport[]>(() => loadReports());
  const [trendKey, setTrendKey] = useState<keyof LabReport["biomarkers"]>("ldl");

  const latestReport = reports[0] ?? null;
  const latestAnalysis = latestReport ? loadAnalysis(latestReport.id) : null;
  const completeCount = profileCompleteness(profile);
  const trendValues = [...reports]
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map((report) => report.biomarkers[trendKey])
    .filter((value): value is number => typeof value === "number");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
        <AtAGlanceCard
          label="Flags"
          value={`${latestAnalysis?.overall.highCount ?? 0}/${latestAnalysis?.overall.borderlineCount ?? 0}/${latestAnalysis?.overall.normalCount ?? 0}`}
          subtitle="From latest saved analysis"
        />
        <AtAGlanceCard label="Tracked Biomarkers" value="6" subtitle="Total Chol, LDL, HDL, TG, Glucose, A1C" />
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
            <option value="a1c">A1C</option>
          </select>
        </div>
        {reports.length >= 2 ? (
          <div className="space-y-2">
            <Sparkline values={trendValues} />
            <p className="text-sm text-[var(--ink-soft)]">Preview mode. Connect to charting when backend trends are available.</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">Add at least 2 reports to see trends.</p>
        )}
      </Card>
    </div>
  );
}

