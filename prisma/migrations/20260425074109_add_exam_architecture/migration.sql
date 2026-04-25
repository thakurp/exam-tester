-- CreateEnum
CREATE TYPE "SourceDocumentType" AS ENUM ('QUESTION_PAPER', 'INDIVIDUAL_QUESTION', 'ANSWER_KEY', 'SCORING_GUIDELINE', 'MARKING_SCHEME', 'SAMPLE_RESPONSE', 'EXAMINER_REPORT', 'SCORE_DISTRIBUTION', 'SCORING_STATISTICS', 'SYLLABUS_SPECIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceDocumentStatus" AS ENUM ('REGISTERED', 'EXTRACTING', 'EXTRACTED', 'STRUCTURING', 'REVIEW_PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BlueprintStatus" AS ENUM ('DRAFT', 'REVIEW_PENDING', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GeneratedPaperStatus" AS ENUM ('DRAFT', 'QUALITY_CHECKING', 'REVIEW_PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionPartResponseType" AS ENUM ('TEXT', 'NUMERIC', 'GRAPH_UPLOAD', 'IMAGE_UPLOAD', 'MULTI_PART');

-- CreateEnum
CREATE TYPE "PaperAttemptMode" AS ENUM ('DAILY_PRACTICE', 'REAL_PRACTICE_TEST');

-- CreateEnum
CREATE TYPE "PaperAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "ScorerType" AS ENUM ('AUTO', 'SELF_REVIEW', 'ADMIN', 'AI_SUGGESTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'NUMERIC';
ALTER TYPE "QuestionType" ADD VALUE 'FRQ_STRUCTURED';
ALTER TYPE "QuestionType" ADD VALUE 'ESSAY';
ALTER TYPE "QuestionType" ADD VALUE 'GRAPH_OR_DRAWING';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "estimatedSeconds" INTEGER,
ADD COLUMN     "examProgramCode" TEXT,
ADD COLUMN     "sourceDocumentId" TEXT;

-- CreateTable
CREATE TABLE "ExamProgram" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AU',
    "authority" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSpecification" (
    "id" TEXT NOT NULL,
    "examProgramId" TEXT NOT NULL,
    "subjectId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeLevel" TEXT,
    "examBoard" TEXT,
    "defaultDurationMinutes" INTEGER,
    "scoringModel" TEXT,
    "reportingCategories" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTemplate" (
    "id" TEXT NOT NULL,
    "examSpecificationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER,
    "totalDurationMinutes" INTEGER,
    "totalMarks" INTEGER,
    "navigationRules" JSONB,
    "toolRules" JSONB,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperSection" (
    "id" TEXT NOT NULL,
    "examTemplateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER,
    "questionCount" INTEGER,
    "marks" INTEGER,
    "allowedQuestionTypes" JSONB,
    "topicDistribution" JSONB,
    "difficultyDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "examProgramId" TEXT,
    "subjectId" TEXT,
    "year" INTEGER,
    "gradeLevel" TEXT,
    "setNumber" INTEGER,
    "questionNumber" INTEGER,
    "documentType" "SourceDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "localPath" TEXT,
    "sha256Hash" TEXT,
    "fileSizeBytes" INTEGER,
    "sourceUrl" TEXT,
    "permissionsStatus" TEXT NOT NULL DEFAULT 'INTERNAL',
    "extractionStatus" "SourceDocumentStatus" NOT NULL DEFAULT 'REGISTERED',
    "extractedText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperBlueprint" (
    "id" TEXT NOT NULL,
    "examProgramId" TEXT,
    "examSpecificationId" TEXT,
    "name" TEXT NOT NULL,
    "sourceDocumentIds" JSONB,
    "sections" JSONB,
    "topicDistribution" JSONB,
    "difficultyDistribution" JSONB,
    "questionTypeDistribution" JSONB,
    "marksDistribution" JSONB,
    "styleConstraints" JSONB,
    "qualityRules" JSONB,
    "status" "BlueprintStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPaper" (
    "id" TEXT NOT NULL,
    "paperBlueprintId" TEXT,
    "examTemplateId" TEXT,
    "name" TEXT,
    "generationModel" TEXT,
    "promptVersion" TEXT,
    "similarityScore" DOUBLE PRECISION,
    "qualityGateResults" JSONB,
    "approvalStatus" "GeneratedPaperStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPaperQuestion" (
    "id" TEXT NOT NULL,
    "generatedPaperId" TEXT NOT NULL,
    "paperSectionId" TEXT,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "marks" INTEGER,

    CONSTRAINT "GeneratedPaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPart" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "marks" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "expectedResponseType" "QuestionPartResponseType" NOT NULL DEFAULT 'TEXT',
    "requiresGraph" BOOLEAN NOT NULL DEFAULT false,
    "requiresUpload" BOOLEAN NOT NULL DEFAULT false,
    "requiresCalculation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT,
    "questionPartId" TEXT,
    "marks" INTEGER NOT NULL,
    "criterionText" TEXT NOT NULL,
    "acceptableEvidence" TEXT,
    "commonMistakes" TEXT,
    "feedbackTemplate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "PaperAttemptMode" NOT NULL,
    "examProgramId" TEXT,
    "examTemplateId" TEXT,
    "generatedPaperId" TEXT,
    "status" "PaperAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeLimitAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "PaperAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSectionProgress" (
    "id" TEXT NOT NULL,
    "paperAttemptId" TEXT NOT NULL,
    "paperSectionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timeSpentSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',

    CONSTRAINT "AttemptSectionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResponse" (
    "id" TEXT NOT NULL,
    "paperAttemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionPartId" TEXT,
    "answerText" TEXT,
    "numericAnswer" DOUBLE PRECISION,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION,
    "timeSpentSeconds" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseArtifact" (
    "id" TEXT NOT NULL,
    "studentResponseId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "storageKey" TEXT,
    "localPath" TEXT,
    "mimeType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseScore" (
    "id" TEXT NOT NULL,
    "studentResponseId" TEXT NOT NULL,
    "rubricCriterionId" TEXT,
    "marksAwarded" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "scorerType" "ScorerType" NOT NULL DEFAULT 'AUTO',
    "scorerUserId" TEXT,
    "confidence" DOUBLE PRECISION,
    "reviewStatus" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamProgram_code_key" ON "ExamProgram"("code");

-- CreateIndex
CREATE INDEX "ExamProgram_code_idx" ON "ExamProgram"("code");

-- CreateIndex
CREATE INDEX "ExamProgram_isActive_idx" ON "ExamProgram"("isActive");

-- CreateIndex
CREATE INDEX "ExamSpecification_examProgramId_idx" ON "ExamSpecification"("examProgramId");

-- CreateIndex
CREATE INDEX "ExamSpecification_subjectId_idx" ON "ExamSpecification"("subjectId");

-- CreateIndex
CREATE INDEX "ExamSpecification_isActive_idx" ON "ExamSpecification"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSpecification_examProgramId_code_key" ON "ExamSpecification"("examProgramId", "code");

-- CreateIndex
CREATE INDEX "ExamTemplate_examSpecificationId_idx" ON "ExamTemplate"("examSpecificationId");

-- CreateIndex
CREATE INDEX "ExamTemplate_status_idx" ON "ExamTemplate"("status");

-- CreateIndex
CREATE INDEX "PaperSection_examTemplateId_idx" ON "PaperSection"("examTemplateId");

-- CreateIndex
CREATE INDEX "SourceDocument_examProgramId_idx" ON "SourceDocument"("examProgramId");

-- CreateIndex
CREATE INDEX "SourceDocument_subjectId_idx" ON "SourceDocument"("subjectId");

-- CreateIndex
CREATE INDEX "SourceDocument_year_idx" ON "SourceDocument"("year");

-- CreateIndex
CREATE INDEX "SourceDocument_documentType_idx" ON "SourceDocument"("documentType");

-- CreateIndex
CREATE INDEX "SourceDocument_sha256Hash_idx" ON "SourceDocument"("sha256Hash");

-- CreateIndex
CREATE INDEX "SourceDocument_extractionStatus_idx" ON "SourceDocument"("extractionStatus");

-- CreateIndex
CREATE INDEX "PaperBlueprint_examProgramId_idx" ON "PaperBlueprint"("examProgramId");

-- CreateIndex
CREATE INDEX "PaperBlueprint_examSpecificationId_idx" ON "PaperBlueprint"("examSpecificationId");

-- CreateIndex
CREATE INDEX "PaperBlueprint_status_idx" ON "PaperBlueprint"("status");

-- CreateIndex
CREATE INDEX "GeneratedPaper_paperBlueprintId_idx" ON "GeneratedPaper"("paperBlueprintId");

-- CreateIndex
CREATE INDEX "GeneratedPaper_approvalStatus_idx" ON "GeneratedPaper"("approvalStatus");

-- CreateIndex
CREATE INDEX "GeneratedPaperQuestion_generatedPaperId_idx" ON "GeneratedPaperQuestion"("generatedPaperId");

-- CreateIndex
CREATE INDEX "GeneratedPaperQuestion_questionId_idx" ON "GeneratedPaperQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPaperQuestion_generatedPaperId_questionId_key" ON "GeneratedPaperQuestion"("generatedPaperId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionPart_questionId_idx" ON "QuestionPart"("questionId");

-- CreateIndex
CREATE INDEX "RubricCriterion_questionPartId_idx" ON "RubricCriterion"("questionPartId");

-- CreateIndex
CREATE INDEX "RubricCriterion_questionId_idx" ON "RubricCriterion"("questionId");

-- CreateIndex
CREATE INDEX "PaperAttempt_userId_idx" ON "PaperAttempt"("userId");

-- CreateIndex
CREATE INDEX "PaperAttempt_examProgramId_idx" ON "PaperAttempt"("examProgramId");

-- CreateIndex
CREATE INDEX "PaperAttempt_status_idx" ON "PaperAttempt"("status");

-- CreateIndex
CREATE INDEX "AttemptSectionProgress_paperAttemptId_idx" ON "AttemptSectionProgress"("paperAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSectionProgress_paperAttemptId_paperSectionId_key" ON "AttemptSectionProgress"("paperAttemptId", "paperSectionId");

-- CreateIndex
CREATE INDEX "StudentResponse_paperAttemptId_idx" ON "StudentResponse"("paperAttemptId");

-- CreateIndex
CREATE INDEX "StudentResponse_questionId_idx" ON "StudentResponse"("questionId");

-- CreateIndex
CREATE INDEX "ResponseArtifact_studentResponseId_idx" ON "ResponseArtifact"("studentResponseId");

-- CreateIndex
CREATE INDEX "ResponseScore_studentResponseId_idx" ON "ResponseScore"("studentResponseId");

-- CreateIndex
CREATE INDEX "ResponseScore_rubricCriterionId_idx" ON "ResponseScore"("rubricCriterionId");

-- AddForeignKey
ALTER TABLE "ExamSpecification" ADD CONSTRAINT "ExamSpecification_examProgramId_fkey" FOREIGN KEY ("examProgramId") REFERENCES "ExamProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_examSpecificationId_fkey" FOREIGN KEY ("examSpecificationId") REFERENCES "ExamSpecification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperSection" ADD CONSTRAINT "PaperSection_examTemplateId_fkey" FOREIGN KEY ("examTemplateId") REFERENCES "ExamTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_examProgramId_fkey" FOREIGN KEY ("examProgramId") REFERENCES "ExamProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperBlueprint" ADD CONSTRAINT "PaperBlueprint_examProgramId_fkey" FOREIGN KEY ("examProgramId") REFERENCES "ExamProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperBlueprint" ADD CONSTRAINT "PaperBlueprint_examSpecificationId_fkey" FOREIGN KEY ("examSpecificationId") REFERENCES "ExamSpecification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPaper" ADD CONSTRAINT "GeneratedPaper_paperBlueprintId_fkey" FOREIGN KEY ("paperBlueprintId") REFERENCES "PaperBlueprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPaperQuestion" ADD CONSTRAINT "GeneratedPaperQuestion_generatedPaperId_fkey" FOREIGN KEY ("generatedPaperId") REFERENCES "GeneratedPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPaperQuestion" ADD CONSTRAINT "GeneratedPaperQuestion_paperSectionId_fkey" FOREIGN KEY ("paperSectionId") REFERENCES "PaperSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPaperQuestion" ADD CONSTRAINT "GeneratedPaperQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPart" ADD CONSTRAINT "QuestionPart_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_questionPartId_fkey" FOREIGN KEY ("questionPartId") REFERENCES "QuestionPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAttempt" ADD CONSTRAINT "PaperAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAttempt" ADD CONSTRAINT "PaperAttempt_examTemplateId_fkey" FOREIGN KEY ("examTemplateId") REFERENCES "ExamTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAttempt" ADD CONSTRAINT "PaperAttempt_generatedPaperId_fkey" FOREIGN KEY ("generatedPaperId") REFERENCES "GeneratedPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSectionProgress" ADD CONSTRAINT "AttemptSectionProgress_paperAttemptId_fkey" FOREIGN KEY ("paperAttemptId") REFERENCES "PaperAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSectionProgress" ADD CONSTRAINT "AttemptSectionProgress_paperSectionId_fkey" FOREIGN KEY ("paperSectionId") REFERENCES "PaperSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponse" ADD CONSTRAINT "StudentResponse_paperAttemptId_fkey" FOREIGN KEY ("paperAttemptId") REFERENCES "PaperAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponse" ADD CONSTRAINT "StudentResponse_questionPartId_fkey" FOREIGN KEY ("questionPartId") REFERENCES "QuestionPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseArtifact" ADD CONSTRAINT "ResponseArtifact_studentResponseId_fkey" FOREIGN KEY ("studentResponseId") REFERENCES "StudentResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseScore" ADD CONSTRAINT "ResponseScore_studentResponseId_fkey" FOREIGN KEY ("studentResponseId") REFERENCES "StudentResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseScore" ADD CONSTRAINT "ResponseScore_rubricCriterionId_fkey" FOREIGN KEY ("rubricCriterionId") REFERENCES "RubricCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
