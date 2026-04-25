# Agent Implementation Checklist

## Purpose

This checklist is for future AI agents implementing the multi-exam practice platform. Use it to keep work incremental and aligned with product architecture.

## Read First

Before making architecture or codebase changes:

1. Read `graphify-out/GRAPH_REPORT.md` if it exists.
2. Read `AGENTS.md` because this project uses newer Next.js conventions.
3. For Next.js implementation work, inspect relevant docs under `node_modules/next/dist/docs/` before changing app code.
4. Read these product docs:
   - `PRODUCT_PLANS_AND_SUGGESTIONS.md`
   - `docs/product/multi-exam-platform-plan.md`
   - `docs/product/data-model-architecture.md`
   - `docs/product/sample-paper-learning-pipeline.md`
   - `docs/product/frq-and-constructed-response-plan.md`
   - `docs/product/generated-paper-strategy.md`

## Current Code Anchors

Start with these files:

- `prisma/schema.prisma`: current models for users, subjects, topics, questions, MCQ options, sessions, and answers.
- `src/app/actions/admin.ts`: current admin import, CRUD, and generation flow.
- `src/app/actions/test.ts`: current test session lifecycle.
- `src/components/test/test-interface.tsx`: current MCQ attempt UI.
- `src/components/test/review-screen.tsx`: current MCQ review UI.
- `Sample Test Papers/manifest.csv`: current AP Economics source inventory.

## Implementation Order

### 1. Stabilize Current Test Security And Correctness ✅ COMPLETE

Before broadening the platform, fix the current test lifecycle risks:

- ✅ Derive the current user on the server instead of accepting client-supplied user IDs.
- ✅ Validate that submitted question IDs belong to the active attempt.
- ✅ Make points and score updates idempotent.
- ✅ Keep MCQ behavior unchanged for users.

Files changed: `src/app/actions/test.ts`, `src/components/test/test-interface.tsx`,
`src/components/test/test-config-form.tsx`, `src/app/(dashboard)/test/new/page.tsx`,
`src/app/(dashboard)/test/[sessionId]/take/page.tsx`.

### 2. Add Exam Architecture Models ✅ COMPLETE

Migration `20260425074109_add_exam_architecture` applied to Neon PostgreSQL.

Added enums: `SourceDocumentType`, `SourceDocumentStatus`, `BlueprintStatus`,
`GeneratedPaperStatus`, `QuestionPartResponseType`, `PaperAttemptMode`,
`PaperAttemptStatus`, `ScorerType`.

Extended `QuestionType` with: `NUMERIC`, `FRQ_STRUCTURED`, `ESSAY`, `GRAPH_OR_DRAWING`.

Added models: `ExamProgram`, `ExamSpecification`, `ExamTemplate`, `PaperSection`,
`SourceDocument`, `PaperBlueprint`, `GeneratedPaper`, `GeneratedPaperQuestion`,
`QuestionPart`, `RubricCriterion`, `PaperAttempt`, `AttemptSectionProgress`,
`StudentResponse`, `ResponseArtifact`, `ResponseScore`.

Extended `Question` with: `estimatedSeconds`, `sourceDocumentId`, `examProgramCode`,
`diagramType`, `diagramStatus`, `diagramSvg`, `diagramHint`, `diagramAttempts`.

Also added 3 stub migration files for pre-existing DB migrations that were missing locally:
- `20260422085815_add_subject_state` — `Subject.state`
- `20260422101651_add_diagram_svg` — `Question` diagram fields
- `20260422120358_add_diagram_classification` — `Topic.canonicalImageUrl`

Helper script `scripts/fix-migration-checksums.mjs` created to re-sync `_prisma_migrations`
checksums when stub files are added.

New models to add:

- `ExamProgram`.
- `ExamSpecification`.
- `ExamTemplate`.
- `PaperSection`.
- `SourceDocument`.
- `PaperBlueprint`.
- `GeneratedPaper`.

Acceptance criteria:

- AP Economics can be represented without hardcoding AP-only behavior.
- NSW OC, NSW Selective, SAT, and school exams can be represented as data.
- Templates can define sections, timing, marks, and question type rules.

### 3. Preserve Daily Practice

Do not break the current MCQ loop.

Tasks:

- Keep current `Question` and `McqOption` functionality.
- Add exam/template metadata without making existing MCQs unusable.
- Add adaptive selection later, after metadata exists.

Acceptance criteria:

- AV can still take daily MCQ practice.
- Existing admin MCQ creation and import still work.

### 4. Add Source Document Registry

Tasks:

- Register files from `Sample Test Papers/manifest.csv`.
- Store document type, year, subject, hash, path, and extraction state.
- Detect duplicate files by hash.
- Keep production storage object-store ready.

Acceptance criteria:

- Each AP Economics PDF can be represented as a source record.
- Duplicate 2025 score-distribution files are identifiable.
- Source documents are not automatically published as student content.

### 5. Add Constructed Response Foundation

Tasks:

- Add question parts.
- Add rubric criteria.
- Add response artifacts.
- Add criterion-level scoring records.

Acceptance criteria:

- A multi-part AP-style FRQ can be modeled.
- Each part can have marks and rubric criteria.
- Student responses can include text and uploaded work.

### 6. Build AP Economics 2025 Pilot

Tasks:

- Digitize Macro 2025 Set 1 and Micro 2025 Set 1 first.
- Structure Q1, Q2, and Q3 for both subjects.
- Add scoring guidelines as rubrics.
- Human-review the structured content.
- Create one approved AP Economics 2025-style blueprint.

Acceptance criteria:

- Six FRQs are represented with parts and rubrics.
- A Real Practice Test can assemble an AP Economics style paper from approved content.
- Generated practice papers are drafts until reviewed.

### 7. Build Real Practice Test UI

Tasks:

- Let users choose exam program, subject, and paper type.
- Render paper sections with timing and instructions.
- Support MCQ and constructed response sections.
- Track progress and unanswered questions.
- Submit and review by section.

Acceptance criteria:

- Daily Practice remains fast.
- Real Practice Test feels like a separate high-fidelity mode.
- Review shows section score and topic breakdown.

### 8. Add Generation Quality Gates

Tasks:

- Generate from `PaperBlueprint`, not directly from source text.
- Check similarity to source documents.
- Check mark totals.
- Check rubric coverage.
- Check duplicate content.
- Keep generated content in draft until approved.

Acceptance criteria:

- Generated papers are original and auditable.
- Admins can see why a generated paper passed or failed quality gates.
- Students only see approved generated papers.

### 9. Expand Exam Families

After AP pilot succeeds:

- Add NSW OC templates.
- Add NSW Selective templates.
- Add SAT templates.
- Add configurable school exam templates.

Acceptance criteria:

- New exam families are added mostly through data and templates.
- Sample papers for each family can flow through the same source-document pipeline.

## Do Not Do Yet

- Do not rewrite the entire app before preserving the current MCQ path.
- Do not publish copied official questions as generated student content.
- Do not launch fully automated AI grading before rubric scoring and reviewed examples exist.
- Do not hardcode AP Economics assumptions into shared exam models.
- Do not store production PDFs in Git.

## Verification Commands

Use the repo's actual scripts from `package.json`. If adding code, run the relevant checks, typically:

- `npm run lint` if available.
- `npm run build` if available and dependencies/environment support it.
- Prisma validation/generation commands if schema changes are made.

For documentation-only changes, manually verify:

- All planned Markdown files exist.
- Links and paths are accurate.
- The docs mention both Daily Practice and Real Practice Test.
- The docs mention AP Economics, NSW OC, NSW Selective, NSW school exams, and SAT.
- The docs include architecture decisions and guardrails.

## Handoff Summary Template

When an agent finishes a phase, report:

- Files changed.
- Architecture decisions made.
- Behavior preserved.
- Tests or checks run.
- Known risks or next steps.
