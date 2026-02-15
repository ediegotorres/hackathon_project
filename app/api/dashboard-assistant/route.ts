import { NextResponse } from "next/server";
import {
  answerDashboardQuestionWithGemini,
  generateDashboardOverviewWithGemini,
  type DashboardChatTurn,
  type DashboardOverview,
} from "@/src/lib/dashboardAssistant";
import type { AnalysisResult, LabReport, UserProfile } from "@/src/lib/types";

type DashboardAssistantBody = {
  action?: "overview" | "chat";
  question?: string;
  profile?: UserProfile | null;
  latestReport?: LabReport | null;
  previousReport?: LabReport | null;
  latestAnalysis?: AnalysisResult | null;
  latestStatusCounts?: { highCount: number; borderlineCount: number; normalCount: number; lowCount: number } | null;
  latestOverview?: DashboardOverview | null;
  conversation?: Array<{ role?: string; content?: string }>;
};

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Dashboard assistant request failed.";
}

function isCredentialError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("api key") || lower.includes("gemini");
}

function sanitizeConversation(value: DashboardAssistantBody["conversation"]): DashboardChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((turn) => {
      const role = turn.role === "assistant" ? "assistant" : turn.role === "user" ? "user" : null;
      const content = typeof turn.content === "string" ? turn.content.trim() : "";
      if (!role || !content) return null;
      return { role, content } satisfies DashboardChatTurn;
    })
    .filter((turn): turn is DashboardChatTurn => Boolean(turn));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DashboardAssistantBody;
    const action = body.action ?? "overview";

    if (!body.latestReport) {
      return NextResponse.json({ error: "Latest report is required for dashboard assistant." }, { status: 400 });
    }

    const context = {
      profile: body.profile ?? null,
      latestReport: body.latestReport,
      previousReport: body.previousReport ?? null,
      latestAnalysis: body.latestAnalysis ?? null,
      latestStatusCounts: body.latestStatusCounts ?? null,
    };

    if (action === "chat") {
      const question = body.question?.trim();
      if (!question) {
        return NextResponse.json({ error: "Question is required for chat action." }, { status: 400 });
      }

      const answer = await answerDashboardQuestionWithGemini({
        context,
        question,
        conversation: sanitizeConversation(body.conversation),
        latestOverview: body.latestOverview ?? null,
      });
      return NextResponse.json({ answer });
    }

    const overview = await generateDashboardOverviewWithGemini(context);
    return NextResponse.json({ overview });
  } catch (error) {
    const message = toMessage(error);
    const friendlyMessage = isCredentialError(message)
      ? "Dashboard AI assistant is unavailable. Configure GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
