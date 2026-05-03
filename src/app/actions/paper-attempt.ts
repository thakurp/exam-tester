"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PaperAttemptData {
  attempt: {
    id: string;
    status: string;
    startedAt: Date;
    timeLimitAt: Date | null;
    mode: string;
  };
  sections: SectionData[];
}

export interface SectionData {
  id: string;
  title: string;
  instructions: string | null;
  durationMinutes: number | null;
  sortOrder: number;
  allowedQuestionTypes: string[];
  questions: QuestionData[];
  progress: { status: string; startedAt: Date | null; completedAt: Date | null } | null;
}

export interface QuestionData {
  id: string;
  type: string;
  stem: string;
  difficulty: string;
  estimatedSeconds: number | null;
  options: { id: string; label: string; text: string }[];
  parts: PartData[];
  savedResponse: { selectedOptionId: string | null; partResponses: Record<string, string> } | null;
  sectionId: string;
  sortOrder: number;
  marks: number | null;
}

export interface PartData {
  id: string;
  label: string;
  prompt: string;
  marks: number;
  sortOrder: number;
  requiresGraph: boolean;
  rubricCriteria: { id: string; marks: number; criterionText: string; acceptableEvidence: string | null }[];
}

// ── Assemble + Start ────────────────────────────────────────────────────────────

/**
 * Assembles a GeneratedPaper from available questions and starts a PaperAttempt.
 * MCQ section: picks published MCQ questions from the subject linked to the spec.
 * FRQ section: picks seeded FRQ questions by examProgramCode.
 */
export async function assembleAndStartPaperAttempt(examTemplateId: string): Promise<
  { attemptId: string } | { error: string }
> {
  const user = await getOrCreateDbUser();
  if (!user) return { error: "Not authenticated" };

  const template = await prisma.examTemplate.findUnique({
    where: { id: examTemplateId },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      examSpecification: {
        include: { examProgram: true },
      },
    },
  });

  if (!template) return { error: "Exam template not found" };
  if (template.status !== "APPROVED") return { error: "This exam template is not yet approved" };

  const examProgramCode = template.examSpecification.examProgram.code;
  // Map AP program codes to subject codes used in the Subject table
  const subjectCodeMap: Record<string, string> = {
    AP_MACRO: "AP_MACRO",
    AP_MICRO: "AP_MICRO",
    SAT_MATH: "SAT_MATH",
    SAT_RW: "SAT_RW",
  };
  const subjectCode = subjectCodeMap[template.examSpecification.code] ?? null;

  const subject = subjectCode
    ? await prisma.subject.findUnique({ where: { code: subjectCode } })
    : null;

  // Assemble questions per section
  const sectionQuestions: Record<string, string[]> = {};

  for (const section of template.sections) {
    const types: string[] = (section.allowedQuestionTypes as string[]) ?? [];
    const isMcqSection = types.includes("MCQ") && !types.includes("FRQ_STRUCTURED");
    const isFrqSection = types.includes("FRQ_STRUCTURED");

    if (isMcqSection && subject) {
      const desired = section.questionCount ?? 60;
      const mcqs = await prisma.question.findMany({
        where: {
          status: "PUBLISHED",
          type: "MCQ",
          topic: { subjectId: subject.id },
        },
        select: { id: true },
        take: desired * 3, // over-fetch for shuffle
      });

      const shuffled = [...mcqs].sort(() => Math.random() - 0.5);
      sectionQuestions[section.id] = shuffled.slice(0, desired).map((q) => q.id);
    } else if (isFrqSection) {
      const frqs = await prisma.question.findMany({
        where: {
          status: "PUBLISHED",
          type: "FRQ_STRUCTURED",
          examProgramCode: template.examSpecification.code,
        },
        orderBy: { id: "asc" },
        select: { id: true },
        take: section.questionCount ?? 3,
      });
      sectionQuestions[section.id] = frqs.map((q) => q.id);
    } else {
      sectionQuestions[section.id] = [];
    }
  }

  // Calculate time limit
  const totalMinutes = template.totalDurationMinutes ?? 130;
  const timeLimitAt = new Date(Date.now() + totalMinutes * 60 * 1000);

  // Create GeneratedPaper
  const paper = await prisma.generatedPaper.create({
    data: {
      examTemplateId: template.id,
      name: `${template.name} — Practice Paper`,
      approvalStatus: "DRAFT",
      generationModel: "assembled",
    },
  });

  // Create GeneratedPaperQuestion links per section
  let globalOrder = 0;
  for (const section of template.sections) {
    const qIds = sectionQuestions[section.id] ?? [];
    for (const qId of qIds) {
      await prisma.generatedPaperQuestion.create({
        data: {
          generatedPaperId: paper.id,
          paperSectionId: section.id,
          questionId: qId,
          sortOrder: globalOrder++,
        },
      });
    }
  }

  // Create PaperAttempt
  const attempt = await prisma.paperAttempt.create({
    data: {
      userId: user.id,
      mode: "REAL_PRACTICE_TEST",
      examProgramId: template.examSpecification.examProgramId,
      examTemplateId: template.id,
      generatedPaperId: paper.id,
      status: "IN_PROGRESS",
      timeLimitAt,
    },
  });

  // Create AttemptSectionProgress for each section
  for (const section of template.sections) {
    await prisma.attemptSectionProgress.create({
      data: {
        paperAttemptId: attempt.id,
        paperSectionId: section.id,
        status: "NOT_STARTED",
      },
    });
  }

  return { attemptId: attempt.id };
}

// ── Load Attempt Data ────────────────────────────────────────────────────────────

export async function loadPaperAttempt(attemptId: string): Promise<PaperAttemptData | null> {
  const user = await getOrCreateDbUser();
  if (!user) return null;

  const attempt = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
  });
  if (!attempt) return null;

  const paper = await prisma.generatedPaper.findUnique({
    where: { id: attempt.generatedPaperId! },
    include: {
      questions: {
        include: {
          paperSection: true,
          question: {
            include: {
              options: { orderBy: { sortOrder: "asc" } },
              questionParts: {
                orderBy: { sortOrder: "asc" },
                include: {
                  rubricCriteria: { orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!paper) return null;

  // Load existing responses
  const existingResponses = await prisma.studentResponse.findMany({
    where: { paperAttemptId: attemptId },
  });
  const responseByQuestion: Record<string, typeof existingResponses[0][]> = {};
  for (const r of existingResponses) {
    if (!responseByQuestion[r.questionId]) responseByQuestion[r.questionId] = [];
    responseByQuestion[r.questionId].push(r);
  }

  // Load section progress
  const sectionProgress = await prisma.attemptSectionProgress.findMany({
    where: { paperAttemptId: attemptId },
  });
  const progressBySection: Record<string, typeof sectionProgress[0]> = {};
  for (const p of sectionProgress) progressBySection[p.paperSectionId] = p;

  // Load template sections to get ordered sections
  const template = await prisma.examTemplate.findUnique({
    where: { id: attempt.examTemplateId! },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return null;

  // Group questions by section
  const questionsBySection: Record<string, typeof paper.questions> = {};
  for (const gpq of paper.questions) {
    const sid = gpq.paperSectionId ?? "unsorted";
    if (!questionsBySection[sid]) questionsBySection[sid] = [];
    questionsBySection[sid].push(gpq);
  }

  const sections: SectionData[] = template.sections.map((section) => {
    const sectionQs = questionsBySection[section.id] ?? [];
    const progress = progressBySection[section.id] ?? null;

    const questions: QuestionData[] = sectionQs.map((gpq) => {
      const q = gpq.question;
      const responses = responseByQuestion[q.id] ?? [];
      const mcqResponse = responses.find((r) => !r.questionPartId);
      const partResponseMap: Record<string, string> = {};
      for (const r of responses) {
        if (r.questionPartId && r.answerText) {
          partResponseMap[r.questionPartId] = r.answerText;
        }
      }

      return {
        id: q.id,
        type: q.type,
        stem: q.stem,
        difficulty: q.difficulty,
        estimatedSeconds: q.estimatedSeconds,
        sectionId: section.id,
        sortOrder: gpq.sortOrder,
        marks: gpq.marks,
        options: q.options.map((o) => ({ id: o.id, label: o.label, text: o.text })),
        parts: q.questionParts.map((p) => ({
          id: p.id,
          label: p.label,
          prompt: p.prompt,
          marks: p.marks,
          sortOrder: p.sortOrder,
          requiresGraph: p.requiresGraph,
          rubricCriteria: p.rubricCriteria.map((r) => ({
            id: r.id,
            marks: r.marks,
            criterionText: r.criterionText,
            acceptableEvidence: r.acceptableEvidence,
          })),
        })),
        savedResponse:
          mcqResponse || Object.keys(partResponseMap).length > 0
            ? {
                selectedOptionId: mcqResponse?.selectedOptionId ?? null,
                partResponses: partResponseMap,
              }
            : null,
      };
    });

    return {
      id: section.id,
      title: section.title,
      instructions: section.instructions,
      durationMinutes: section.durationMinutes,
      sortOrder: section.sortOrder,
      allowedQuestionTypes: (section.allowedQuestionTypes as string[]) ?? [],
      questions,
      progress: progress
        ? { status: progress.status, startedAt: progress.startedAt, completedAt: progress.completedAt }
        : null,
    };
  });

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      timeLimitAt: attempt.timeLimitAt,
      mode: attempt.mode,
    },
    sections,
  };
}

// ── Save Responses ───────────────────────────────────────────────────────────────

export async function saveMcqResponse(
  attemptId: string,
  questionId: string,
  selectedOptionId: string
): Promise<{ ok: boolean }> {
  const user = await getOrCreateDbUser();
  if (!user) return { ok: false };

  // Verify attempt belongs to user
  const attempt = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" },
  });
  if (!attempt) return { ok: false };

  await prisma.studentResponse.upsert({
    where: {
      // Unique on attemptId + questionId + null partId — simulate with a unique constraint
      // We use a composite approach: find then upsert manually
      id: `sr_${attemptId}_${questionId}`,
    },
    update: { selectedOptionId },
    create: {
      id: `sr_${attemptId}_${questionId}`,
      paperAttemptId: attemptId,
      questionId,
      selectedOptionId,
    },
  });

  return { ok: true };
}

export async function saveFrqPartResponse(
  attemptId: string,
  questionId: string,
  questionPartId: string,
  answerText: string
): Promise<{ ok: boolean }> {
  const user = await getOrCreateDbUser();
  if (!user) return { ok: false };

  const attempt = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" },
  });
  if (!attempt) return { ok: false };

  await prisma.studentResponse.upsert({
    where: { id: `sr_${attemptId}_${questionId}_${questionPartId}` },
    update: { answerText },
    create: {
      id: `sr_${attemptId}_${questionId}_${questionPartId}`,
      paperAttemptId: attemptId,
      questionId,
      questionPartId,
      answerText,
    },
  });

  return { ok: true };
}

// ── Complete Section ─────────────────────────────────────────────────────────────

export async function completeSection(
  attemptId: string,
  sectionId: string
): Promise<{ ok: boolean }> {
  const user = await getOrCreateDbUser();
  if (!user) return { ok: false };

  const attempt = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" },
  });
  if (!attempt) return { ok: false };

  await prisma.attemptSectionProgress.updateMany({
    where: { paperAttemptId: attemptId, paperSectionId: sectionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return { ok: true };
}

// ── Complete Attempt ─────────────────────────────────────────────────────────────

export async function completePaperAttempt(attemptId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getOrCreateDbUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const attempt = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" },
    include: { generatedPaper: { include: { questions: true } } },
  });
  if (!attempt) return { ok: false, error: "Attempt not found or already completed" };

  // Auto-grade MCQ responses
  const mcqResponses = await prisma.studentResponse.findMany({
    where: { paperAttemptId: attemptId, questionPartId: null, selectedOptionId: { not: null } },
  });

  let mcqCorrect = 0;
  for (const response of mcqResponses) {
    if (!response.selectedOptionId) continue;
    const option = await prisma.mcqOption.findUnique({ where: { id: response.selectedOptionId } });
    if (option?.isCorrect) {
      mcqCorrect++;
      await prisma.studentResponse.update({
        where: { id: response.id },
        data: { isCorrect: true, marksAwarded: 1 },
      });
    } else {
      await prisma.studentResponse.update({
        where: { id: response.id },
        data: { isCorrect: false, marksAwarded: 0 },
      });
    }
  }

  // Count FRQ questions for max score calculation
  const totalMcq = mcqResponses.length;
  const frqQuestions = attempt.generatedPaper?.questions.filter(() => true) ?? [];
  const maxScore = (attempt.generatedPaper?.questions.length ?? 0);

  await prisma.paperAttempt.update({
    where: { id: attemptId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      score: mcqCorrect,
      maxScore: totalMcq > 0 ? totalMcq : maxScore,
    },
  });

  // Mark all sections as completed
  await prisma.attemptSectionProgress.updateMany({
    where: { paperAttemptId: attemptId, status: { not: "COMPLETED" } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return { ok: true };
}
