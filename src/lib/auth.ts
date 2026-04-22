import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function getCurrentDbUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.user.findUnique({ where: { clerkId: userId } });
}

export async function getOrCreateDbUser(): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");
  const role =
    (clerkUser.publicMetadata?.role as string) === "ADMIN"
      ? "ADMIN"
      : (clerkUser.publicMetadata?.role as string) === "PARENT"
        ? "PARENT"
        : "STUDENT";

  try {
    // Handle case where a user with this email already exists under a different clerkId
    // (e.g. after switching from dev to production Clerk instance)
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail && existingByEmail.clerkId !== clerkUser.id) {
      return prisma.user.update({
        where: { email },
        data: {
          clerkId: clerkUser.id,
          name: name || null,
          avatarUrl: clerkUser.imageUrl || null,
          role,
        },
      });
    }

    return await prisma.user.upsert({
      where: { clerkId: clerkUser.id },
      update: {
        email,
        name: name || null,
        avatarUrl: clerkUser.imageUrl || null,
        role,
      },
      create: {
        clerkId: clerkUser.id,
        email,
        name: name || null,
        avatarUrl: clerkUser.imageUrl || null,
        role,
      },
    });
  } catch (err) {
    console.error("[getOrCreateDbUser] DB error:", err);
    throw err;
  }
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}
