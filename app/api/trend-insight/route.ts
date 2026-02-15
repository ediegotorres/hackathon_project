import { NextResponse } from "next/server";
import { analyzeTrendWithGemini } from "@/src/lib/gemini";
import type { TrendPoint, TrendSummary } from "@/src/lib/trends";

interface TrendInsightPayload {
  markerKey?: string;
  markerLabel?: string;
  unit?: string;
  points?: TrendPoint[];
  summary?: TrendSummary;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrendInsightPayload;
    if (!body.markerKey || !body.markerLabel || !body.unit || !Array.isArray(body.points) || !body.summary) {
      return NextResponse.json({ error: "Missing trend payload fields." }, { status: 400 });
    }

    const points = body.points.filter(
      (point) =>
        point &&
        typeof point.dateISO === "string" &&
        typeof point.value === "number" &&
        Number.isFinite(point.value),
    );
    if (points.length < 2) {
      return NextResponse.json({ error: "Need at least 2 trend points." }, { status: 400 });
    }

    try {
      const insight = await analyzeTrendWithGemini({
        markerKey: body.markerKey,
        markerLabel: body.markerLabel,
        unit: body.unit,
        points,
        summary: body.summary,
      });
      return NextResponse.json(insight);
    } catch (error) {
      console.warn("Gemini trend insight failed, returning deterministic fallback.", error);

      const first = points[0].value;
      const latest = points[points.length - 1].value;
      const delta = Number((latest - first).toFixed(2));
      const directionWord =
        body.summary.direction === "improving"
          ? "an improving direction"
          : body.summary.direction === "worsening"
            ? "a worsening direction"
            : body.summary.direction === "stable"
              ? "a stable direction"
              : "insufficient trend direction";

      return NextResponse.json({
        insightText: `${body.markerLabel} moved from ${first} to ${latest} ${body.unit} (${delta >= 0 ? "+" : ""}${delta}) and is currently ${body.summary.latestStatus ?? "unknown"}. The current pattern suggests ${directionWord} with ${body.summary.confidence} confidence.`,
        evidence: body.summary.evidence.slice(0, 3),
      });
    }
  } catch (error) {
    console.error("Trend insight error:", error);
    return NextResponse.json({ error: "Invalid trend payload." }, { status: 400 });
  }
}
