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
  searchParams: Promise<{ status?: string; subject?: string; topic?: string; page?: string; diagramFilter?: string }>;
}

const PAGE_SIZE = 20;

export default async function QuestionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status?.toUpperCase() ?? "PUBLISHED") as QuestionStatus;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const selectedSubject = sp.subject ?? null;
  const selectedTopic = sp.topic ?? null;
  const diagramFilter = sp.diagramFilter ?? null; // null | "classified" | "unclassified"

  // Build URL param helper (preserves all active filters)
  function buildUrl(overrides: Record<string, string | null>) {
    const params: Record<string, string> = {
      status,
      ...(selectedSubject ? { subject: selectedSubject } : {}),
      ...(selectedTopic ? { topic: selectedTopic } : {}),
      ...(diagramFilter ? { diagramFilter } : {}),
      ...Object.fromEntries(
        Object.entries(overrides).filter(([, v]) => v !== null) as [string, string][]
      ),
    };
    // Remove keys explicitly set to null
    Object.entries(overrides).forEach(([k, v]) => { if (v === null) delete params[k]; });
    return "/admin/questions?" + new URLSearchParams(params).toString();
  }

  // Diagram classification filter
  const diagramWhere =
    diagramFilter === "classified"
      ? { NOT: { diagramStatus: "NONE" } }
      : diagramFilter === "unclassified"
        ? { diagramType: "NONE", diagramStatus: "NONE" }
        : {};

  // Question filter — subject/topic are via topic relation, not direct fields
  const where = {
    status,
    ...(selectedTopic
      ? { topicId: selectedTopic }
      : selectedSubject
        ? { topic: { subjectId: selectedSubject } }
        : {}),
    ...diagramWhere,
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
          <Link key={s} href={buildUrl({ status: s, page: null })}>
            <Badge
              variant={status === s ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              {s}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Diagram classification filter (only on Published tab) */}
      {status === "PUBLISHED" && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-400 mr-1 shrink-0">Diagram:</span>
          <Link href={buildUrl({ diagramFilter: null, page: null })}>
            <Badge variant={!diagramFilter ? "default" : "outline"} className="cursor-pointer px-3 py-1 text-xs">
              All
            </Badge>
          </Link>
          <Link href={buildUrl({ diagramFilter: "classified", page: null })}>
            <Badge
              variant={diagramFilter === "classified" ? "default" : "outline"}
              className={cn("cursor-pointer px-3 py-1 text-xs", diagramFilter === "classified" && "bg-green-600 hover:bg-green-700")}
            >
              Classified
            </Badge>
          </Link>
          <Link href={buildUrl({ diagramFilter: "unclassified", page: null })}>
            <Badge
              variant={diagramFilter === "unclassified" ? "default" : "outline"}
              className={cn("cursor-pointer px-3 py-1 text-xs", diagramFilter === "unclassified" && "bg-amber-600 hover:bg-amber-700")}
            >
              Not Classified
            </Badge>
          </Link>
        </div>
      )}

      {/* Subject filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400 mr-1 shrink-0">Subject:</span>
        <Link href={buildUrl({ subject: null, topic: null, page: null })}>
          <Badge
            variant={!selectedSubject ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-xs"
          >
            All
          </Badge>
        </Link>
        {subjects.map((s) => (
          <Link key={s.id} href={buildUrl({ subject: s.id, topic: null, page: null })}>
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
            Topics in this subject ({status.toLowerCase()}) — click to filter
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {topicCounts.map((t) => {
              const isSelected = selectedTopic === t.id;
              return (
                <Link
                  key={t.id}
                  href={
                    isSelected
                      ? buildUrl({ topic: null, page: null })
                      : buildUrl({ topic: t.id, page: null })
                  }
                  title={t.name}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : t._count.questions === 0
                        ? "bg-white border-gray-100 text-gray-400 cursor-default pointer-events-none"
                        : "bg-white border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer"
                  )}
                >
                  <span className="truncate pr-2">{t.name}</span>
                  <span
                    className={cn(
                      "font-semibold shrink-0 tabular-nums text-xs",
                      isSelected ? "text-white" : t._count.questions === 0 ? "text-gray-300" : "text-indigo-600"
                    )}
                  >
                    {t._count.questions}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions table */}
      <QuestionsClient questions={questions} status={status} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Link key={i + 1} href={buildUrl({ page: String(i + 1) })}>
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
