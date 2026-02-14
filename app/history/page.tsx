"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { StatusChip } from "@/src/components/StatusChip";
import { loadAnalysis, loadReports } from "@/src/lib/storage";
import type { AnalysisResult, LabReport } from "@/src/lib/types";
import { formatDate } from "@/src/lib/utils";

const labelByKey: Record<string, string> = {
  totalChol: "Total Chol",
  ldl: "LDL",
  hdl: "HDL",
  triglycerides: "Triglycerides",
  glucose: "Glucose",
  a1c: "A1C",
};

function reportBadges(
  analysis: AnalysisResult | null,
): Array<{ status: "high" | "borderline" | "normal"; text: string }> {
  if (!analysis) return [];
  return analysis.biomarkers
    .map((item) => ({
      status: item.status === "high" ? "high" : item.status === "borderline" ? "borderline" : "normal",
      text: `${labelByKey[item.key] ?? item.label} ${
        item.status === "high" ? "High" : item.status === "borderline" ? "Borderline" : "Normal"
      }`,
    }));
}

export default function HistoryPage() {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setReports(loadReports());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <Link href="/new-report">
          <Button>New Report</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="No report history yet"
          description="Start with one report and build trends over time."
          compact
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16v16H4z" />
              <path d="M7 12h10M7 8h10M7 16h6" />
            </svg>
          }
          action={
            <Link href="/new-report">
              <Button>New Report</Button>
            </Link>
          }
          secondaryAction={<Link href="/dashboard" className="text-[var(--brand)] hover:underline">Back to Dashboard</Link>}
        />
      ) : (
        <section className="space-y-3">
          {reports.map((report) => {
            const badges = reportBadges(loadAnalysis(report.id));
            const showAll = expanded[report.id] ?? false;
            const visibleBadges = showAll ? badges : badges.slice(0, 3);
            const moreCount = badges.length > 3 ? badges.length - 3 : 0;
            return (
              <Card key={report.id} className="p-4">
                <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{formatDate(report.dateISO)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {visibleBadges.length > 0 ? (
                        visibleBadges.map((badge) => (
                          <StatusChip key={badge.text} status={badge.status} label={badge.text} />
                        ))
                      ) : (
                        <StatusChip status="neutral" label="Saved" />
                      )}
                      {moreCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [report.id]: !showAll }))}
                          className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        >
                          {showAll ? "Show less" : `+${moreCount} more`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <Link href={`/report/${report.id}`} className="self-center">
                    <Button className="min-w-28">View Results</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
