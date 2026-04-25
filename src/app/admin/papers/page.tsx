export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Users, CheckCircle2 } from "lucide-react";

export default async function AdminPapersPage() {
  await requireAdmin();

  const templates = await prisma.examTemplate.findMany({
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      examSpecification: { include: { examProgram: true } },
      _count: { select: { paperAttempts: true, generatedPapers: true } },
    },
    orderBy: { year: "desc" },
  });

  const recentPapers = await prisma.generatedPaper.findMany({
    include: {
      examTemplate: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Papers</h1>
        <p className="text-gray-500 mt-1">Manage exam templates and generated practice papers.</p>
      </div>

      {/* Exam Templates */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Exam Templates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge
                    className={
                      t.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {t.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{t.examSpecification.examProgram.name}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {t.totalDurationMinutes} min
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    {t.totalMarks} marks
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {t._count.paperAttempts} attempts
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                    {t._count.generatedPapers} papers
                  </div>
                </div>

                <div className="space-y-1 border-t pt-2">
                  {t.sections.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs text-gray-500">
                      <span>{s.title}</span>
                      <span>
                        {s.questionCount}Q · {s.durationMinutes}min · {s.marks}pts
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-400 pt-1">
                  Template ID: <code className="font-mono">{t.id}</code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Generated Papers */}
      {recentPapers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Generated Papers</h2>
          <div className="space-y-2">
            {recentPapers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border text-sm"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {p._count.questions} questions ·{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Badge
                  className={
                    p.approvalStatus === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {p.approvalStatus}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">
            <p className="font-medium">No exam templates found.</p>
            <p className="text-sm mt-1">Run the database seed to create AP Macro and AP Micro templates.</p>
            <code className="block mt-2 text-xs bg-gray-100 rounded px-3 py-2 w-fit mx-auto">
              node node_modules\tsx\dist\cli.mjs prisma\seed.ts
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
