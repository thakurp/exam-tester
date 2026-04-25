# FRQ And Constructed Response Plan

## Purpose

The platform needs more than MCQs. AP Economics requires FRQs, NSW Selective may require writing, school exams may include long responses, and many exams require numeric work, diagrams, graphs, or uploaded working.

This document defines how to add constructed-response support without damaging the current MCQ practice experience.

## Response Types To Support

Start with these response types:

- MCQ single answer.
- MCQ multi-select.
- Numeric answer.
- Short text answer.
- Structured FRQ with subparts.
- Essay or writing response.
- Graph or drawing response.
- Uploaded working image or document.

## Data Model Concepts

### QuestionPart

Constructed-response questions need subparts.

Fields to consider:

- `questionId`.
- `label`, such as `a`, `b`, `c`, `i`, or `ii`.
- `prompt`.
- `marks`.
- `sortOrder`.
- `expectedResponseType`.
- `requiresGraph`.
- `requiresUpload`.
- `requiresCalculation`.

### RubricCriterion

Each part should have one or more scoring criteria.

Fields to consider:

- `questionPartId`.
- `marks`.
- `criterionText`.
- `acceptableEvidence`.
- `commonMistakes`.
- `feedbackTemplate`.
- `sortOrder`.

### StudentResponse

A response should support both simple and complex answers.

Fields to consider:

- `attemptId`.
- `questionId`.
- `selectedOptionId` for MCQ.
- `answerText` for short answer or essay.
- `numericAnswer` for numeric tasks.
- `partResponses` for FRQ or multi-part tasks.
- `artifacts` for uploads or drawings.
- `submittedAt`.
- `timeSpentSeconds`.

### StudentResponseArtifact

Artifacts support graphs, working, scanned pages, and images.

Fields to consider:

- `responseId`.
- `artifactType`: image, drawing, document, audio if needed later.
- `storageKey`.
- `mimeType`.
- `metadata`.

### ResponseScore

Scoring must be criterion-level, not just total marks.

Fields to consider:

- `responseId`.
- `rubricCriterionId`.
- `marksAwarded`.
- `feedback`.
- `scorerType`: auto, self, admin, ai.
- `scorerUserId`.
- `confidence`.
- `reviewStatus`.

## UX Requirements

### Student Attempt UI

The test UI should support:

- Section instructions.
- Question stem and stimulus.
- Subpart navigation.
- Text response boxes.
- Numeric entry.
- Formula/calculation-friendly input later if needed.
- Graph drawing or image upload.
- Autosave.
- Time remaining by section.
- Review unanswered parts before submission.

### Review UI

The review screen should show:

- Total marks.
- Section marks.
- Question and part marks.
- Rubric criteria earned and missed.
- Model answer.
- Student response.
- Uploaded/drawn artifacts.
- Common mistakes.
- Recommended Daily Practice drills.

## Scoring Strategy

### Phase 1: Rubric-Assisted Review

Start with self-review or admin review using clear rubrics. This gets the scoring model right before AI scoring is trusted.

### Phase 2: AI Feedback Without Final Grade

Let AI suggest feedback and possible criteria matches, but mark as unverified. The user can learn from it, but official scores should still be human-reviewed or self-confirmed.

### Phase 3: Calibrated AI Scoring

Only after enough reviewed responses exist:

- Compare AI marks to human marks.
- Track disagreement rate.
- Require confidence thresholds.
- Send low-confidence responses to human review.
- Keep criterion-level explanations.

## AP Economics Pilot

Use AP Economics as the first constructed-response pilot because the existing corpus has FRQ papers and scoring guidelines.

Pilot scope:

- Macro 2025 Set 1.
- Micro 2025 Set 1.
- Q1, Q2, and Q3 for each.
- Text responses first.
- Graph/image upload second.
- Rubric scoring by criterion.
- Generated equivalent papers only after approved extracted rubrics exist.

## NSW And SAT Considerations

### NSW Opportunity Class

Likely MCQ-heavy. Constructed-response support may not be needed for the first OC launch, but the template engine should not prevent it.

### NSW Selective

Writing support is important. This needs:

- Long text editor.
- Prompt-specific rubric.
- Planning and final response fields if useful.
- Human or parent review workflow before AI scoring is trusted.

### NSW School Exams

School exams may include short answers, long responses, diagrams, and working. Admin-authored rubrics and mark schemes are essential.

### SAT

SAT is mostly auto-gradable. Numeric response and section/module templates matter more than long-form rubrics. Digital adaptive behavior should come later.

## Architecture Decisions

1. Do not overload `McqOption` or simple `UserAnswer` to represent FRQs.
2. Add part-level and rubric-level models before building AI grading.
3. Keep scoring breakdowns per criterion for transparency.
4. Let MCQ answers remain auto-scored and immediate.
5. Let constructed responses move through review and scoring states.
6. Support uploads/drawings as artifacts, not as raw fields embedded in answer text.
7. Treat graph support as a response artifact first; richer in-browser graph drawing can come after upload works.

## Acceptance Criteria

A first FRQ MVP is ready when:

- Admins can create or import a multi-part question.
- Admins can define marks and rubric criteria per part.
- Students can answer each part in a timed attempt.
- Students can upload an image for graph or working questions.
- Review shows part-level and criterion-level marks.
- The system can recommend follow-up Daily Practice based on missed criteria.
