export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { QuestionsClient } from "@/components/admin/questions-client";
import { PlusCircle } from "lucide-react";
import type { QuestionStatus } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ status?: string; subject?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function QuestionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = (sp.status?.toUpperCase() ?? "PUBLISHED") as QuestionStatus;
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const where = {
    status,
    ...(sp.subject ? { subjectId: sp.subject } : {}),
  };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { topic: { include: { subject: true } } },
    }),
    prisma.question.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusOptions: QuestionStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString()} questions</p>
        </div>
        <Button asChild>
          <Link href="/admin/questions/new">
            <PlusCircle className="h-4 w-4 mr-2" /> Add Question
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {statusOptions.map((s) => (
          <Link key={s} href={`/admin/questions?status=${s}`}>
            <Badge
              variant={status === s ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              {s}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Questions table */}
      <QuestionsClient questions={questions} status={status} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <Link key={i + 1} href={`/admin/questions?status=${status}&page=${i + 1}`}>
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
