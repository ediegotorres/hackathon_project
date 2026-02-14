export type SexAtBirth = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";
export type Status = "normal" | "borderline" | "high";

export interface UserProfile {
  id: string;
  age: number;
  sexAtBirth: SexAtBirth;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goals?: string;
  lifestyleNotes?: string;
}

export interface Biomarkers {
  totalChol?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  glucose?: number;
  a1c?: number;
}

export interface LabReport {
  id: string;
  dateISO: string;
  biomarkers: Biomarkers;
  notes?: string;
  createdAtISO: string;
}

export interface AnalysisResult {
  overall: {
    highCount: number;
    borderlineCount: number;
    normalCount: number;
  };
  biomarkers: Array<{
    key: string;
    label: string;
    value: number;
    unit: string;
    status: Status;
    rangeText: string;
    meaning?: string;
    contributors?: string[];
    questions?: string[];
  }>;
  derived: Array<{
    key: string;
    label: string;
    value: number;
    unit?: string;
    status?: Status;
  }>;
  summaryText: string;
  nextSteps: string[];
  doctorQuestions: string[];
}
