# Copilot Project Memory — exam-tester
# Last updated: 2026-04-25
#
# This file is the portable equivalent of Copilot's machine-local memory.
# When picking up this project on a new machine, paste this into Copilot Chat:
#   "Read .copilot/memory.md and use it as your working context."

---

## Stack

- Next.js (non-standard newer version — read `node_modules/next/dist/docs/` before making app changes)
- Prisma 7.7.0, `@prisma/adapter-pg`, PostgreSQL on Neon (serverless)
- Clerk auth — `auth()`, `currentUser()`, `getOrCreateDbUser()` in `src/lib/auth.ts`
- OpenRouter for AI (`src/lib/openrouter.ts`), Redis/BullMQ queues (`src/lib/queues.ts`)
- TypeScript strict, React 19.2.4, Tailwind + shadcn/ui

---

## Key Commands (Windows / PowerShell)

```powershell
# Prisma operations
node node_modules\prisma\build\index.js validate
node node_modules\prisma\build\index.js generate
node node_modules\prisma\build\index.js migrate dev --name <name>
node node_modules\prisma\build\index.js db seed

# Seed script
node node_modules\tsx\dist\cli.mjs prisma\seed.ts

# Type check
node node_modules\typescript\bin\tsc --noEmit

# Fix _prisma_migrations checksums when stub files are created
node scripts\fix-migration-checksums.mjs

# Fix esbuild when node_modules copied from another platform
npm install @esbuild/win32-x64 --no-save
```

---

## Auth Rule

**All server actions must derive the user server-side:**
```ts
const user = await getOrCreateDbUser(); // from src/lib/auth.ts
```
Never accept `userId` from client props or form data.

---

## Implementation Progress (2026-04-25)

### ✅ Phase 1 — Security Fixes

- `src/app/actions/test.ts`: `createTestSession`, `submitAnswer`, `completeTestSession` all call `getOrCreateDbUser()` internally.
- `submitAnswer` validates `questionId ∈ session.config.questionIds` and is idempotent (no duplicate points).
- Callers cleaned up: `test-interface.tsx`, `test-config-form.tsx`, `test/new/page.tsx`, `test/[sessionId]/take/page.tsx`.

### ✅ Phase 2 — Prisma Schema Migration

Migration name: `20260425074109_add_exam_architecture`

**QuestionType enum extended:**
`MCQ, SHORT_ANSWER, TRUE_FALSE, NUMERIC, FRQ_STRUCTURED, ESSAY, GRAPH_OR_DRAWING`

**New enums:**
`SourceDocumentType, SourceDocumentStatus, BlueprintStatus, GeneratedPaperStatus,
QuestionPartResponseType, PaperAttemptMode, PaperAttemptStatus, ScorerType`

**New models (15):**
`ExamProgram, ExamSpecification, ExamTemplate, PaperSection,
SourceDocument, PaperBlueprint, GeneratedPaper, GeneratedPaperQuestion,
QuestionPart, RubricCriterion, PaperAttempt, AttemptSectionProgress,
StudentResponse, ResponseArtifact, ResponseScore`

**Question new fields:**
`estimatedSeconds Int?, sourceDocumentId String?, examProgramCode String?,
diagramType String @default("NONE"), diagramStatus String @default("NONE"),
diagramSvg String?, diagramHint String?, diagramAttempts Int @default(0)`

**Subject new field:** `state String?`
**Topic new field:** `canonicalImageUrl String?`

**Stub migration files created** (for pre-existing DB-only migrations):
- `prisma/migrations/20260422085815_add_subject_state/`
- `prisma/migrations/20260422101651_add_diagram_svg/`
- `prisma/migrations/20260422120358_add_diagram_classification/`

If checksums mismatch after a `git pull`, run: `node scripts\fix-migration-checksums.mjs`

### ✅ Phase 3 — Seed Data

`prisma/seed.ts` seeds:
- 10 Subjects with topics
- 5 ExamPrograms: `AP`, `NSW_OC`, `NSW_SELECTIVE`, `NSW_SCHOOL`, `SAT`
- 12 ExamSpecifications (AP_MACRO, AP_MICRO, NSW_OC_READING, NSW_OC_MATHS, NSW_SEL_READING, NSW_SEL_MATHS, NSW_SEL_THINKING, NSW_SEL_WRITING, NSW_HSC_MATHS_ADV, NSW_HSC_ECON, SAT_MATH, SAT_RW)

### ✅ Phase 4 — Source Document Registry

Files created:
- `src/app/actions/source-documents.ts` — `registerSourceDocument`, `bulkRegisterFromManifest`, `updateSourceDocumentStatus`
- `src/app/api/admin/source-documents/import-manifest/route.ts` — POST: reads `Sample Test Papers/manifest.csv`, bulk registers 292 AP PDFs with SHA-256 deduplication
- `src/app/admin/source-documents/page.tsx` — paginated list with program/status filters
- `src/components/admin/source-documents-client.tsx` — table UI with "Import AP manifest" button
- `scripts/fix-migration-checksums.mjs` — one-off DB checksum repair utility

Admin sidebar and dashboard updated.
TypeScript: 0 errors.

---

## Next Steps (in order)

1. **Register the 292 PDFs** — open app, go to `/admin/source-documents`, click "Import AP manifest"
2. **AP 2025 FRQ pilot** — digitize Macro 2025 Set 1 + Micro 2025 Set 1 (Q1/Q2/Q3 each), create `QuestionPart` + `RubricCriterion` rows from scoring guidelines
3. **ExamTemplate rows** — AP Macro/Micro 2025-style templates: Section I (60 MCQ, 70 min) + Section II (3 FRQ, 60 min)
4. **PaperBlueprint** — one approved blueprint per subject
5. **Real Practice Test UI** — `PaperAttempt` lifecycle, section timing, FRQ response input, rubric self-review

---

## Source Documents Corpus

- 292 AP Economics PDFs in `Sample Test Papers/` (excluded from Git via `.gitignore`)
- `Sample Test Papers/manifest.csv` — columns: Subject, Year, File, SizeBytes
- Subjects: macroeconomics (146), microeconomics (146)
- Years: 1999–2025 (no 2020)
- 2025 includes: FRQ paper set 1 & 2, individual Q1/Q2/Q3 PDFs, scoring guidelines, scoring statistics, score distributions, chief reader reports

---

## Admin Routes

| Path | Purpose |
|------|---------|
| `/admin` | Dashboard with stats |
| `/admin/questions` | MCQ CRUD, publish/draft |
| `/admin/subjects` | Subject & topic management |
| `/admin/source-documents` | Source document registry |
| `/admin/upload` | CSV/Excel MCQ bulk import |
| `/admin/generate` | AI question generation |

---

## Product Vision

**Two modes:**
1. **Daily Practice** — short adaptive MCQ drills, spaced repetition, instant feedback, points/streaks
2. **Real Practice Test** — full template-driven paper simulation: sections, timing, FRQ, rubrics, score report

**Target exams:** AP Economics (pilot), NSW Opportunity Class, NSW Selective High School, NSW School Exams (HSC/Trials), SAT

**Key architecture principle:** Blueprints drive generation. Official PDFs → structure extraction → `PaperBlueprint` → original generated papers. Never copy official question text into student-facing content.

---

## Important Patterns

```ts
// Server action pattern
"use server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function myAction() {
  try { await requireAdmin(); } catch { return { error: "Unauthorized" }; }
  // ... do work ...
  revalidatePath("/admin/...");
}
```

```ts
// Student action pattern — always derive user server-side
import { getOrCreateDbUser } from "@/lib/auth";
const user = await getOrCreateDbUser();
```

```ts
// Admin layout guard
import { requireAdmin } from "@/lib/auth";
const user = await requireAdmin().catch(() => null);
if (!user) redirect("/dashboard");
```
