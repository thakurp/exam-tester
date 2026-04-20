import { prisma } from "@/lib/prisma";
import type { PointsEventType } from "@prisma/client";

export interface AwardPointsParams {
  userId: string;
  amount: number;
  type: PointsEventType;
  refId?: string;
  notes?: string;
}

export async function awardPoints(params: AwardPointsParams): Promise<void> {
  const { userId, amount, type, refId, notes } = params;

  // Ensure streak record exists
  await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: new Date(),
      totalPoints: 0,
    },
    update: {},
  });

  // Create immutable ledger entry + update denormalized balance atomically
  await prisma.$transaction([
    prisma.pointsLedger.create({
      data: { userId, amount, type, refId, notes },
    }),
    prisma.streak.update({
      where: { userId },
      data: { totalPoints: { increment: amount } },
    }),
  ]);
}

export async function getUserBalance(userId: string): Promise<number> {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  return streak?.totalPoints ?? 0;
}

export async function updateStreak(userId: string): Promise<void> {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!streak) {
    await prisma.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        totalPoints: 0,
      },
    });
    return;
  }

  const lastActivity = streak.lastActivityDate
    ? new Date(streak.lastActivityDate)
    : null;
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  const todayMs = today.getTime();
  const lastMs = lastActivity?.getTime() ?? 0;
  const dayDiff = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));

  let newStreak: number;
  if (dayDiff === 0) {
    // Already active today
    return;
  } else if (dayDiff === 1) {
    newStreak = streak.currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, streak.longestStreak);
  const isStreakMilestone = newStreak > 0 && newStreak % 7 === 0;

  await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: today,
    },
  });

  // Bonus points for 7-day streaks
  if (isStreakMilestone) {
    await awardPoints({
      userId,
      amount: 100,
      type: "STREAK_BONUS",
      notes: `${newStreak}-day streak bonus`,
    });
  }
}
