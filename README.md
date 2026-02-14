# LabLens Frontend Skeleton

LabLens is a hackathon-ready frontend for bloodwork tracking with a deterministic analysis flow.

Important: outputs are educational only and not medical advice.

## Tech

- Next.js App Router + TypeScript
- Tailwind CSS
- Local persistence with `localStorage`
- Integrated analyze endpoint: `POST /api/analyze` (stubbed)

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To validate production build:

```bash
npm run build
```

## Routes

- `/` landing + intro + `Use Sample Data`
- `/dashboard` profile snapshot, recent reports, quick actions
- `/profile` editable profile form with validation
- `/new-report` report entry + analyze flow
- `/report/[id]` biomarker/derived results + summary panels
- `/history` full report list + trends table

## Local Data Keys

- `lablens.profile`
- `lablens.reports`
- `lablens.analysis.<reportId>`

## Analyze Flow

1. User creates report in `/new-report`
2. Report saves immediately to `localStorage`
3. Frontend calls `POST /api/analyze` with `{ profile, report }`
4. If API fails, frontend falls back to local deterministic analysis generator
5. Analysis saves to `lablens.analysis.<reportId>`
6. User is redirected to `/report/[id]`

## Backend Handoff Points

- API route: `app/api/analyze/route.ts`
  - Replace mock logic with real rules engine + model-generated explanations.
- Shared mock logic: `src/lib/analyze.ts`
  - Keep structure, swap internals for backend-provided result mapping if desired.
- Frontend caller: `app/new-report/page.tsx`
  - Current contract expects `AnalysisResult` JSON response body.

## Project Structure

- `app/*` routes and UI pages
- `app/api/analyze/route.ts` API stub
- `src/components/*` reusable UI building blocks
- `src/lib/types.ts` core domain and analysis types
- `src/lib/storage.ts` local persistence layer
- `src/lib/sampleData.ts` demo dataset seeding
- `src/lib/analyze.ts` deterministic mock analysis
