# Data Model Architecture

## Purpose

This document defines the target model vocabulary for the multi-exam platform. It is intentionally broader than AP Economics so the same system can support AP, NSW Opportunity Class, NSW Selective, NSW school exams, SAT, and future exams.

## Current Foundation

The current schema has useful starting points:

- `Subject` and `Topic` support content taxonomy.
- `Question` supports core question content.
- `McqOption` supports MCQ answers.
- `TestSession` supports a practice attempt concept.
- `UserAnswer` supports selected options and early text-answer fields.

The next architecture should extend these foundations instead of discarding them.

## Target Model Groups

### Exam Definition Models

These models define what an exam is.

#### ExamProgram

Represents a broad exam family.

Examples:

- AP.
- NSW Opportunity Class.
- NSW Selective.
- NSW School Exams.
- SAT.

Suggested fields:

- `id`.
- `code`.
- `name`.
- `country`.
- `authority`.
- `description`.
- `isActive`.

#### ExamSpecification

Represents a stable exam type or subject within a program.

Examples:

- AP Macroeconomics.
- AP Microeconomics.
- NSW Selective Reading.
- SAT Math.
- Year 7 School Mathematics.

Suggested fields:

- `id`.
- `examProgramId`.
- `subjectId`.
- `gradeLevel`.
- `examBoard`.
- `defaultDurationMinutes`.
- `scoringModel`.
- `supportedQuestionTypes`.
- `reportingCategories`.
- `status`.

#### ExamTemplate

Represents a paper structure that can be attempted or used for generation.

Suggested fields:

- `id`.
- `examSpecificationId`.
- `name`.
- `version`.
- `year`.
- `totalDurationMinutes`.
- `totalMarks`.
- `navigationRules`.
- `toolRules`.
- `status`.

#### PaperSection

Represents one ordered section within a template.

Suggested fields:

- `id`.
- `examTemplateId`.
- `title`.
- `instructions`.
- `sortOrder`.
- `durationMinutes`.
- `questionCount`.
- `marks`.
- `allowedQuestionTypes`.
- `topicDistribution`.
- `difficultyDistribution`.

## Content Models

### Question

The existing `Question` model should become more general while preserving MCQ support.

Question types to support over time:

- `MCQ_SINGLE`.
- `MCQ_MULTI_SELECT`.
- `NUMERIC`.
- `SHORT_ANSWER`.
- `FRQ_STRUCTURED`.
- `ESSAY`.
- `GRAPH_OR_DRAWING`.
- `STIMULUS_SET`.

Suggested additions:

- `examProgramId` or derivable through subject/specification mapping.
- `sourceDocumentId`.
- `questionType`.
- `marks`.
- `estimatedSeconds`.
- `skillTags`.
- `stimulusId`.
- `requiresArtifact`.
- `approvalStatus`.

### QuestionPart

Needed for FRQs, essays with sub-prompts, and multi-step working.

Suggested fields:

- `id`.
- `questionId`.
- `label`.
- `prompt`.
- `marks`.
- `sortOrder`.
- `expectedResponseType`.
- `requiresGraph`.
- `requiresUpload`.
- `requiresCalculation`.

### McqOption

Keep the current MCQ option model. It remains valid for Daily Practice and MCQ sections in Real Practice Tests.

Suggested future additions:

- `explanation`.
- `misconceptionTag`.
- `isDistractor`.

### RubricCriterion

Needed for partial-credit scoring.

Suggested fields:

- `id`.
- `questionId`.
- `questionPartId`.
- `marks`.
- `criterionText`.
- `acceptableEvidence`.
- `commonMistakes`.
- `feedbackTemplate`.
- `sortOrder`.

### Stimulus

Optional model for reading passages, data tables, diagrams, charts, and shared prompts.

Suggested fields:

- `id`.
- `title`.
- `content`.
- `assetUrl`.
- `sourceDocumentId`.
- `metadata`.

## Source And Blueprint Models

### SourceDocument

Represents uploaded or registered source material.

Suggested fields:

- `id`.
- `examProgramId`.
- `subjectId`.
- `year`.
- `gradeLevel`.
- `documentType`.
- `fileName`.
- `storageKey`.
- `sha256Hash`.
- `sourceUrl`.
- `permissionsStatus`.
- `extractionStatus`.
- `extractedText`.
- `metadata`.

### PaperBlueprint

Represents learned or authored paper structure.

Suggested fields:

- `id`.
- `examSpecificationId`.
- `name`.
- `sourceDocumentIds`.
- `sections`.
- `topicDistribution`.
- `difficultyDistribution`.
- `questionTypeDistribution`.
- `marksDistribution`.
- `styleConstraints`.
- `qualityRules`.
- `status`.

### GeneratedPaper

Represents a generated or assembled paper.

Suggested fields:

- `id`.
- `paperBlueprintId`.
- `examTemplateId`.
- `generationModel`.
- `promptVersion`.
- `similarityScore`.
- `qualityGateResults`.
- `approvalStatus`.
- `reviewerId`.
- `publishedAt`.

### GeneratedPaperQuestion

Joins generated papers to questions with section and order.

Suggested fields:

- `generatedPaperId`.
- `paperSectionId`.
- `questionId`.
- `sortOrder`.
- `marks`.

## Attempt And Response Models

### PracticeAttempt

A unified attempt model can represent both Daily Practice and Real Practice Test.

Suggested fields:

- `id`.
- `userId`.
- `mode`: daily practice or real practice test.
- `examProgramId`.
- `examTemplateId`.
- `generatedPaperId`.
- `status`.
- `startedAt`.
- `completedAt`.
- `timeLimitSeconds`.
- `score`.
- `maxScore`.
- `metadata`.

### AttemptSectionProgress

Needed for full paper simulations.

Suggested fields:

- `id`.
- `practiceAttemptId`.
- `paperSectionId`.
- `startedAt`.
- `completedAt`.
- `timeSpentSeconds`.
- `status`.

### StudentResponse

Generalizes `UserAnswer`.

Suggested fields:

- `id`.
- `practiceAttemptId`.
- `questionId`.
- `questionPartId`.
- `selectedOptionId`.
- `answerText`.
- `numericAnswer`.
- `isCorrect`.
- `marksAwarded`.
- `timeSpentSeconds`.
- `submittedAt`.

### StudentResponseArtifact

Supports uploaded work, images, and drawings.

Suggested fields:

- `id`.
- `studentResponseId`.
- `artifactType`.
- `storageKey`.
- `mimeType`.
- `metadata`.

### ResponseScore

Stores criterion-level grading.

Suggested fields:

- `id`.
- `studentResponseId`.
- `rubricCriterionId`.
- `marksAwarded`.
- `feedback`.
- `scorerType`.
- `scorerUserId`.
- `confidence`.
- `reviewStatus`.

## Relationship Sketch

```text
ExamProgram
  -> ExamSpecification
    -> ExamTemplate
      -> PaperSection

SourceDocument
  -> PaperBlueprint
    -> GeneratedPaper
      -> GeneratedPaperQuestion
        -> Question
          -> McqOption
          -> QuestionPart
            -> RubricCriterion

User
  -> PracticeAttempt
    -> AttemptSectionProgress
    -> StudentResponse
      -> StudentResponseArtifact
      -> ResponseScore
```

## Migration Approach

1. Add new exam definition and source models first.
2. Add nullable links from existing `Question` and `TestSession` concepts.
3. Keep current MCQ behavior unchanged.
4. Add constructed-response child models.
5. Add new attempt and response models only when the UI is ready, or migrate `TestSession` carefully.
6. Backfill existing AP Economics subjects and questions into the new exam architecture.

## Architecture Decisions

1. Use templates and blueprints instead of hardcoded exam-specific logic.
2. Preserve current MCQ models while adding richer response models.
3. Model partial credit explicitly through rubric criteria and response scores.
4. Store source provenance on imported and generated content.
5. Keep generated papers auditable through prompt/model/quality metadata.
6. Support school exams through configurable templates rather than a separate code path.
