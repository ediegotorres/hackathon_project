"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { Input } from "@/src/components/Input";
import { ProgressBar } from "@/src/components/ProgressBar";
import { Select } from "@/src/components/Select";
import { loadProfile, saveProfile } from "@/src/lib/storage";
import type { ActivityLevel, SexAtBirth, UserProfile } from "@/src/lib/types";
import { makeId } from "@/src/lib/utils";

interface Errors {
  age?: string;
  sexAtBirth?: string;
  heightCm?: string;
  weightKg?: string;
  activityLevel?: string;
  lifestyleNotes?: string;
}

interface ProfileFormState {
  name: string;
  age: string;
  sexAtBirth: SexAtBirth | "";
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | "";
  goals: string;
  lifestyleNotes: string;
}

const defaultForm = {
  name: "",
  age: "",
  sexAtBirth: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  goals: "",
  lifestyleNotes: "",
} satisfies ProfileFormState;

function getInitialProfileState() {
  const existing = loadProfile();
  if (!existing) {
    return {
      profileId: makeId("profile"),
      form: defaultForm,
    };
  }

  return {
    profileId: existing.id,
    form: {
      name: existing.name || "",
      age: String(existing.age),
      sexAtBirth: existing.sexAtBirth,
      heightCm: String(existing.heightCm),
      weightKg: String(existing.weightKg),
      activityLevel: existing.activityLevel,
      goals: existing.goals || "",
      lifestyleNotes: existing.lifestyleNotes || "",
    } satisfies ProfileFormState,
  };
}

export default function ProfilePage() {
  const [initial] = useState(getInitialProfileState);
  const [form, setForm] = useState<ProfileFormState>(initial.form);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [profileId] = useState<string>(initial.profileId);

  const completeCount = [
    Number(form.age) > 0,
    Boolean(form.sexAtBirth),
    Number(form.heightCm) > 0,
    Number(form.weightKg) > 0,
    Boolean(form.activityLevel),
  ].filter(Boolean).length;

  const validate = () => {
    const nextErrors: Errors = {};
    const age = Number(form.age);
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);

    if (!Number.isFinite(age) || age <= 0 || age > 120) nextErrors.age = "Enter an age between 1 and 120.";
    if (!form.sexAtBirth) nextErrors.sexAtBirth = "Select sex at birth.";
    if (!Number.isFinite(heightCm) || heightCm <= 0 || heightCm > 250) {
      nextErrors.heightCm = "Enter height between 1 and 250 cm.";
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      nextErrors.weightKg = "Enter weight between 1 and 500 kg.";
    }
    if (!form.activityLevel) nextErrors.activityLevel = "Select activity level.";
    if (form.lifestyleNotes.length > 400) nextErrors.lifestyleNotes = "Keep notes under 400 characters.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSave = () => {
    if (!validate()) return;
    const profile: UserProfile = {
      id: profileId,
      name: form.name.trim() || undefined,
      age: Number(form.age),
      sexAtBirth: form.sexAtBirth as SexAtBirth,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      activityLevel: form.activityLevel as ActivityLevel,
      goals: form.goals.trim() || undefined,
      lifestyleNotes: form.lifestyleNotes.trim() || undefined,
    };
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <Card subtitle="Stored locally in your browser.">
        <div className="mb-4 space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-[var(--ink)]">Profile completeness</p>
            <p className="text-[var(--ink-soft)]">{completeCount}/5</p>
          </div>
          <ProgressBar value={completeCount} max={5} />
        </div>

        {saved ? (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none">
            Saved
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Enter name"
          />
          <Input
            label="Age"
            type="number"
            min={1}
            max={120}
            value={form.age}
            error={errors.age}
            helperText="Years"
            onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
          />
          <Select
            label="Sex at Birth"
            value={form.sexAtBirth}
            error={errors.sexAtBirth}
            options={[
              { label: "Select sex at birth", value: "" },
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Other", value: "other" },
            ]}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sexAtBirth: e.target.value as SexAtBirth | "" }))
            }
          />
          <Input
            label="Height (cm)"
            type="number"
            min={1}
            max={250}
            value={form.heightCm}
            error={errors.heightCm}
            helperText="Typical range: 80-220 cm"
            onChange={(e) => setForm((prev) => ({ ...prev, heightCm: e.target.value }))}
          />
          <Input
            label="Weight (kg)"
            type="number"
            min={1}
            max={500}
            value={form.weightKg}
            error={errors.weightKg}
            helperText="Typical range: 20-250 kg"
            onChange={(e) => setForm((prev) => ({ ...prev, weightKg: e.target.value }))}
          />
          <Select
            label="Activity Level"
            value={form.activityLevel}
            error={errors.activityLevel}
            options={[
              { label: "Select activity level", value: "" },
              { label: "Sedentary", value: "sedentary" },
              { label: "Light", value: "light" },
              { label: "Moderate", value: "moderate" },
              { label: "High", value: "high" },
            ]}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, activityLevel: e.target.value as ActivityLevel | "" }))
            }
          />
          <Input
            label="Goals"
            value={form.goals}
            onChange={(e) => setForm((prev) => ({ ...prev, goals: e.target.value }))}
            placeholder="Example: improve LDL by next quarter"
          />
          <label htmlFor="lifestyle-notes" className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-[var(--ink-soft)]">Lifestyle Notes</span>
            <textarea
              id="lifestyle-notes"
              value={form.lifestyleNotes}
              onChange={(e) => setForm((prev) => ({ ...prev, lifestyleNotes: e.target.value }))}
              maxLength={400}
              rows={4}
              aria-invalid={Boolean(errors.lifestyleNotes)}
              aria-describedby="lifestyle-notes-meta"
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              placeholder="Sleep patterns, exercise notes, dietary context..."
            />
            <div id="lifestyle-notes-meta" className="flex items-center justify-between text-xs">
              <span className={errors.lifestyleNotes ? "font-medium text-[var(--danger)]" : "text-[var(--ink-soft)]"}>
                {errors.lifestyleNotes ?? "Optional context"}
              </span>
              <span className="text-[var(--ink-soft)]">{form.lifestyleNotes.length}/400</span>
            </div>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={onSave}>Save</Button>
          {saved ? (
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          ) : null}
        </div>
      </Card>
      <p className="text-xs text-[var(--ink-soft)]">Educational use only. Confirm interpretation with a clinician.</p>
    </div>
  );
}
