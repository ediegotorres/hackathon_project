"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { clearLabLensData, loadDemoMode, setDemoMode } from "@/src/lib/storage";

const heroParticles = ["LDL", "HDL", "A1C", "+12%", "-8%", "TG", "GLU", "RISK"];

const panelCards = [
  {
    title: "Track",
    subtitle: "Capture reports over time",
    body: "Upload lab reports, parse biomarkers, and build your longitudinal health timeline.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h16v16H4z" />
        <path d="M7 14l3-3 3 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Analyze",
    subtitle: "Explain risk clearly",
    body: "Get an easy-to-read summary with status flags, context, and personalized clinician prompts.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 4h14v16H5z" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    title: "Review",
    subtitle: "See what changed",
    body: "Compare reports, monitor deltas, and surface meaningful trends before your next appointment.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12h4l2-3 3 6 2-3h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="space-y-9">
      <Card className="hero-shell relative overflow-hidden border-0 p-0 shadow-[0_24px_56px_rgba(15,23,42,0.18)]">
        <div
          className="relative bg-[linear-gradient(130deg,#0f766e_0%,#0d9488_36%,#0f172a_100%)] bg-[length:200%_200%] px-6 py-10 text-white sm:px-10"
          style={{ animation: "gradient-shift 24s ease infinite" }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {heroParticles.map((token, index) => (
              <span
                key={token}
                className="absolute text-xs font-semibold tracking-[0.14em] text-white/10"
                style={{
                  left: `${8 + (index % 4) * 22}%`,
                  top: `${14 + Math.floor(index / 2) * 18}%`,
                  animation: `particle-float ${8 + (index % 4) * 2}s ease-in-out ${(index % 3) * 0.8}s infinite`,
                }}
              >
                {token}
              </span>
            ))}
          </div>

          <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-teal-100/90">
            Bloodwork Analytics Platform
          </p>
          <p className="relative mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">LabLens</p>
          <h1 className="relative mt-3 max-w-3xl text-2xl font-semibold leading-tight text-white sm:text-4xl">
            Track trends. Understand risk. Prepare smarter conversations.
          </h1>
          <p className="relative mt-4 max-w-2xl text-sm text-teal-50/90 sm:text-base">
            Get structured biomarker tracking, plain-language summaries, and report-to-report delta insight in one
            polished dashboard.
          </p>

          <div className="relative mt-7 flex flex-wrap gap-3">
            <Button
              className="px-6 py-3 text-base shadow-[0_10px_24px_rgba(13,148,136,0.35)]"
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
        {panelCards.map((card) => (
          <article
            key={card.title}
            className="group rounded-2xl border border-[var(--line)] bg-[var(--glass)] p-5 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal-300/60 bg-teal-100/70 text-teal-700">
              {card.icon}
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight">{card.title}</h2>
            <p className="text-sm font-medium text-[var(--ink-soft)]">{card.subtitle}</p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
