"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  heightCm?: string;
  weightKg?: string;
  lifestyleNotes?: string;
}

const defaultForm = {
  age: "",
  sexAtBirth: "other" as SexAtBirth,
  heightCm: "",
  weightKg: "",
  activityLevel: "moderate" as ActivityLevel,
  goals: "",
  lifestyleNotes: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [profileId, setProfileId] = useState<string>(makeId("profile"));

  useEffect(() => {
    const existing = loadProfile();
    if (!existing) return;
    setProfileId(existing.id);
    setForm({
      age: String(existing.age),
      sexAtBirth: existing.sexAtBirth,
      heightCm: String(existing.heightCm),
      weightKg: String(existing.weightKg),
      activityLevel: existing.activityLevel,
      goals: existing.goals || "",
      lifestyleNotes: existing.lifestyleNotes || "",
    });
  }, []);

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
    if (!Number.isFinite(heightCm) || heightCm <= 0 || heightCm > 250) {
      nextErrors.heightCm = "Enter height between 1 and 250 cm.";
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      nextErrors.weightKg = "Enter weight between 1 and 500 kg.";
    }
    if (form.lifestyleNotes.length > 400) nextErrors.lifestyleNotes = "Keep notes under 400 characters.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSave = () => {
    if (!validate()) return;
    const profile: UserProfile = {
      id: profileId,
      age: Number(form.age),
      sexAtBirth: form.sexAtBirth,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      activityLevel: form.activityLevel,
      goals: form.goals.trim() || undefined,
      lifestyleNotes: form.lifestyleNotes.trim() || undefined,
    };
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <Card subtitle="Stored locally in your browser.">
        <div className="mb-4 space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-[var(--ink)]">Profile completeness</p>
            <p className="text-[var(--muted)]">{completeCount}/5</p>
          </div>
          <ProgressBar value={completeCount} max={5} />
        </div>

        {saved ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 transition">
            Saved
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
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
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
              { label: "Other", value: "other" },
            ]}
            onChange={(e) => setForm((prev) => ({ ...prev, sexAtBirth: e.target.value as SexAtBirth }))}
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
            options={[
              { label: "Sedentary", value: "sedentary" },
              { label: "Light", value: "light" },
              { label: "Moderate", value: "moderate" },
              { label: "High", value: "high" },
            ]}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, activityLevel: e.target.value as ActivityLevel }))
            }
          />
          <Input
            label="Goals"
            value={form.goals}
            onChange={(e) => setForm((prev) => ({ ...prev, goals: e.target.value }))}
            placeholder="Example: improve LDL by next quarter"
          />
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-[var(--muted)]">Lifestyle Notes</span>
            <textarea
              value={form.lifestyleNotes}
              onChange={(e) => setForm((prev) => ({ ...prev, lifestyleNotes: e.target.value }))}
              maxLength={400}
              rows={4}
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] focus-visible:outline-none"
              placeholder="Sleep patterns, exercise notes, dietary context..."
            />
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{errors.lifestyleNotes ?? "Optional context"}</span>
              <span>{form.lifestyleNotes.length}/400</span>
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
      <p className="text-xs text-[var(--muted)]">Educational use only. Confirm interpretation with a clinician.</p>
    </div>
  );
}
