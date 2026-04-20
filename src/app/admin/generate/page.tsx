export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { GenerateClient } from "@/components/admin/generate-client";

export default async function GeneratePage() {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { topics: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Question Generation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate draft questions using AI. Review them in the Questions page before publishing.
        </p>
      </div>
      <GenerateClient subjects={subjects} />
    </div>
  );
}
