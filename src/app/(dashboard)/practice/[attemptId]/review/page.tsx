import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Minus, ArrowLeft, BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ attemptId: string }>;
}

export default async function PracticeReviewPage({ params }: Props) {
  const user = await getOrCreateDbUser();
  if (!user) redirect("/sign-in");

  const { attemptId } = await params;

  const attempt = await prisma.paperAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      examTemplate: {
        include: { sections: { orderBy: { sortOrder: "asc" } } },
      },
      generatedPaper: {
        include: {
          questions: {
            include: {
              paperSection: true,
              question: {
                include: {
                  options: { orderBy: { sortOrder: "asc" } },
                  questionParts: {
                    orderBy: { sortOrder: "asc" },
                    include: { rubricCriteria: { orderBy: { sortOrder: "asc" } } },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!attempt) notFound();
  if (attempt.status !== "COMPLETED") redirect(`/practice/${attemptId}`);

  const responses = await prisma.studentResponse.findMany({
    where: { paperAttemptId: attemptId },
  });

  const responseByQuestion: Record<string, typeof responses[number][]> = {};
  for (const r of responses) {
    if (!responseByQuestion[r.questionId]) responseByQuestion[r.questionId] = [];
    responseByQuestion[r.questionId].push(r);
  }

  // Group paper questions by section
  const paperQuestions = attempt.generatedPaper?.questions ?? [];
  const templateSections = attempt.examTemplate?.sections ?? [];

  const sectionMap: Record<string, typeof paperQuestions> = {};
  for (const pq of paperQuestions) {
    const sectionId = pq.paperSectionId ?? "unsorted";
    if (!sectionMap[sectionId]) sectionMap[sectionId] = [];
    sectionMap[sectionId].push(pq);
  }

  // MCQ scoring
  const mcqSection = templateSections.find((s) =>
    (s.allowedQuestionTypes as string[]).includes("MCQ")
  );
  const mcqQs = mcqSection ? (sectionMap[mcqSection.id] ?? []) : [];
  const mcqTotal = mcqQs.length;
  let mcqCorrect = 0;
  for (const pq of mcqQs) {
    const rs = responseByQuestion[pq.question.id] ?? [];
    const r = rs.find((r) => !r.questionPartId);
    if (r?.isCorrect) mcqCorrect++;
  }

  const frqSection = templateSections.find((s) =>
    (s.allowedQuestionTypes as string[]).includes("FRQ_STRUCTURED")
  );
  const frqQs = frqSection ? (sectionMap[frqSection.id] ?? []) : [];
  const frqTotalPts = frqQs.reduce((sum, pq) => {
    return sum + pq.question.questionParts.reduce((ps, p) => ps + p.marks, 0);
  }, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <Link href="/practice" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Practice Tests
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Practice Test Review</h1>
        <p className="text-gray-500 mt-1">{attempt.examTemplate?.name}</p>
      </div>

      {/* Score summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-indigo-100 bg-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Section I — MCQ Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-900">
              {mcqCorrect} <span className="text-lg font-medium text-indigo-500">/ {mcqTotal}</span>
            </p>
            {mcqTotal > 0 && (
              <p className="text-sm text-indigo-600 mt-1">
                {Math.round((mcqCorrect / mcqTotal) * 100)}% correct
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Section II — FRQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-amber-900">
              Self-assessment required
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {frqTotalPts} points available. Use the rubric below to score your responses.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MCQ Review */}
      {mcqQs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Section I — Multiple Choice Review</h2>
          <div className="space-y-3">
            {mcqQs.map((pq, idx) => {
              const q = pq.question;
              const rs = responseByQuestion[q.id] ?? [];
              const r = rs.find((r) => !r.questionPartId);
              const selected = r?.selectedOptionId;
              const isCorrect = r?.isCorrect;

              return (
                <Card key={q.id} className={isCorrect ? "border-green-200" : selected ? "border-red-200" : "border-gray-200"}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-bold text-gray-500 shrink-0 mt-0.5">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{q.stem}</p>
                        <div className="space-y-1.5">
                          {q.options.map((opt) => {
                            const isSelected = selected === opt.id;
                            const isCorrectOpt = opt.isCorrect;
                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2 text-sm rounded px-2 py-1.5 ${
                                  isCorrectOpt
                                    ? "bg-green-50 text-green-800 font-medium"
                                    : isSelected && !isCorrectOpt
                                    ? "bg-red-50 text-red-800"
                                    : "text-gray-600"
                                }`}
                              >
                                <span className="font-bold w-4 shrink-0">{opt.label}</span>
                                <span className="flex-1">{opt.text}</span>
                                {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                                {isSelected && !isCorrectOpt && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                        {!selected && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Minus className="h-3 w-3" /> Not answered
                          </p>
                        )}
                        {q.explanation && (
                          <div className="mt-3 text-xs bg-blue-50 text-blue-800 border border-blue-100 rounded px-3 py-2">
                            <span className="font-semibold">Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : selected ? (
                          <XCircle className="h-5 w-5 text-red-400" />
                        ) : (
                          <Minus className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* FRQ Review with Rubric */}
      {frqQs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Section II — Free Response Review</h2>
          <p className="text-sm text-gray-500 mb-4">
            Compare your written responses to the scoring rubric below. Mark the criteria you
            satisfied to estimate your score.
          </p>

          <div className="space-y-6">
            {frqQs.map((pq, idx) => {
              const q = pq.question;
              const rs = responseByQuestion[q.id] ?? [];
              const partResponseMap: Record<string, string> = {};
              for (const r of rs) {
                if (r.questionPartId && r.answerText) {
                  partResponseMap[r.questionPartId] = r.answerText;
                }
              }
              const totalPts = q.questionParts.reduce((s, p) => s + p.marks, 0);

              return (
                <Card key={q.id}>
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        Free Response Question {idx + 1}
                      </CardTitle>
                      <Badge>{totalPts} points</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{q.stem}</p>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    {q.questionParts.map((part) => {
                      const myAnswer = partResponseMap[part.id] ?? "";

                      return (
                        <div key={part.id} className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-indigo-700">{part.label}</span>
                            <span className="text-sm text-gray-800">{part.prompt}</span>
                            <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                              {part.marks} pt{part.marks > 1 ? "s" : ""}
                            </Badge>
                          </div>

                          {/* Student's answer */}
                          <div className="bg-gray-50 rounded-lg border px-3 py-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Your answer</p>
                            {myAnswer ? (
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{myAnswer}</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">No answer provided.</p>
                            )}
                          </div>

                          {/* Rubric criteria */}
                          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 space-y-2">
                            <p className="text-xs font-semibold text-green-700 uppercase">Scoring rubric</p>
                            {part.rubricCriteria.map((criterion, ci) => (
                              <RubricCriterionCheck
                                key={criterion.id}
                                criterion={criterion}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Link href="/practice">
          <Button variant="outline">
            <BookOpen className="h-4 w-4 mr-2" />
            Take Another Test
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

// Client component for rubric self-check
function RubricCriterionCheck({
  criterion,
}: {
  criterion: { id: string; marks: number; criterionText: string; acceptableEvidence: string | null };
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-500 shrink-0"
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">
        {criterion.criterionText}
        <span className="ml-1.5 text-xs font-semibold text-green-700">
          [{criterion.marks} pt{criterion.marks > 1 ? "s" : ""}]
        </span>
      </span>
    </label>
  );
}
