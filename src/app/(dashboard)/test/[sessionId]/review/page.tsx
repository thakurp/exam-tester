export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewScreen } from "@/components/test/review-screen";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ReviewPage({ params }: PageProps) {
  const { sessionId } = await params;
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const session = await prisma.testSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: { subject: true },
  });

  if (!session) notFound();

  const answers = await prisma.userAnswer.findMany({
    where: { sessionId },
    include: {
      question: {
        include: {
          options: { orderBy: { sortOrder: "asc" } },
          topic: true,
        },
      },
    },
  });

  const config = session.config as { questionIds: string[] };
  const orderedAnswers = config.questionIds
    .map((id) => answers.find((a) => a.questionId === id))
    .filter(Boolean) as typeof answers;

  return (
    <ReviewScreen
      session={session}
      answers={orderedAnswers}
      userId={user.id}
    />
  );
}
