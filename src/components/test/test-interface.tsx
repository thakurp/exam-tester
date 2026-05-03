"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { submitAnswer, completeTestSession } from "@/app/actions/test";
import { toast } from "sonner";
import { Clock, ChevronRight, ChevronLeft, CheckSquare, Loader2, Eye, ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionDiagram } from "@/components/question/question-diagram";
import type { Question, McqOption, TestSession, Subject } from "@prisma/client";

type QuestionWithOptions = Question & {
  options: McqOption[];
  topic: { canonicalImageUrl: string | null };
};
type SessionWithSubject = TestSession & { subject: Subject };

interface TestInterfaceProps {
  session: SessionWithSubject;
  questions: QuestionWithOptions[];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TestInterface({ session, questions }: TestInterfaceProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showReview, setShowReview] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);

  // Timer
  const initialSeconds = session.timeLimitAt
    ? Math.max(0, Math.round((new Date(session.timeLimitAt).getTime() - Date.now()) / 1000))
    : null;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleComplete();
      return;
    }
    const interval = setInterval(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleSelect = async (label: string) => {
    const wasAnswered = !!answers[currentQuestion.id];
    const timeTakenMs = Date.now() - questionStartTime;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: label }));

    setSubmitting(true);
    try {
      await submitAnswer({
        sessionId: session.id,
        questionId: currentQuestion.id,
        selectedOption: label,
        timeTakenMs,
      });
    } catch {
      toast.error("Failed to save answer. Please try again.");
    } finally {
      setSubmitting(false);
    }

    // Auto advance on first answer in exam mode after brief delay
    if (!wasAnswered && session.mode === "EXAM" && currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setQuestionStartTime(Date.now());
      }, 400);
    }
  };

  const handleOpenReview = () => {
    setShowReview(true);
    setReturnToReview(false);
  };

  const handleJumpToQuestion = (idx: number) => {
    setShowReview(false);
    setReturnToReview(true);
    setCurrentIndex(idx);
    setQuestionStartTime(Date.now());
  };

  const handleComplete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const result = await completeTestSession(session.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push(`/test/${session.id}/review`);
    } catch {
      toast.error("Failed to complete test. Please try again.");
      setCompleting(false);
    }
  }, [session.id, router, completing]);

  const difficultyColor = {
    EASY: "text-green-600 bg-green-50",
    MEDIUM: "text-amber-600 bg-amber-50",
    HARD: "text-red-600 bg-red-50",
  };

  if (showReview) {
    return (
      <TestReviewPanel
        questions={questions}
        answers={answers}
        onClose={() => setShowReview(false)}
        onJumpTo={handleJumpToQuestion}
        onSubmit={handleComplete}
        completing={completing}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{session.subject.name}</p>
            <Progress value={(answeredCount / totalQuestions) * 100} className="h-1.5 mt-1" />
          </div>
          <div className="text-sm text-gray-500 shrink-0">
            {answeredCount}/{totalQuestions}
          </div>
          {secondsLeft !== null && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm font-mono font-medium px-3 py-1 rounded-full shrink-0",
                secondsLeft < 60 ? "text-red-600 bg-red-50" : "text-gray-700 bg-gray-100"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(secondsLeft)}
            </div>
          )}
          {returnToReview ? (
            <Button size="sm" variant="outline" onClick={handleOpenReview} className="gap-1 shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Review
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleOpenReview} className="gap-1 shrink-0">
              <Eye className="h-3.5 w-3.5" /> Review
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Question card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-400">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  difficultyColor[currentQuestion.difficulty]
                )}
              >
                {currentQuestion.difficulty.charAt(0) + currentQuestion.difficulty.slice(1).toLowerCase()}
              </Badge>
            </div>
            <div>
            <p className="text-base sm:text-lg font-medium leading-relaxed text-gray-900 break-words">
              {currentQuestion.stem}
            </p>
            <QuestionDiagram
              svgData={currentQuestion.diagramSvg}
              diagramType={currentQuestion.diagramType}
              canonicalImageUrl={currentQuestion.topic.canonicalImageUrl}
            />
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option) => {
            const selected = answers[currentQuestion.id] === option.label;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.label)}
                disabled={!!answers[currentQuestion.id] || submitting}
                className={cn(
                  "w-full text-left px-4 sm:px-5 py-3 sm:py-4 min-h-[52px] rounded-xl border-2 transition-all text-sm font-medium break-words touch-manipulation",
                  selected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : answers[currentQuestion.id]
                      ? "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
                )}
              >
                <span className="font-bold mr-3 text-indigo-400">{option.label}.</span>
                {option.text}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentIndex((i) => Math.max(0, i - 1));
              setQuestionStartTime(Date.now());
            }}
            disabled={currentIndex === 0}
            className="touch-manipulation"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          {returnToReview ? (
            <Button variant="outline" onClick={handleOpenReview} className="touch-manipulation gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Review
            </Button>
          ) : currentIndex < totalQuestions - 1 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentIndex((i) => i + 1);
                setQuestionStartTime(Date.now());
              }}
              className="touch-manipulation"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleOpenReview}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto touch-manipulation gap-2"
            >
              <Eye className="h-4 w-4" /> Review & Submit
            </Button>
          )}
        </div>

        {/* Question grid */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-400 mb-2">Jump to question:</p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentIndex(i);
                  setQuestionStartTime(Date.now());
                }}
                className={cn(
                  "h-9 w-9 rounded text-xs font-medium transition-all touch-manipulation",
                  i === currentIndex
                    ? "bg-indigo-600 text-white"
                    : answers[q.id]
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Review Panel ─────────────────────────────────────────────────────────────

function TestReviewPanel({
  questions,
  answers,
  onClose,
  onJumpTo,
  onSubmit,
  completing,
}: {
  questions: QuestionWithOptions[];
  answers: Record<string, string>;
  onClose: () => void;
  onJumpTo: (idx: number) => void;
  onSubmit: () => void;
  completing: boolean;
}) {
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to exam
          </button>
          <Button
            onClick={onSubmit}
            disabled={completing}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Send className="h-4 w-4" />
            {completing ? "Submitting\u2026" : "Confirm & Submit"}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold text-gray-800">
            {answeredCount} of {totalQuestions} answered
          </p>
          {unansweredCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {unansweredCount} question{unansweredCount > 1 ? "s" : ""} not yet answered — you can still submit.
            </p>
          )}
        </div>

        {/* Answer sheet */}
        <div className="bg-white rounded-xl border overflow-hidden divide-y">
          {questions.map((q, idx) => {
            const selectedLabel = answers[q.id];
            const selectedOpt = q.options.find((o) => o.label === selectedLabel);
            return (
              <div key={q.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    selectedLabel
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-600"
                  )}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    {q.stem.length > 80 ? q.stem.slice(0, 80) + "\u2026" : q.stem}
                  </p>
                  {selectedOpt ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-semibold">{selectedOpt.label}.</span>{" "}
                      {selectedOpt.text.length > 60
                        ? selectedOpt.text.slice(0, 60) + "\u2026"
                        : selectedOpt.text}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">Not answered</p>
                  )}
                </div>
                <button
                  onClick={() => onJumpTo(idx)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-2"
                >
                  {selectedLabel ? "Change" : "Answer"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom submit */}
        <Button
          onClick={onSubmit}
          disabled={completing}
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          <Send className="h-4 w-4" />
          {completing ? "Submitting\u2026" : "Confirm & Submit"}
        </Button>
      </div>
    </div>
  );
}
