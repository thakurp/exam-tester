"use server";

import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";

export async function toggleFavoriteSubject(subjectId: string) {
  const user = await getOrCreateDbUser();
  if (!user) return { error: "Unauthorized" };

  const existing = await prisma.userFavoriteSubject.findUnique({
    where: { userId_subjectId: { userId: user.id, subjectId } },
  });

  if (existing) {
    await prisma.userFavoriteSubject.delete({
      where: { userId_subjectId: { userId: user.id, subjectId } },
    });
    return { favorited: false };
  } else {
    await prisma.userFavoriteSubject.create({
      data: { userId: user.id, subjectId },
    });
    return { favorited: true };
  }
}
