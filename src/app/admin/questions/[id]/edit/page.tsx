export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditQuestionForm } from "@/components/admin/edit-question-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuestionPage({ params }: PageProps) {
  const { id } = await params;

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      topic: { include: { subject: { include: { topics: true } } } },
    },
  });

  if (!question) notFound();

  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { topics: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Question</h1>
        <p className="text-gray-500 text-sm mt-1">
          {question.topic.subject.name} — {question.topic.name}
        </p>
      </div>
      <EditQuestionForm question={question} subjects={subjects} />
    </div>
  );
}
