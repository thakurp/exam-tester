# Product Plans And Suggestions

## Executive Summary

The product should become a multi-exam practice platform with two complementary modes:

1. **Daily Practice**: short, fast, mostly MCQ-driven drills for regular use. This mode should help AV and future students build consistency, repair weak topics, and get immediate feedback.
2. **Real Practice Test**: realistic full-paper simulations generated or assembled from exam templates. This mode should reproduce the structure of the real test: sections, timing, instructions, question mix, marking rules, rubrics, and score reports.

The current app already has useful foundations for subjects, topics, MCQ questions, test sessions, admin question management, points, streaks, and AI explanations. The next product layer should not be AP Economics-specific. It should introduce reusable exam architecture so AP Economics, NSW Opportunity Class, NSW Selective, NSW school exams, SAT, and future subjects can share the same platform.

## Current App Reality

The current implementation is strongest as an MCQ practice app.

Important existing foundations:

- `Subject`, `Topic`, `Question`, `McqOption`, `TestSession`, and `UserAnswer` in `prisma/schema.prisma`.
- Admin question import, manual creation, publishing, and generation in `src/app/actions/admin.ts`.
- Student session lifecycle in `src/app/actions/test.ts`.
- MCQ test and review UI in `src/components/test/test-interface.tsx` and `src/components/test/review-screen.tsx`.
- Points and streak mechanics that are useful for Daily Practice.

Important limitations:

- The current upload flow is CSV/XLS/XLSX and MCQ-oriented.
- The current import schema expects fields such as `option_a`, `option_b`, `option_c`, `option_d`, and `correct_answer`.
- `QuestionType` has early hooks for non-MCQ work, but the app does not yet model real FRQ, multi-part questions, rubrics, uploaded work, drawn graphs, or paper sections.
- The current student flow is question-list based, not exam-template based.

## Sample Paper Corpus Finding

`Sample Test Papers/manifest.csv` currently represents the AP Economics source corpus:

- 292 PDFs total.
- 146 macroeconomics PDFs.
- 146 microeconomics PDFs.
- No 2020 folder/files in the downloaded corpus.
- The 2025 files include FRQ papers, individual question PDFs, scoring guidelines, scoring statistics, score distributions, and chief reader reports.

This corpus is not a direct MCQ import set. It is a source-document ecosystem for learning real-paper structure, FRQ design, scoring rubrics, topic coverage, and examiner expectations.

## Product Direction

The product should support both lightweight and high-fidelity practice.

### Daily Practice

Daily Practice should be optimized for frequent use:

- 5 to 20 question drills.
- MCQ-first, with optional short numeric or short-answer questions later.
- Adaptive selection from weak topics, recent mistakes, target exam, difficulty, and recency.
- Fast feedback, explanations, and topic mastery updates.
- Points, streaks, and low-friction mobile use.

### Real Practice Test

Real Practice Test should simulate a real exam paper:

- Exam program, subject, year level, and test type selection.
- Template-driven sections, timings, instructions, marks, and navigation rules.
- Mixed question types: MCQ, numeric, short answer, FRQ, essay, graph, and uploaded work where needed.
- Scoring rules that match the exam family.
- Post-test report by section, topic, skill, timing, and rubric criteria.

## Target Exam Families

The architecture should explicitly support:

- AP Economics now, including MCQ and FRQ-style papers.
- NSW Opportunity Class.
- NSW Selective.
- NSW school exams.
- SAT.
- Future subjects and school-specific papers.

The system should learn from uploaded sample papers for each exam family, then generate original practice content and full papers that match the structure without copying official wording.

## Architecture Decisions

1. Keep Daily Practice and Real Practice Test as separate product modes.
2. Keep MCQ practice as a first-class experience; do not replace it with FRQ-only work.
3. Introduce exam templates before adding more exam-specific UI.
4. Treat sample papers as source documents and blueprint inputs, not direct public content to copy.
5. Put every generated paper through quality gates and human approval before student release.
6. Add constructed-response grading gradually: start with rubrics and review workflows before fully automated AI scoring.
7. Store production source PDFs outside Git, using object storage and database metadata.
8. Keep generated content traceable to source blueprints, models, prompts, and approval status.

## Recommended Documentation Set

The detailed plans live in:

- `docs/product/multi-exam-platform-plan.md`
- `docs/product/data-model-architecture.md`
- `docs/product/sample-paper-learning-pipeline.md`
- `docs/product/frq-and-constructed-response-plan.md`
- `docs/product/generated-paper-strategy.md`
- `docs/product/agent-implementation-checklist.md`

## Roadmap

### Phase 1: Planning And Architecture

Create the planning docs, agree on domain vocabulary, and avoid hardcoding AP-only assumptions into the next schema pass.

### Phase 2: Data Model Foundation

Add exam programs, exam specifications, exam templates, paper sections, source documents, paper blueprints, generated papers, question parts, rubrics, and richer attempts.

### Phase 3: Daily Practice Upgrade

Keep the current MCQ flow working, but make question selection aware of exam program, subject, skill, difficulty, history, and mastery.

### Phase 4: AP Economics Pilot

Use the existing AP Economics corpus to digitize a small 2025 pilot: Macro Set 1 and Micro Set 1 first. Build FRQ/rubric support around this real corpus.

### Phase 5: Real Practice Test MVP

Build a template-driven full-paper attempt UI with sections, timers, review, and score report.

### Phase 6: Sample Paper Learning Pipeline

Allow admins to upload/register papers for AP, NSW, SAT, and school exams. Extract, classify, structure, review, and approve content and blueprints.

### Phase 7: New Exam Families

Add NSW Opportunity Class, NSW Selective, SAT, and school-exam templates using the same engine.

### Phase 8: Calibrated AI Scoring

Add AI-assisted scoring only after rubric models and reviewed student responses exist. Use human-reviewed examples to calibrate feedback quality.

## Guardrails

- Do not bulk-import official papers as public generated content.
- Do not copy official question wording into generated papers.
- Use source papers to learn structure, topic distribution, marking style, and rubric expectations.
- Keep official/source documents private or permissioned unless usage rights are clear.
- Require approval workflow for generated papers before students use them.

## Success Criteria

The product is succeeding when AV can:

- Do quick Daily Practice most days.
- Take a weekly Real Practice Test under realistic timing.
- See exactly which topics, skills, and rubric criteria were weak.
- Receive daily drills that target those weaknesses.
- Retake equivalent but different generated papers until performance improves.
