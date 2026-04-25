# Sample Paper Learning Pipeline

## Purpose

The platform should learn from sample papers across AP Economics, NSW Opportunity Class, NSW Selective, NSW school exams, SAT, and future subjects. The goal is not to copy papers. The goal is to extract structure, topic coverage, skill expectations, marking patterns, and paper style so the system can create original practice and realistic simulations.

## Input Types

The pipeline should support these source document types:

- Question paper.
- Individual question file.
- Answer key.
- Scoring guideline.
- Marking scheme.
- Rubric.
- Sample response.
- Examiner or chief reader report.
- Score distribution.
- Scoring statistics.
- Syllabus or exam specification.
- Teacher or school-provided sample paper.

## Current Corpus

The current local corpus is in `Sample Test Papers/` with inventory in `Sample Test Papers/manifest.csv`.

Known facts:

- 292 PDFs total.
- 146 macroeconomics PDFs.
- 146 microeconomics PDFs.
- No 2020 folder/files.
- 2025 AP Economics includes full FRQ papers, individual question PDFs, scoring guidelines, scoring statistics, score distributions, and chief reader reports.

This corpus should be used first as an AP Economics pilot, especially for learning FRQ structure and scoring.

## Pipeline Stages

### 1. Register Source Documents

Each uploaded or discovered file becomes a `SourceDocument`.

Metadata to capture:

- Exam program.
- Subject.
- Grade or year level.
- Paper year.
- Source type.
- File name.
- Storage key.
- Hash.
- File size.
- Source URL, where available.
- Permissions status.
- Extraction status.

### 2. Dedupe And Normalize

Before extraction:

- Compute hash for every file.
- Detect duplicates by hash and near-duplicate metadata.
- Normalize file names.
- Attach subject, year, set number, question number, and document type.
- Keep one canonical source record and link duplicates as aliases.

### 3. Extract Text And Assets

Use a layered extraction strategy:

1. Native PDF text extraction.
2. Page image extraction for diagrams, charts, tables, and graph prompts.
3. OCR for scanned or image-heavy papers.
4. Manual fallback for low-quality documents.

The extraction result should preserve:

- Page numbers.
- Reading order.
- Question boundaries.
- Tables.
- Images and diagrams.
- Marks and point labels.
- Section instructions.

### 4. Classify Documents

Classify each source document into one or more types:

- Paper.
- Question.
- Answer key.
- Marking scheme.
- Rubric.
- Report.
- Statistics.
- Specification.

Classification should be stored and reviewable. The same source may support multiple content records.

### 5. Structure Content Into JSON

Use strict schemas rather than free-form AI output.

Example structured output:

```json
{
  "examProgram": "AP",
  "subject": "Macroeconomics",
  "year": 2025,
  "sections": [
    {
      "title": "Section II",
      "questionType": "FRQ_STRUCTURED",
      "questions": [
        {
          "number": 1,
          "marks": 10,
          "parts": [
            {
              "label": "a",
              "prompt": "...",
              "marks": 1
            }
          ]
        }
      ]
    }
  ]
}
```

Schemas should exist for:

- Exam template.
- Paper section.
- Question.
- Question part.
- Rubric criterion.
- Answer key.
- Topic and skill tags.
- Blueprint metadata.

### 6. Human Review

All extracted content should enter a review queue.

Reviewers should verify:

- Question text.
- Answer choices.
- Correct answers.
- Mark values.
- Rubric criteria.
- Topic tags.
- Skill tags.
- Diagrams and assets.
- Permissions status.

Nothing from sample papers should become student-visible until approved.

### 7. Build Blueprints

A `PaperBlueprint` captures what the sample papers teach the system.

Blueprint fields:

- Sections and timing.
- Number of questions.
- Question type mix.
- Topic distribution.
- Difficulty distribution.
- Marks distribution.
- Stimulus or graph frequency.
- Rubric patterns.
- Wording constraints.
- Expected assets.
- Reporting categories.

Blueprints should be approved separately from extracted questions.

### 8. Generate New Content

Generation should use blueprints and approved taxonomy, not copied paper text.

Outputs:

- Daily Practice questions.
- Full Real Practice Test papers.
- Rubrics.
- Model answers.
- Explanations.
- Common mistakes.
- Remediation drills.

### 9. Run Quality Gates

Every generated question or paper should pass checks before approval:

- Similarity to source papers below threshold.
- Correct answer or rubric exists.
- Marks add up correctly.
- Topic tags are valid.
- Difficulty is appropriate.
- Wording is age-appropriate.
- Diagrams and graph instructions are complete.
- No duplicates against existing generated content.
- No unsupported copyrighted text copied into public content.

### 10. Publish Or Reject

Generated content should have lifecycle states:

- Draft.
- Needs review.
- Approved.
- Published.
- Rejected.
- Archived.

Admin review should show source blueprint, model version, quality gate results, and reviewer notes.

## Legal And IP Guardrails

- Store source documents privately unless rights allow broader use.
- Do not publish official papers as generated platform content.
- Do not copy official question wording into generated papers.
- Use sample papers to learn structure, not to produce clones.
- Track source provenance and generation metadata for auditability.

## First Pilot

Start with AP Economics 2025:

1. Register 2025 Macro and Micro source files.
2. Dedupe duplicate score-distribution PDFs.
3. Extract full FRQ papers and scoring guidelines.
4. Structure Q1, Q2, Q3 for one macro set and one micro set.
5. Build rubrics and topic tags.
6. Create one approved AP Economics blueprint.
7. Generate a small batch of original 2025-like papers.
8. Review with a human before AV uses them.

## Expansion

After the AP pilot works:

- Add AP 2024 and 2023 for blueprint diversity.
- Add NSW OC sample papers as an MCQ-heavy pipeline test.
- Add NSW Selective writing only after rubric and long-response UX exists.
- Add SAT after template-driven sections are stable.
- Add school exams through configurable templates and admin upload.
