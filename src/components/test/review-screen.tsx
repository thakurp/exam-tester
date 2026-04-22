"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Brain, Loader2, ChevronDown, ChevronUp, ArrowLeft, RotateCcw } from "lucide-react";
import type { Question, McqOption, UserAnswer, TestSession, Subject, Topic } from "@prisma/client";

type FullAnswer = UserAnswer & {
  question: Question & { options: McqOption[]; topic: Topic };
};
type SessionWithSubject = TestSession & { subject: Subject };

interface ReviewScreenProps {
  session: SessionWithSubject;
  answers: FullAnswer[];
  userId: string;
}

interface ExplanationResponse {
  explanation: string;
  keyPoints: string[];
  steps?: string[];
  commonMistakes?: string[];
  fromCache: boolean;
}

function ExplainButton({ questionId }: { questionId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExplanationResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = async () => {
    if (data) {
      setOpen((o) => !o);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/explain/${questionId}`);
      if (!res.ok) throw new Error("Failed to get explanation");
      const json = await res.json();
      setData(json);
      setOpen(true);
    } catch {
      setError("Could not load explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50"
        onClick={handleExplain}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Getting explanation...</>
        ) : (
          <>
            <Brain className="h-3.5 w-3.5" />
            Explain Me
            {data && (open ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </>
        )}
      </Button>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {data && open && (
        <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-600 flex-shrink-0" />
            <span className="text-xs font-medium text-violet-600">
              AI Explanation {data.fromCache && <span className="opacity-60">(cached)</span>}
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{data.explanation}</p>
          {data.keyPoints?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Key Points</p>
              <ul className="space-y-1">
                {data.keyPoints.map((point, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-violet-400 font-bold">•</span> {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.steps && data.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Steps</p>
              <ol className="space-y-1">
                {data.steps.map((step, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-violet-500 font-bold text-xs mt-0.5">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {data.commonMistakes && data.commonMistakes.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Common Mistakes</p>
              <ul className="space-y-1">
                {data.commonMistakes.map((m, i) => (
                  <li key={i} className="text-xs text-amber-800">⚠️ {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewScreen({ session, answers, userId }: ReviewScreenProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect">("all");

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const filteredAnswers = answers.filter((a) => {
    if (filter === "correct") return a.isCorrect;
    if (filter === "incorrect") return !a.isCorrect;
    return true;
  });

  const scoreColor =
    scorePercent >= 80
      ? "text-green-600"
      : scorePercent >= 60
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="space-y-8">
      {/* Score card */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="text-center">
              <div className={cn("text-6xl font-bold", scoreColor)}>{scorePercent}%</div>
              <p className="text-gray-500 text-sm mt-1">
                {correctCount} / {total} correct
              </p>
            </div>
            <div className="flex-1 w-full">
              <Progress value={scorePercent} className="h-3 mb-4" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                  <p className="text-xs text-gray-500">Correct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{total - correctCount}</p>
                  <p className="text-xs text-gray-500">Incorrect</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">
                    {answers.reduce((acc, a) => acc + a.pointsAwarded, 0)}
                  </p>
                  <p className="text-xs text-gray-500">XP earned</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/test/new?subject=${session.subjectId}`}>
                <RotateCcw className="h-4 w-4 mr-1" /> Retake
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(["all", "correct", "incorrect"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {f === "all" ? `All (${total})` : f === "correct" ? `Correct (${correctCount})` : `Incorrect (${total - correctCount})`}
          </button>
        ))}
      </div>

      {/* Question review */}
      <div className="space-y-4">
        {filteredAnswers.map((answer, idx) => {
          const q = answer.question;
          const correctOption = q.options.find((o) => o.isCorrect);

          return (
            <Card
              key={answer.id}
              className={cn(
                "border-l-4",
                answer.isCorrect ? "border-l-green-500" : "border-l-red-400"
              )}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">Q{idx + 1}</span>
                      <Badge variant="outline" className="text-xs">{q.topic.name}</Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          q.difficulty === "EASY"
                            ? "text-green-600 bg-green-50"
                            : q.difficulty === "MEDIUM"
                              ? "text-amber-600 bg-amber-50"
                              : "text-red-600 bg-red-50"
                        )}
                      >
                        {q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{q.stem}</p>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-1.5 ml-8">
                  {q.options.map((opt) => {
                    const isSelected = answer.selectedOption === opt.label;
                    const isCorrectOpt = opt.isCorrect;
                    return (
                      <div
                        key={opt.id}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-lg text-sm",
                          isCorrectOpt
                            ? "bg-green-50 text-green-800 font-medium"
                            : isSelected && !isCorrectOpt
                              ? "bg-red-50 text-red-700"
                              : "text-gray-600"
                        )}
                      >
                        <span className="font-bold w-4 shrink-0 mt-0.5">{opt.label}.</span>
                        <span className="flex-1 break-words">{opt.text}</span>
                        {isCorrectOpt && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />}
                        {isSelected && !isCorrectOpt && <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>

                {/* Explain Me button */}
                <div className="ml-8">
                  <ExplainButton questionId={q.id} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
