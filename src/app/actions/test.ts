"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";
import { awardPoints, updateStreak } from "@/lib/points";
import type { Difficulty } from "@prisma/client";

interface CreateTestSessionParams {
  subjectId: string;
  topicIds: string[];
  questionCount: number;
  timeLimitMinutes: number;
  difficulties: string[];
  mode: "EXAM" | "PRACTICE";
}

export async function createTestSession(params: CreateTestSessionParams) {
  const user = await getOrCreateDbUser();
  if (!user) return { error: "Unauthorized" };
  const userId = user.id;

  const { subjectId, topicIds, questionCount, timeLimitMinutes, difficulties, mode } = params;

  // Resolve topics
  let resolvedTopicIds = topicIds;
  if (topicIds.length === 0) {
    const allTopics = await prisma.topic.findMany({
      where: { subjectId, isActive: true },
      select: { id: true },
    });
    resolvedTopicIds = allTopics.map((t) => t.id);
  }

  if (resolvedTopicIds.length === 0) {
    return { error: "No topics found for this subject." };
  }

  // Count available questions
  const available = await prisma.question.count({
    where: {
      topicId: { in: resolvedTopicIds },
      status: "PUBLISHED",
      difficulty: { in: difficulties as Difficulty[] },
    },
  });

  if (available === 0) {
    return { error: "No published questions found for these settings. Try different topics or difficulty levels." };
  }

  const actualCount = Math.min(questionCount, available);

  // Pick questions via random sampling (PostgreSQL TABLESAMPLE or ORDER BY RANDOM)
  const questions = await prisma.question.findMany({
    where: {
      topicId: { in: resolvedTopicIds },
      status: "PUBLISHED",
      difficulty: { in: difficulties as Difficulty[] },
    },
    select: { id: true },
    take: actualCount * 3, // Over-fetch for shuffle
  });

  // Fisher-Yates shuffle
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, actualCount).map((q) => q.id);

  const timeLimitAt =
    timeLimitMinutes > 0
      ? new Date(Date.now() + timeLimitMinutes * 60 * 1000)
      : null;

  const session = await prisma.testSession.create({
    data: {
      userId,
      subjectId,
      mode,
      config: {
        topicIds: resolvedTopicIds,
        questionIds: selectedIds,
        questionCount: actualCount,
        timeLimitMinutes,
        difficulties,
      },
      timeLimitAt,
      totalQuestions: actualCount,
    },
  });

  return { sessionId: session.id };
}

interface SubmitAnswerParams {
  sessionId: string;
  questionId: string;
  selectedOption?: string;
  answerText?: string;
  timeTakenMs?: number;
}

export async function submitAnswer(params: SubmitAnswerParams) {
  const { sessionId, questionId, selectedOption, answerText, timeTakenMs } = params;

  // Derive authenticated user server-side — never trust client-supplied identity
  const user = await getOrCreateDbUser();
  if (!user) return { error: "Unauthorized" };
  const userId = user.id;

  // Verify session belongs to the authenticated user
  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId, completedAt: null },
  });
  if (!session) return { error: "Session not found or already completed" };

  // Validate the question is part of this session's question set
  const config = session.config as { questionIds?: string[] };
  if (config.questionIds && !config.questionIds.includes(questionId)) {
    return { error: "Question does not belong to this session" };
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });
  if (!question) return { error: "Question not found" };

  // Check correctness
  let isCorrect = false;
  if (question.type === "MCQ" && selectedOption) {
    const correctOption = question.options.find((o) => o.isCorrect);
    isCorrect = correctOption?.label === selectedOption;
  } else if (question.type === "TRUE_FALSE" && selectedOption) {
    isCorrect = question.correctAnswer === selectedOption;
  }

  const pointsMap: Record<string, number> = {
    EASY: question.pointsEasy,
    MEDIUM: question.pointsMedium,
    HARD: question.pointsHard,
  };
  const pointsAwarded = isCorrect ? (pointsMap[question.difficulty] ?? 10) : 0;

  // Read existing answer before upsert to make points awarding idempotent
  const existingAnswer = await prisma.userAnswer.findUnique({
    where: { sessionId_questionId: { sessionId, questionId } },
    select: { isCorrect: true },
  });
  const wasAlreadyCorrect = existingAnswer?.isCorrect === true;

  await prisma.userAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: {
      sessionId,
      questionId,
      selectedOption,
      answerText,
      isCorrect,
      timeTakenMs,
      pointsAwarded,
    },
    update: {
      selectedOption,
      answerText,
      isCorrect,
      timeTakenMs,
      pointsAwarded,
    },
  });

  // Award points only once per question — not on re-submissions that were already correct
  if (isCorrect && pointsAwarded > 0 && !wasAlreadyCorrect) {
    await awardPoints({
      userId,
      amount: pointsAwarded,
      type: "CORRECT_ANSWER",
      refId: sessionId,
      notes: `Correct answer — ${question.difficulty}`,
    });
  }

  return { isCorrect, pointsAwarded };
}

export async function completeTestSession(sessionId: string) {
  // Derive authenticated user server-side
  const user = await getOrCreateDbUser();
  if (!user) return { error: "Unauthorized" };
  const userId = user.id;

  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId },
    include: { userAnswers: true },
  });
  if (!session) return { error: "Session not found" };
  if (session.completedAt) return { sessionId }; // Already completed

  const correctCount = session.userAnswers.filter((a) => a.isCorrect).length;
  const total = session.totalQuestions ?? session.userAnswers.length;
  const scorePercent = total > 0 ? (correctCount / total) * 100 : 0;

  await prisma.testSession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      correctCount,
      scorePercent,
    },
  });

  // Update streak
  await updateStreak(userId);

  return { sessionId, correctCount, total, scorePercent };
}
