# Generated Paper Strategy

## Purpose

The platform should generate original practice content and full exam simulations from approved blueprints. Generation should support both Daily Practice and Real Practice Test modes across AP Economics, NSW Opportunity Class, NSW Selective, NSW school exams, SAT, and future subjects.

## Core Principle

Generate from structure, not copied text.

Sample papers should teach the system:

- Section structure.
- Topic distribution.
- Difficulty distribution.
- Marks and timing.
- Question type mix.
- Rubric patterns.
- Wording style constraints.
- Common mistakes.
- Reporting categories.

The system should not copy official or copyrighted question wording into generated student content.

## Generation Targets

### Daily Practice Sets

Daily sets should be short and adaptive.

Inputs:

- Student weak topics.
- Exam program.
- Subject.
- Difficulty target.
- Due-for-review skills.
- Time available.
- Previous mistakes.

Outputs:

- 5 to 20 questions.
- Mostly MCQ at first.
- Optional numeric or short-answer questions later.
- Immediate explanations.
- Topic and skill updates.

### Real Practice Tests

Real Practice Tests should be generated or assembled from a template and blueprint.

Inputs:

- Exam program.
- Exam specification.
- Exam template.
- Paper blueprint.
- Target difficulty.
- Prior attempt history, if personalization is allowed.

Outputs:

- Full paper with sections.
- Instructions.
- Timing.
- Question ordering.
- Mark values.
- Rubrics and answer keys.
- Model answers.
- Score report structure.

## Generation Pipeline

### 1. Select Blueprint

Pick an approved `PaperBlueprint` for the exam family and subject.

The blueprint defines:

- Section count and order.
- Timing.
- Question counts.
- Topic mix.
- Difficulty mix.
- Question type rules.
- Marks.
- Rubric expectations.
- Style constraints.

### 2. Generate Candidate Paper Plan

Before generating full question text, generate a paper plan.

The plan should include:

- Section-level topic allocation.
- Question-level topic and skill target.
- Difficulty.
- Marks.
- Expected response type.
- Required stimulus, graph, or data table.
- Rubric outline.

### 3. Validate Paper Plan

Run checks before writing final questions:

- Topic distribution matches blueprint.
- Marks add up.
- Question types match section rules.
- Difficulty is balanced.
- No topic is overrepresented.
- Required skills are covered.

### 4. Generate Questions

Generate each question according to the validated plan.

For MCQs, generate:

- Stem.
- Options.
- Correct answer.
- Distractor rationale.
- Explanation.
- Topic and skill tags.

For constructed responses, generate:

- Stem.
- Parts.
- Mark allocation.
- Expected response type.
- Rubric criteria.
- Model answer.
- Common mistakes.

### 5. Run Quality Gates

Quality gates should be automatic where possible.

Required checks:

- Similarity to source documents below threshold.
- Similarity to existing generated questions below threshold.
- Correct answer exists.
- Rubric exists for constructed responses.
- Marks add up correctly.
- Topic tags are valid.
- Difficulty is within target band.
- Graph or diagram instructions are complete.
- Age and grade level are appropriate.
- No unsupported copied source text.

### 6. Human Review

Generated content enters draft status until reviewed.

Reviewer should see:

- Blueprint used.
- Prompt version.
- Model used.
- Quality gate results.
- Source similarity summary.
- Generated answer key and rubric.
- Known risks or low-confidence fields.

### 7. Publish

Only approved generated content should appear in student-facing flows.

Publishing rules:

- Daily Practice questions can be published individually.
- Real Practice Tests should be published as a complete paper.
- Any failed quality gate requires reviewer override with reason.

## AP Economics 2025-Like Strategy

For AP Economics, the immediate goal is to create original 2025-like papers.

The 2025 source corpus includes:

- Full FRQ papers.
- Individual Q1, Q2, and Q3 files.
- Scoring guidelines.
- Scoring statistics.
- Score distributions.
- Chief reader reports.

Generation should learn:

- Q1, Q2, Q3 structure.
- Typical point totals.
- Common macro and micro topic combinations.
- Graph and calculation patterns.
- Rubric style.
- Common student errors.

Do not generate near-copies of official 2025 questions. Generate different scenarios that test equivalent skills.

## NSW Strategy

### NSW Opportunity Class

Likely initial focus:

- MCQ-heavy Daily Practice.
- Reading comprehension.
- Mathematical reasoning.
- Thinking skills.
- Full paper templates after sample papers are reviewed.

### NSW Selective

Likely needs:

- Section-based Real Practice Tests.
- Reading, mathematical reasoning, thinking skills.
- Writing tasks with rubrics.
- Longer response review workflow.

### NSW School Exams

Needs flexible templates:

- School.
- Grade/year.
- Subject.
- Topic coverage.
- Teacher-defined marks.
- Teacher/admin uploaded samples.

## SAT Strategy

Start with template-based non-adaptive practice.

Later add digital adaptive behavior:

- Module 1 performance determines Module 2 difficulty.
- Separate blueprints for easier and harder second modules.
- Report scores using SAT-style skill areas.

Do not start with adaptive SAT generation until the general template system is stable.

## Feedback Loop

After every generated attempt:

1. Score the attempt.
2. Identify weak topics and skills.
3. Identify missed rubric criteria for constructed responses.
4. Generate Daily Practice drills for weak areas.
5. Generate an equivalent Real Practice Test later with different questions.
6. Track readiness by exam family and section.

## Architecture Decisions

1. Generate a paper plan before generating final question text.
2. Require blueprints for full paper generation.
3. Keep generation outputs in draft until approved.
4. Store prompt version, model, blueprint, and quality gate metadata.
5. Separate Daily Practice generation from Real Practice Test generation.
6. Treat personalization carefully: real simulations should usually preserve exam-like distribution, while daily practice can be highly adaptive.
7. Delay fully automated constructed-response grading until enough reviewed examples exist.

## Success Criteria

Generated paper strategy is working when:

- AV can take many AP Economics 2025-like papers without seeing repeated scenarios.
- Daily MCQ drills target the skills missed in Real Practice Tests.
- Generated papers pass quality gates before publication.
- Admins can explain why a generated paper matches its blueprint.
- The same pipeline can be reused for NSW and SAT sample papers.
