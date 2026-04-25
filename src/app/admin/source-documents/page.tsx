export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { SourceDocumentsClient } from "@/components/admin/source-documents-client";

export default async function SourceDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 50;

  const where = {
    ...(params.program ? { examProgram: { code: params.program } } : {}),
    ...(params.status ? { extractionStatus: params.status as never } : {}),
  };

  const [docs, total, programs] = await Promise.all([
    prisma.sourceDocument.findMany({
      where,
      orderBy: [{ year: "desc" }, { fileName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { examProgram: { select: { code: true, name: true } } },
    }),
    prisma.sourceDocument.count({ where }),
    prisma.examProgram.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true },
    }),
  ]);

  const statusCounts = await prisma.sourceDocument.groupBy({
    by: ["extractionStatus"],
    _count: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Source Documents</h1>
        <p className="text-gray-500 text-sm mt-1">
          {total.toLocaleString()} registered documents — official papers, guidelines, and rubrics
          used to inform blueprints and question generation.
        </p>
      </div>
      <SourceDocumentsClient
        docs={docs as never}
        total={total}
        page={page}
        pageSize={pageSize}
        programs={programs}
        statusCounts={statusCounts.map((s) => ({ status: s.extractionStatus, count: s._count }))}
        currentProgram={params.program}
        currentStatus={params.status}
      />
    </div>
  );
}
