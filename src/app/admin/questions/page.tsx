export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { QuestionsClient } from "@/components/admin/questions-client";
import { ClassifyDiagramsButton } from "@/components/admin/classify-diagrams-button";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; subject?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function QuestionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status?.toUpperCase() ?? "PUBLISHED") as QuestionStatus;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const selectedSubject = sp.subject ?? null;

  // Question filter — subject is via topic relation, not a direct field
  const where = {
    status,
    ...(selectedSubject ? { topic: { subjectId: selectedSubject } } : {}),
  };

  const [questions, total, unclassifiedCount, subjects, topicCounts] =
    await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: { topic: { include: { subject: true } } },
      }),
      prisma.question.count({ where }),
      status === "PUBLISHED"
        ? prisma.question.count({
            where: {
              status: "PUBLISHED",
              diagramType: "NONE",
              diagramStatus: "NONE",
              diagramSvg: null,
            },
          })
        : Promise.resolve(0),
      // All active subjects for the filter row
      prisma.subject.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
      // Per-topic counts for the selected subject (null if no subject chosen)
      selectedSubject
        ? prisma.topic.findMany({
            where: { subjectId: selectedSubject },
            select: {
              id: true,
              name: true,
              _count: { select: { questions: { where: { status } } } },
            },
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve(null),
    ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const statusOptions: QuestionStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} questions</p>
        </div>
        <div className="flex items-center gap-2">
          {unclassifiedCount > 0 && (
            <ClassifyDiagramsButton unclassifiedCount={unclassifiedCount} />
          )}
          <Button asChild>
            <Link href="/admin/questions/new">
              <PlusCircle className="h-4 w-4 mr-2" /> Add Question
            </Link>
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {statusOptions.map((s) => (
          <Link
            key={s}
            href={`/admin/questions?status=${s}${selectedSubject ? `&subject=${selectedSubject}` : ""}`}
          >
            <Badge
              variant={status === s ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              {s}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Subject filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400 mr-1 shrink-0">Subject:</span>
        <Link href={`/admin/questions?status=${status}`}>
          <Badge
            variant={!selectedSubject ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-xs"
          >
            All
          </Badge>
        </Link>
        {subjects.map((s) => (
          <Link key={s.id} href={`/admin/questions?status=${status}&subject=${s.id}`}>
            <Badge
              variant={selectedSubject === s.id ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-3 py-1 text-xs",
                selectedSubject === s.id && "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {s.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Per-topic breakdown (only when a subject is selected) */}
      {topicCounts && topicCounts.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Topics in this subject ({status.toLowerCase()})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {topicCounts.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <span className="text-gray-700 truncate pr-2" title={t.name}>
                  {t.name}
                </span>
                <span
                  className={cn(
                    "font-semibold shrink-0 tabular-nums",
                    t._count.questions === 0 ? "text-gray-300" : "text-indigo-600"
                  )}
                >
                  {t._count.questions}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions table */}
      <QuestionsClient questions={questions} status={status} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Link
              key={i + 1}
              href={`/admin/questions?status=${status}${selectedSubject ? `&subject=${selectedSubject}` : ""}&page=${i + 1}`}
            >
              <Badge
                variant={page === i + 1 ? "default" : "outline"}
                className="cursor-pointer"
              >
                {i + 1}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
