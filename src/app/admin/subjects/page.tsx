export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubjectsClient } from "@/components/admin/subjects-client";

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      topics: {
        orderBy: { name: "asc" },
        include: { _count: { select: { questions: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subjects & Topics</h1>
        <p className="text-gray-500 text-sm mt-1">Manage subjects and their topics</p>
      </div>
      <SubjectsClient subjects={subjects} />
    </div>
  );
}
