import { redirect, notFound } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { loadPaperAttempt } from "@/app/actions/paper-attempt";
import { PracticeInterface } from "@/components/practice/practice-interface";

interface Props {
  params: Promise<{ attemptId: string }>;
}

export default async function PracticeAttemptPage({ params }: Props) {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const { attemptId } = await params;
  const data = await loadPaperAttempt(attemptId);

  if (!data) notFound();

  if (data.attempt.status === "COMPLETED") {
    redirect(`/practice/${attemptId}/review`);
  }

  return <PracticeInterface data={data} attemptId={attemptId} />;
}
