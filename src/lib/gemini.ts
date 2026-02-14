import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LabReport, UserProfile } from "@/src/lib/types";

const defaultModels = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;

function getApiKey() {
  return process.env.GOOGLE_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

function getModelCandidates() {
  const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
  const models = configuredModel ? [configuredModel, ...defaultModels] : [...defaultModels];
  return [...new Set(models)];
}

const biomarkerDescriptions = {
  totalChol: {
    label: "Total Cholesterol",
    unit: "mg/dL",
    normalRange: "< 200",
    borderlineRange: "200-239",
    highRange: ">= 240",
  },
  ldl: {
    label: "LDL (Bad Cholesterol)",
    unit: "mg/dL",
    normalRange: "< 130",
    borderlineRange: "130-159",
    highRange: ">= 160",
  },
  hdl: {
    label: "HDL (Good Cholesterol)",
    unit: "mg/dL",
    normalRange: ">= 50",
    borderlineRange: "40-49",
    highRange: "< 40",
  },
  triglycerides: {
    label: "Triglycerides",
    unit: "mg/dL",
    normalRange: "< 150",
    borderlineRange: "150-199",
    highRange: ">= 200",
  },
  glucose: {
    label: "Fasting Glucose",
    unit: "mg/dL",
    normalRange: "< 100",
    borderlineRange: "100-125",
    highRange: ">= 126",
  },
  a1c: {
    label: "Hemoglobin A1c",
    unit: "%",
    normalRange: "< 5.7",
    borderlineRange: "5.7-6.4",
    highRange: ">= 6.5",
  },
};

interface GeminiAnalysisRequest {
  report: LabReport;
  profile?: UserProfile | null;
}

export interface GeminiAnalysisResponse {
  summaryText: string;
  nextSteps: string[];
  doctorQuestions: string[];
}

export async function analyzeWithGemini(data: GeminiAnalysisRequest): Promise<GeminiAnalysisResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = getModelCandidates();

  // Build biomarkers context from main biomarkers
  const biomarkersContext: string[] = [];

  Object.entries(data.report.biomarkers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const desc = biomarkerDescriptions[key as keyof typeof biomarkerDescriptions];
      if (desc) {
        biomarkersContext.push(`${desc.label}: ${value} ${desc.unit}`);
      }
    }
  });

  // Add any additional biomarkers from extraction
  if (data.report.additionalBiomarkers && Array.isArray(data.report.additionalBiomarkers)) {
    data.report.additionalBiomarkers.forEach((bm) => {
      biomarkersContext.push(`${bm.name}: ${bm.value}${bm.unit ? " " + bm.unit : ""}`);
    });
  }

  const biomarkersText = biomarkersContext.join("\n");

  const profileText = data.profile
    ? `
Patient Profile:
- Age: ${data.profile.age} years
- Sex at Birth: ${data.profile.sexAtBirth}
- Height: ${data.profile.heightCm} cm
- Weight: ${data.profile.weightKg} kg
- Activity Level: ${data.profile.activityLevel}
${data.profile.goals ? `- Health Goals: ${data.profile.goals}` : ""}
${data.profile.lifestyleNotes ? `- Lifestyle Notes: ${data.profile.lifestyleNotes}` : ""}
`
    : "";

  const prompt = `You are a clinical AI assistant analyzing blood work results. Provide clear, evidence-based insights.

Blood Markers (from ${data.report.dateISO}):
${biomarkersText}
${profileText}
Report Notes: ${data.report.notes || "None provided"}

Based on these blood markers and the patient profile, please provide:

1. A 2-3 sentence comprehensive health summary that explains what these blood markers indicate about their overall health status and any notable patterns.

2. 2-3 specific, actionable next steps the patient should consider (lifestyle changes, additional testing, follow-up timing, etc.).

3. 2-3 important questions they should discuss with their doctor about their results.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "summaryText": "comprehensive 2-3 sentence summary",
  "nextSteps": ["step 1", "step 2", "step 3"],
  "doctorQuestions": ["question 1", "question 2", "question 3"]
}`;

  let lastError: unknown;
  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse Gemini response JSON");
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      if (
        !parsedResponse.summaryText ||
        !Array.isArray(parsedResponse.nextSteps) ||
        !Array.isArray(parsedResponse.doctorQuestions)
      ) {
        throw new Error("Invalid response structure from Gemini");
      }

      return {
        summaryText: parsedResponse.summaryText,
        nextSteps: parsedResponse.nextSteps.filter((s: unknown) => typeof s === "string"),
        doctorQuestions: parsedResponse.doctorQuestions.filter((q: unknown) => typeof q === "string"),
      };
    } catch (error) {
      lastError = error;
      console.warn(`Gemini call failed for model "${modelName}", trying next fallback.`);
    }
  }

  throw lastError ?? new Error("Gemini analysis failed for all configured models");
}
