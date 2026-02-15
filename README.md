# LabLens

LabLens is a Next.js app for educational bloodwork tracking. It lets users save profile context, upload or enter biomarker values, generate analysis summaries, and review trends over time.

Important: this app is for educational use only and is not medical advice.

## What The App Currently Does

- Stores all user data in browser `localStorage` (no database).
- Supports profile capture: age, sex at birth, height, weight, activity, goals, lifestyle notes.
- Supports report creation with:
  - Report date
  - Optional notes
  - Biomarker rows (manual or file-extracted)
- Supports report file extraction from:
  - Images
  - PDFs
  - Text-like files (`.txt`, `.csv`, `.tsv`, `.json`, `.xml`)
- Runs analysis through `POST /api/analyze`:
  - Always builds deterministic biomarker analysis first.
  - Attempts Gemini-generated narrative summary/next steps/questions.
  - Falls back to deterministic narrative if Gemini fails.
- Renders detailed report results:
  - Biomarker statuses
  - Derived metrics (TC/HDL ratio, non-HDL, estimated average glucose)
  - Summary text, next steps, clinician questions
  - Change vs previous report
- Provides dashboard and history views for quick review.
- Includes a demo mode that seeds sample profile/report data and a demo visual state.

## Stack

- Next.js 16 (App Router, TypeScript)
- React 19
- Tailwind CSS 4
- Google Cloud Vision (`@google-cloud/vision`) for OCR on images/PDFs
- Gemini API via REST `fetch` from server route (`/api/analyze`)

## Routes

- `/`: Landing page and start action.
- `/dashboard`: At-a-glance stats, profile completeness, recent reports, small trend preview.
- `/profile`: Editable profile form with validation and local save.
- `/new-report`: Upload/parse file, add/edit biomarker rows, run analysis.
- `/report/[id]`: Full report details and analysis output.
- `/history`: All saved reports with status badges and quick navigation.
- `/api/analyze`: Server route that merges deterministic analysis + Gemini insights.
- `/api/extract-report`: Server route that extracts text and parses biomarker rows.

## Data Model Overview

Core entities are defined in `src/lib/types.ts`.

- `UserProfile`: demographic + lifestyle context.
- `LabReport`: report metadata, core biomarkers, optional additional biomarker rows, notes.
- `AnalysisResult`: status counts, biomarker interpretations, derived metrics, summary text, next steps, doctor questions.

## Local Storage Keys

- `lablens.profile`
- `lablens.reports`
- `lablens.analysis.<reportId>`
- `lablens.demoMode`
- `lablens.demoVisualEnabled`

## Analysis Flow

1. User creates/saves a report in `/new-report`.
2. Report is saved locally.
3. App posts `{ profile, report }` to `POST /api/analyze`.
4. API computes deterministic analysis (`src/lib/analyze.ts`).
5. API tries Gemini for narrative output (`src/lib/gemini.ts`).
6. If Gemini fails, deterministic output is returned.
7. Analysis is saved locally and user is routed to `/report/[id]`.

## Report Extraction Flow

1. User uploads a report file in `/new-report`.
2. Frontend posts file to `POST /api/extract-report`.
3. API:
  - Detects file type.
  - Uses Vision OCR for image/PDF.
  - Uses UTF-8 decode for text-like files.
  - Parses rows into structured biomarkers (`src/lib/reportExtraction.ts`).
4. Parsed rows are loaded into the form for review/edit.
5. User can remove/add/edit rows before analysis.

## Environment Variables

Use `.env.local` for configuration.

### Gemini (optional but recommended)

- `GOOGLE_GEMINI_API_KEY` or `GEMINI_API_KEY`
- Optional: `GOOGLE_GEMINI_MODEL`

If Gemini is not configured or fails, analysis still works with deterministic fallback text.

### Vision OCR (required for image/PDF extraction)

- `GOOGLE_APPLICATION_CREDENTIALS` or `GCLOUD_VISION_KEY_FILE`

If Vision credentials are missing, image/PDF extraction fails with a friendly error. Text file extraction still works.

## Run Locally

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

### Quality Checks

```bash
npm.cmd run lint
npm.cmd run build
```

## Project Structure

- `app/*`: pages and API routes
- `app/api/analyze/route.ts`: analysis API orchestration
- `app/api/extract-report/route.ts`: file ingestion + OCR + parsing
- `src/components/*`: UI components
- `src/lib/types.ts`: shared domain types
- `src/lib/storage.ts`: local persistence utilities
- `src/lib/analyze.ts`: deterministic biomarker + derived metric logic
- `src/lib/gemini.ts`: Gemini REST request/response handling
- `src/lib/reportExtraction.ts`: report text parser
- `src/lib/sampleData.ts`: demo-mode dataset seeding

## Notes For Handoff

- Current persistence is client-only. A backend would replace `src/lib/storage.ts` flows and local report/analysis reads.
- `POST /api/analyze` already has a stable request/response shape and is the clean handoff point for a future rules engine or clinical backend.
- `POST /api/extract-report` is modular and can be swapped to a different OCR provider if needed.
