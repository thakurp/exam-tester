export const dynamic = "force-dynamic";
import { redirect, notFound } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TestConfigForm } from "@/components/test/test-config-form";

interface PageProps {
  searchParams: Promise<{ subject?: string }>;
}

export default async function NewTestPage({ searchParams }: PageProps) {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const { subject: subjectId } = await searchParams;

  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      topics: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  const selectedSubject = subjectId
    ? subjects.find((s) => s.id === subjectId)
    : subjects[0];

  if (!selectedSubject) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create a test</h1>
        <p className="text-gray-500 mt-1">Configure your practice session</p>
      </div>
      <TestConfigForm subjects={subjects} initialSubject={selectedSubject} />
    </div>
  );
}
