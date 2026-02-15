import type { AnalysisResult, LabReport, UserProfile } from "@/src/lib/types";

const defaultModels = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;

export type DashboardAssistantStatus = "healthy" | "mixed" | "needs_attention";

export type DashboardOverview = {
  overallStatus: DashboardAssistantStatus;
  headline: string;
  overview: string;
  attention: string[];
  suggestions: string[];
};

export type DashboardChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type DashboardContext = {
  profile?: UserProfile | null;
  latestReport?: LabReport | null;
  previousReport?: LabReport | null;
  latestAnalysis?: AnalysisResult | null;
  latestStatusCounts?: { highCount: number; borderlineCount: number; normalCount: number; lowCount: number } | null;
};

function getApiKey() {
  return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function getModelCandidates() {
  const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
  const models = configuredModel ? [configuredModel, ...defaultModels] : [...defaultModels];
  return [...new Set(models)];
}

function toModelText(result: unknown) {
  const text = (result as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]
    ?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text.trim() : "";
}

function normalizeStatus(value: unknown): DashboardAssistantStatus {
  if (value === "healthy" || value === "mixed" || value === "needs_attention") {
    return value;
  }
  return "mixed";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function formatProfile(profile?: UserProfile | null) {
  if (!profile) return "Profile: Not available.";
  return `Profile:
- Name: ${profile.name || "Not provided"}
- Age: ${profile.age}
- Sex at birth: ${profile.sexAtBirth}
- Height: ${profile.heightCm} cm
- Weight: ${profile.weightKg} kg
- Activity level: ${profile.activityLevel}
- Goals: ${profile.goals || "Not provided"}
- Lifestyle notes: ${profile.lifestyleNotes || "Not provided"}`;
}

function formatReport(label: string, report?: LabReport | null) {
  if (!report) return `${label}: Not available.`;
  const core = Object.entries(report.biomarkers)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");
  const additional = (report.additionalBiomarkers ?? [])
    .map((item) => `- ${item.name}: ${item.value}${item.unit ? ` ${item.unit}` : ""}`)
    .join("\n");

  return `${label} (${report.dateISO}):
Core biomarkers:
${core || "- None"}
Additional biomarkers:
${additional || "- None"}
Notes: ${report.notes || "None"}`;
}

function formatAnalysis(analysis?: AnalysisResult | null) {
  if (!analysis) return "Latest deterministic/AI analysis: Not available.";
  return `Latest analysis summary:
- Summary: ${analysis.summaryText}
- Counts: high=${analysis.overall.highCount}, borderline=${analysis.overall.borderlineCount}, normal=${analysis.overall.normalCount}`;
}

function formatCounts(counts?: { highCount: number; borderlineCount: number; normalCount: number; lowCount: number } | null) {
  if (!counts) return "Status counts: Not available.";
  return `Status counts:
- High: ${counts.highCount}
- Borderline: ${counts.borderlineCount}
- Normal: ${counts.normalCount}
- Low: ${counts.lowCount}`;
}

async function callGemini(prompt: string, expectJson: boolean) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY.");
  }

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
            generationConfig: expectJson
              ? { temperature: 0.2, responseMimeType: "application/json" }
              : { temperature: 0.2, maxOutputTokens: 500 },
          }),
        },
      );

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${responseBody}`);
      }

      const data = await response.json();
      const text = toModelText(data);
      if (!text) {
        throw new Error("Gemini returned empty content.");
      }
      return { modelName, text };
    } catch (error) {
      lastError = error;
      console.warn(`Dashboard assistant failed for model "${modelName}", trying next fallback.`);
    }
  }

  throw lastError ?? new Error("Dashboard assistant failed for all configured models.");
}

export async function generateDashboardOverviewWithGemini(context: DashboardContext): Promise<DashboardOverview> {
  const prompt = `You are an educational health assistant. Review the user profile and lab trends.

Rules:
- Educational guidance only. No diagnosis.
- Use plain, non-technical language.
- Be concrete and practical.
- If values look mostly okay, you may say health appears stable.
- If some values need attention, highlight them clearly.
- Mention trend direction if previous report exists.

Respond ONLY as raw JSON in this exact structure:
{
  "overallStatus": "healthy" | "mixed" | "needs_attention",
  "headline": "short title",
  "overview": "2-4 sentence overview",
  "attention": ["item 1", "item 2"],
  "suggestions": ["action 1", "action 2", "action 3"]
}

${formatProfile(context.profile)}

${formatReport("Latest report", context.latestReport)}

${formatReport("Previous report", context.previousReport)}

${formatAnalysis(context.latestAnalysis)}

${formatCounts(context.latestStatusCounts)}`;

  const { text } = await callGemini(prompt, true);
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse dashboard overview JSON.");
  }
  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const overview = typeof parsed.overview === "string" ? parsed.overview.trim() : "";
  const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : "";
  if (!overview || !headline) {
    throw new Error("Dashboard overview response missing required fields.");
  }

  return {
    overallStatus: normalizeStatus(parsed.overallStatus),
    headline,
    overview,
    attention: asStringArray(parsed.attention),
    suggestions: asStringArray(parsed.suggestions),
  };
}

export async function answerDashboardQuestionWithGemini(input: {
  context: DashboardContext;
  question: string;
  conversation?: DashboardChatTurn[];
  latestOverview?: DashboardOverview | null;
}): Promise<string> {
  const conversation = (input.conversation ?? [])
    .slice(-10)
    .map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`)
    .join("\n");

  const prompt = `You are an educational dashboard health assistant.

Rules:
- Use only the context provided.
- Do not diagnose or prescribe medications.
- Keep answer concise and practical.
- If user asks "am I healthy", give balanced context: what looks okay and what to monitor.

${formatProfile(input.context.profile)}

${formatReport("Latest report", input.context.latestReport)}

${formatReport("Previous report", input.context.previousReport)}

${formatAnalysis(input.context.latestAnalysis)}

${formatCounts(input.context.latestStatusCounts)}

Latest generated overview:
${input.latestOverview ? `Status: ${input.latestOverview.overallStatus}
Headline: ${input.latestOverview.headline}
Overview: ${input.latestOverview.overview}
Attention: ${input.latestOverview.attention.join("; ") || "None"}
Suggestions: ${input.latestOverview.suggestions.join("; ") || "None"}` : "None"}

Conversation so far:
${conversation || "No prior conversation"}

User question:
${input.question}`;

  const { text } = await callGemini(prompt, false);
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
