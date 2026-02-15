import type { LabReport } from "@/src/lib/types";

const defaultModels = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;

const coreBiomarkerLabels: Record<string, string> = {
  totalChol: "Total Cholesterol",
  ldl: "LDL",
  hdl: "HDL",
  triglycerides: "Triglycerides",
  glucose: "Glucose",
  a1c: "Hemoglobin A1c",
};

export type ReportChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export interface ReportChatRequest {
  question: string;
  currentReport: LabReport;
  previousReport?: LabReport | null;
  summaryText?: string | null;
  conversation?: ReportChatTurn[];
}

function getApiKey() {
  return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function getModelCandidates() {
  const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
  const models = configuredModel ? [configuredModel, ...defaultModels] : [...defaultModels];
  return [...new Set(models)];
}

function formatCoreBiomarkers(report: LabReport) {
  const entries = Object.entries(report.biomarkers)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => {
      const label = coreBiomarkerLabels[key] ?? key;
      return `- ${label}: ${value}`;
    });
  return entries.length ? entries.join("\n") : "- None";
}

function formatAdditionalBiomarkers(report: LabReport) {
  const entries =
    report.additionalBiomarkers?.map((item) => {
      const unit = item.unit ? ` ${item.unit}` : "";
      const range = item.referenceRange ? ` (range: ${item.referenceRange})` : "";
      return `- ${item.name}: ${item.value}${unit}${range}`;
    }) ?? [];
  return entries.length ? entries.join("\n") : "- None";
}

function formatReportBlock(label: string, report?: LabReport | null) {
  if (!report) {
    return `${label}: No report available.`;
  }

  return `${label} (${report.dateISO})
Core biomarkers:
${formatCoreBiomarkers(report)}

Additional biomarkers:
${formatAdditionalBiomarkers(report)}

Notes: ${report.notes ?? "None"}`;
}

function formatConversation(conversation?: ReportChatTurn[]) {
  const turns = (conversation ?? [])
    .filter((item) => item.content.trim().length > 0)
    .slice(-10)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "User"}: ${item.content.trim()}`);

  return turns.length ? turns.join("\n") : "No prior conversation.";
}

function toAnswerText(result: unknown) {
  const text = (result as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]
    ?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text.trim() : "";
}

export async function answerReportQuestionWithGemini(payload: ReportChatRequest): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY.");
  }

  const prompt = `You are an educational lab-results assistant. Explain clearly for a non-clinician.

Important constraints:
- Use only the provided report data.
- Do not diagnose or prescribe treatment.
- Keep the answer concise, practical, and easy to understand.
- If data is missing, say so directly.
- Suggest at most one follow-up question the user can ask.

${formatReportBlock("Current report", payload.currentReport)}

${formatReportBlock("Previous report", payload.previousReport)}

Saved summary: ${payload.summaryText ?? "None"}

Conversation so far:
${formatConversation(payload.conversation)}

User question:
${payload.question}`;

  let lastError: unknown;
  for (const modelName of getModelCandidates()) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500,
            },
          }),
        },
      );

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${responseBody}`);
      }

      const result = await response.json();
      const answer = toAnswerText(result);
      if (!answer) {
        throw new Error("Gemini returned an empty answer.");
      }
      return answer;
    } catch (error) {
      lastError = error;
      console.warn(`Report chat failed for model "${modelName}", trying next fallback.`);
    }
  }

  throw lastError ?? new Error("Gemini report chat failed for all configured models.");
}
