import { NextResponse } from "next/server";
import { answerReportQuestionWithGemini, type ReportChatTurn } from "@/src/lib/reportChat";
import type { LabReport } from "@/src/lib/types";

type ReportChatBody = {
  question?: string;
  currentReport?: LabReport;
  previousReport?: LabReport | null;
  summaryText?: string | null;
  conversation?: Array<{ role?: string; content?: string }>;
};

function toMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to generate chat response.";
}

function isCredentialError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("gemini api key is missing") || lower.includes("api key");
}

function sanitizeConversation(value: ReportChatBody["conversation"]): ReportChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
      const content = typeof item.content === "string" ? item.content.trim() : "";
      if (!role || !content) return null;
      return { role, content } satisfies ReportChatTurn;
    })
    .filter((item): item is ReportChatTurn => Boolean(item));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportChatBody;
    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json({ error: "Missing question." }, { status: 400 });
    }
    if (!body.currentReport) {
      return NextResponse.json({ error: "Missing current report context." }, { status: 400 });
    }

    const answer = await answerReportQuestionWithGemini({
      question,
      currentReport: body.currentReport,
      previousReport: body.previousReport ?? null,
      summaryText: body.summaryText ?? null,
      conversation: sanitizeConversation(body.conversation),
    });

    return NextResponse.json({ answer });
  } catch (error) {
    const message = toMessage(error);
    const friendlyMessage = isCredentialError(message)
      ? "AI chat is unavailable. Configure GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 500 });
  }
}
