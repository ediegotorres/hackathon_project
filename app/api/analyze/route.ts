import { NextResponse } from "next/server";
import { generateMockAnalysis } from "@/src/lib/analyze";
import { analyzeWithGemini } from "@/src/lib/gemini";
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

    // Get base analysis with detailed biomarker calculations
    const baseAnalysis = generateMockAnalysis(body.report, body.profile ?? null);

    // Enhance with AI-powered analysis using Google Gemini
    try {
      const geminiAnalysis = await analyzeWithGemini({
        report: body.report,
        profile: body.profile ?? null,
      });

      // Merge Gemini's AI insights with detailed biomarker analysis
      return NextResponse.json({
        ...baseAnalysis,
        summaryText: geminiAnalysis.summaryText,
        nextSteps: geminiAnalysis.nextSteps,
        doctorQuestions: geminiAnalysis.doctorQuestions,
      });
    } catch (geminiError) {
      // Fallback to template-based analysis if Gemini fails
      console.warn("Gemini analysis failed, falling back to template analysis:", geminiError);
      return NextResponse.json(baseAnalysis);
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
