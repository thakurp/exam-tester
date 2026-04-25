export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, FileText, ArrowRight, BookOpen } from "lucide-react";
import { StartPracticeButton } from "@/components/practice/start-practice-button";

export default async function PracticePage() {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const templates = await prisma.examTemplate.findMany({
    where: { status: "APPROVED" },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      examSpecification: { include: { examProgram: true } },
      _count: { select: { paperAttempts: true } },
    },
    orderBy: { year: "desc" },
  });

  // Get user's recent paper attempts
  const recentAttempts = await prisma.paperAttempt.findMany({
    where: { userId: user.id },
    include: { examTemplate: true },
    orderBy: { startedAt: "desc" },
    take: 5,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Real Practice Tests</h1>
        <p className="text-gray-500 mt-1">
          Full exam simulations with timed sections, free-response questions, and rubric-based review.
        </p>
      </div>

      {/* Available Templates */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Available Exams</h2>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No practice tests available yet.</p>
              <p className="text-sm mt-1">An admin needs to approve exam templates first.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{t.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {t.examSpecification.examProgram.name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Section breakdown */}
                  <div className="space-y-1.5">
                    {t.sections.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium">{s.title}:</span>
                        <span>
                          {s.questionCount} questions, {s.durationMinutes} min
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {t.totalDurationMinutes} min total
                    </span>
                    {t.year && <span>Year {t.year}</span>}
                  </div>

                  {t.instructions && (
                    <p className="text-xs text-gray-500 border-t pt-2">{t.instructions}</p>
                  )}

                  <StartPracticeButton examTemplateId={t.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Recent Attempts</h2>
          <div className="space-y-2">
            {recentAttempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border hover:border-indigo-200 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{a.examTemplate?.name ?? "Practice Test"}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(a.startedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {a.completedAt && a.score != null && (
                      <span className="ml-2 text-green-600 font-medium">
                        Score: {a.score}/{a.maxScore} MCQ
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      a.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {a.status === "COMPLETED" ? "Completed" : "In Progress"}
                  </Badge>
                  <Link
                    href={
                      a.status === "COMPLETED"
                        ? `/practice/${a.id}/review`
                        : `/practice/${a.id}`
                    }
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {a.status === "COMPLETED" ? "Review" : "Continue"}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
