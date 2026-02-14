import { NextResponse } from "next/server";
import { generateMockAnalysis } from "@/src/lib/analyze";
import type { LabReport, UserProfile } from "@/src/lib/types";

interface AnalyzePayload {
  profile?: UserProfile | null;
  report?: LabReport;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzePayload;

    if (!body.report) {
      return NextResponse.json({ error: "Missing report payload" }, { status: 400 });
    }

    // TODO(backend): replace with centralized rules engine and model-backed explanations.
    // TODO(backend): add profile-aware normalization logic and longitudinal comparisons.
    const analysis = generateMockAnalysis(body.report, body.profile ?? null);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
