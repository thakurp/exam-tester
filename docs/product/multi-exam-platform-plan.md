# Multi-Exam Platform Plan

## Purpose

This document defines the target architecture for supporting Daily Practice and Real Practice Test modes across AP Economics, NSW Opportunity Class, NSW Selective, NSW school exams, SAT, and future subjects.

## Product Modes

### Daily Practice

Daily Practice is the short-session habit loop. It should be fast enough for everyday use and mostly MCQ-driven at first.

Capabilities:

- Small practice sets.
- Topic and skill targeting.
- Adaptive selection from mistakes, weak topics, due-for-review topics, and exam goals.
- Immediate feedback for auto-gradable questions.
- Explanations and short remediation.
- Points, streaks, and mastery tracking.

Daily Practice should reuse the current MCQ strengths of the app while making selection smarter.

### Real Practice Test

Real Practice Test is a high-fidelity simulation. It should feel like sitting the real paper.

Capabilities:

- Select exam family, subject, grade/year level, and paper type.
- Use an approved exam template or generated paper blueprint.
- Render ordered sections with time limits and instructions.
- Support mixed question types.
- Track timing by section and question.
- Produce official-style reporting and targeted follow-up drills.

## Core Domain Vocabulary

### ExamProgram

Represents a broad exam family.

Examples:

- `AP`
- `NSW_OPPORTUNITY_CLASS`
- `NSW_SELECTIVE`
- `NSW_SCHOOL_EXAM`
- `SAT`

### ExamSpecification

Defines stable rules for an exam type.

Examples:

- AP Macroeconomics.
- AP Microeconomics.
- NSW Selective placement test.
- SAT Digital Math.
- Year 7 school mathematics term exam.

Fields to consider:

- Program.
- Subject or domain.
- Grade/year level.
- Exam board or authority.
- Supported question types.
- Scoring model.
- Default timing.
- Reporting categories.

### ExamTemplate

A concrete structure for a paper or paper family.

Examples:

- AP Macroeconomics 2025-style full paper.
- NSW Selective Reading section.
- SAT Digital Math Module 1.
- School-created Year 8 science exam.

Fields to consider:

- Specification.
- Version or year.
- Sections.
- Total marks.
- Total duration.
- Navigation rules.
- Calculator or tool rules.
- Status: draft, approved, archived.

### PaperSection

An ordered section within a paper.

Fields to consider:

- Title.
- Instructions.
- Duration.
- Question count.
- Allowed question types.
- Marks.
- Navigation rules.
- Topic or skill distribution.

### Question

A reusable question object. It should not be limited to AP or MCQ.

Question types to support over time:

- Single-answer MCQ.
- Multi-select MCQ.
- Numeric response.
- Short answer.
- Extended response.
- FRQ structured response.
- Essay or writing task.
- Graph/drawing task.
- Stimulus-based question set.

### QuestionPart

A subpart of a constructed-response question.

Examples:

- AP FRQ part a, b, c, d.
- Multi-step maths working.
- Writing prompt planning, response, reflection.

### RubricCriterion

A scoring rule for partial credit.

Fields to consider:

- Part.
- Mark value.
- Criterion text.
- Acceptable evidence.
- Common mistakes.
- Feedback template.

### SourceDocument

A registered source file or reference.

Examples:

- Official paper PDF.
- Scoring guideline.
- Answer key.
- Marking scheme.
- Examiner report.
- Syllabus/specification.
- School-provided sample paper.

Fields to consider:

- Program.
- Subject.
- Year.
- Source type.
- File path or object storage key.
- Hash.
- Permissions status.
- Extraction status.
- Extracted text and metadata.

### PaperBlueprint

A learned or authored structure for generating equivalent papers.

Fields to consider:

- Source documents used.
- Sections.
- Topic distribution.
- Difficulty distribution.
- Question type distribution.
- Marks and timing.
- Style constraints.
- Rubric patterns.
- Quality requirements.

### GeneratedPaper

A concrete paper created from a blueprint.

Fields to consider:

- Blueprint.
- Generation model.
- Prompt version.
- Similarity score.
- Quality gate results.
- Approval status.
- Questions and sections.

### PracticeAttempt Or PaperAttempt

A student attempt at either Daily Practice or Real Practice Test.

Fields to consider:

- User.
- Mode.
- Exam program.
- Template or generated paper.
- Section progress.
- Timing.
- Responses.
- Uploaded artifacts.
- Scores.
- Rubric breakdown.
- Follow-up recommendations.

## Current Reuse Strategy

Reuse these existing concepts:

- `Subject` and `Topic` as the beginning of the taxonomy.
- `Question` and `McqOption` for MCQ Daily Practice.
- `TestSession` as the conceptual ancestor of `PracticeAttempt` or `PaperAttempt`.
- `UserAnswer` as the conceptual ancestor of richer student responses.
- Points, streaks, and review screens for engagement and remediation.

Generalize these areas:

- Make sessions template-aware.
- Validate question membership in the attempt before accepting answers.
- Derive current user on the server instead of trusting client-supplied user IDs.
- Support section timing and navigation rules.
- Separate MCQ response scoring from rubric-scored response scoring.

## Exam Family Notes

### AP Economics

Needs both MCQ practice and FRQ-style Real Practice Tests. The current `Sample Test Papers` corpus is strongest for FRQ, scoring guidelines, scoring statistics, and chief reader reports.

### NSW Opportunity Class

Likely MCQ-heavy. Needs reading, mathematical reasoning, and thinking-skills style sections, depending on the current test specification.

### NSW Selective

Needs section-based full tests and daily drills across reading, mathematical reasoning, thinking skills, and writing. Writing requires rubric and longer-response support.

### NSW School Exams

Needs configurable templates. Schools and year levels vary, so the system should support admin-authored paper structures rather than hardcoded rules.

### SAT

Needs Reading/Writing and Math structures. Digital adaptive modules should be treated as a later phase after normal template-driven tests are stable.

## Architecture Decisions

1. Build the platform around exam templates, not hardcoded routes per exam.
2. Keep MCQ, FRQ, writing, numeric, and graph responses under one question model with specialized child models where needed.
3. Keep Daily Practice quick and adaptive; keep Real Practice Test strict and template-driven.
4. Store source documents separately from generated content.
5. Store paper blueprints as first-class assets so new papers can be generated repeatedly and audited.
6. Keep generated content in draft until approved.
7. Add AI grading only after rubric scoring and review workflows exist.

## Minimal First Implementation Slice

1. Add `ExamProgram`, `ExamSpecification`, `ExamTemplate`, and `PaperSection`.
2. Add `SourceDocument` and `PaperBlueprint` as draft/admin-only entities.
3. Preserve current MCQ sessions while introducing a new attempt model or extending the existing one carefully.
4. Use AP Economics 2025 as the first Real Practice Test pilot.
5. Add only the response types needed for the pilot, then expand to NSW/SAT.
