export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TestInterface } from "@/components/test/test-interface";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function TakeTestPage({ params }: PageProps) {
  const { sessionId } = await params;
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { subject: true },
  });

  if (!session) notFound();
  if (session.completedAt) redirect(`/test/${sessionId}/review`);

  const config = session.config as {
    questionIds: string[];
    timeLimitMinutes: number;
  };

  const questions = await prisma.question.findMany({
    where: { id: { in: config.questionIds } },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  // Preserve order from config
  const orderedQuestions = config.questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as typeof questions;

  return (
    <TestInterface
      session={session}
      questions={orderedQuestions}
      userId={user.id}
    />
  );
}
