export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { ManualQuestionForm } from "@/components/admin/manual-question-form";

export default async function NewQuestionPage() {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { topics: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Question</h1>
        <p className="text-gray-500 mt-1">Add a question manually with 4 MCQ options.</p>
      </div>
      <ManualQuestionForm subjects={subjects} />
    </div>
  );
}
