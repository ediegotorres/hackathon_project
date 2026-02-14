"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { clearLabLensData, loadDemoMode, setDemoMode } from "@/src/lib/storage";

export default function Home() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(120deg,#0f766e_0%,#134e4a_60%,#0f172a_100%)] px-6 py-10 text-white sm:px-10">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-100">Hackathon Demo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            LabLens: Bloodwork Dashboard + Tracking
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-teal-50 sm:text-base">
            Track biomarker trends, view simple analysis outputs, and prepare discussion points for your clinician.
            This app is educational and not medical advice.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="px-6 py-3 text-base shadow-md"
              onClick={() => {
                if (loadDemoMode() === "sample") {
                  router.push("/dashboard");
                  return;
                }
                clearLabLensData();
                setDemoMode("none");
                router.push("/dashboard");
              }}
            >
              Start Tracking
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Platform highlights">
        <Card title="Track" subtitle="Capture reports over time">
          <p className="text-sm text-[var(--ink-soft)]">
            Add each report with key blood markers and optional notes.
          </p>
        </Card>
        <Card title="Analyze" subtitle="Deterministic API stub today">
          <p className="text-sm text-[var(--ink-soft)]">
            Calls `POST /api/analyze`; if unavailable, local mock analysis keeps demo flow working.
          </p>
        </Card>
        <Card title="Review" subtitle="Summaries and questions">
          <p className="text-sm text-[var(--ink-soft)]">
            View status chips, derived metrics, and clinician discussion prompts.
          </p>
        </Card>
      </section>
    </div>
  );
}
