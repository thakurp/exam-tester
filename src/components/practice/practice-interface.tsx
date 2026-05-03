"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  saveMcqResponse,
  saveFrqPartResponse,
  completeSection,
  completePaperAttempt,
} from "@/app/actions/paper-attempt";
import type { PaperAttemptData, SectionData, QuestionData } from "@/app/actions/paper-attempt";
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send, Eye, ArrowLeft } from "lucide-react";

interface Props {
  data: PaperAttemptData;
  attemptId: string;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PracticeInterface({ data, attemptId }: Props) {
  const router = useRouter();
  const { sections, attempt } = data;

  // Active section (0 = MCQ, 1 = FRQ)
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Track completed sections locally
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const s of sections) {
      if (s.progress?.status === "COMPLETED") m[s.id] = true;
    }
    return m;
  });

  // MCQ answers: questionId -> optionId
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const s of sections) {
      for (const q of s.questions) {
        if (q.savedResponse?.selectedOptionId) {
          m[q.id] = q.savedResponse.selectedOptionId;
        }
      }
    }
    return m;
  });

  // FRQ answers: questionId -> partId -> text
  const [frqAnswers, setFrqAnswers] = useState<Record<string, Record<string, string>>>(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const s of sections) {
      for (const q of s.questions) {
        if (q.savedResponse?.partResponses) {
          m[q.id] = { ...q.savedResponse.partResponses };
        }
      }
    }
    return m;
  });

  // Per-section timers (count down from durationMinutes)
  const [sectionSecondsLeft, setSectionSecondsLeft] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const s of sections) {
      m[s.id] = (s.durationMinutes ?? 60) * 60;
    }
    return m;
  });

  const [submitting, setSubmitting] = useState(false);
  const [sectionCompleting, setSectionCompleting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const savingRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const frqSavingRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeSection = sections[activeSectionIdx];
  const currentQuestion = activeSection?.questions[currentQuestionIdx] ?? null;
  const isMcqSection = activeSection?.allowedQuestionTypes.includes("MCQ") ?? false;
  const isFrqSection = activeSection?.allowedQuestionTypes.includes("FRQ_STRUCTURED") ?? false;

  // Section timer tick
  useEffect(() => {
    if (!activeSection || completedSections[activeSection.id]) return;
    const interval = setInterval(() => {
      setSectionSecondsLeft((prev) => {
        const current = prev[activeSection.id] ?? 0;
        if (current <= 1) {
          clearInterval(interval);
          // Auto-complete section on time up
          handleSectionComplete(activeSection, true);
          return { ...prev, [activeSection.id]: 0 };
        }
        return { ...prev, [activeSection.id]: current - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionIdx, activeSection?.id]);

  const answeredCount = useCallback(
    (section: SectionData) => {
      if (section.allowedQuestionTypes.includes("MCQ")) {
        return section.questions.filter((q) => mcqAnswers[q.id]).length;
      }
      // FRQ: count questions with at least one non-empty answer
      return section.questions.filter((q) => {
        const parts = frqAnswers[q.id] ?? {};
        return Object.values(parts).some((v) => v.trim().length > 0);
      }).length;
    },
    [mcqAnswers, frqAnswers]
  );

  // Handle MCQ selection
  function handleMcqSelect(questionId: string, optionId: string) {
    setMcqAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    // Debounce save
    if (savingRef.current[questionId]) clearTimeout(savingRef.current[questionId]);
    savingRef.current[questionId] = setTimeout(() => {
      saveMcqResponse(attemptId, questionId, optionId).catch(() => {});
    }, 300);
  }

  // Handle FRQ text change
  function handleFrqChange(questionId: string, partId: string, text: string) {
    setFrqAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), [partId]: text },
    }));
    const key = `${questionId}_${partId}`;
    if (frqSavingRef.current[key]) clearTimeout(frqSavingRef.current[key]);
    frqSavingRef.current[key] = setTimeout(() => {
      saveFrqPartResponse(attemptId, questionId, partId, text).catch(() => {});
    }, 1000);
  }

  async function handleSectionComplete(section: SectionData, forced = false) {
    if (completedSections[section.id]) return;
    if (!forced) setSectionCompleting(true);
    await completeSection(attemptId, section.id);
    setCompletedSections((prev) => ({ ...prev, [section.id]: true }));
    if (!forced) setSectionCompleting(false);

    // Move to next section if available
    if (activeSectionIdx < sections.length - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      setCurrentQuestionIdx(0);
    }
  }

  async function handleSubmitAll() {
    setSubmitting(true);
    setShowReview(false);
    setReturnToReview(false);
    // Complete current section first
    if (activeSection && !completedSections[activeSection.id]) {
      await completeSection(attemptId, activeSection.id);
    }
    await completePaperAttempt(attemptId);
    router.push(`/practice/${attemptId}/review`);
  }

  function handleOpenReview() {
    setShowReview(true);
    setReturnToReview(false);
  }

  function handleJumpToQuestion(sectionIdx: number, questionIdx: number) {
    setShowReview(false);
    setReturnToReview(true);
    setActiveSectionIdx(sectionIdx);
    setCurrentQuestionIdx(questionIdx);
  }

  const isLastSection = activeSectionIdx === sections.length - 1;
  const currentSectionSecondsLeft = sectionSecondsLeft[activeSection?.id ?? ""] ?? 0;
  const timerWarning = currentSectionSecondsLeft < 300 && currentSectionSecondsLeft > 0;

  // When editing a question from the review panel, bypass the "section completed" screen
  const showQuestionsOverride = returnToReview;

  if (showReview) {
    return (
      <ReviewPanel
        sections={sections}
        mcqAnswers={mcqAnswers}
        frqAnswers={frqAnswers}
        onClose={() => setShowReview(false)}
        onJumpTo={handleJumpToQuestion}
        onSubmit={handleSubmitAll}
        submitting={submitting}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            {sections.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  if (idx > 0 && !completedSections[sections[idx - 1]?.id]) return;
                  setActiveSectionIdx(idx);
                  setCurrentQuestionIdx(0);
                }}
                disabled={idx > 0 && !completedSections[sections[idx - 1]?.id]}
                className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                  activeSectionIdx === idx
                    ? "bg-indigo-600 text-white"
                    : completedSections[s.id]
                    ? "bg-green-100 text-green-700"
                    : idx > 0 && !completedSections[sections[idx - 1]?.id]
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {completedSections[s.id] ? "✓ " : ""}
                {s.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 text-sm font-mono font-semibold ${
                timerWarning ? "text-red-600 animate-pulse" : "text-gray-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(currentSectionSecondsLeft)}
            </div>

            {activeSection && returnToReview ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReturnToReview(false);
                  setShowReview(true);
                }}
                className="gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Review
              </Button>
            ) : activeSection && !completedSections[activeSection.id] && isLastSection ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleOpenReview}
                disabled={submitting}
                className="gap-1"
              >
                <Eye className="h-3.5 w-3.5" />
                {submitting ? "Submitting…" : "Review & Submit"}
              </Button>
            ) : activeSection && !completedSections[activeSection.id] && !isLastSection ? (
              <Button
                size="sm"
                onClick={() => handleSectionComplete(activeSection)}
                disabled={sectionCompleting}
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
              >
                {sectionCompleting ? "Saving…" : "End Section →"}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Section progress bar */}
        {activeSection && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>
                {answeredCount(activeSection)} / {activeSection.questions.length} answered
              </span>
              <span>{activeSection.title}</span>
            </div>
            <Progress
              value={(answeredCount(activeSection) / Math.max(activeSection.questions.length, 1)) * 100}
              className="h-1"
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-6">
        {/* Question Navigator (MCQ) */}
        {isMcqSection && activeSection && (
          <aside className="w-52 shrink-0">
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Questions</p>
              <div className="grid grid-cols-5 gap-1">
                {activeSection.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`aspect-square rounded text-xs font-medium transition-colors ${
                      currentQuestionIdx === idx
                        ? "bg-indigo-600 text-white"
                        : mcqAnswers[q.id]
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* FRQ Question Navigator */}
        {isFrqSection && activeSection && (
          <aside className="w-52 shrink-0">
            <div className="bg-white rounded-lg border p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Questions</p>
              {activeSection.questions.map((q, idx) => {
                const hasAnswer = Object.values(frqAnswers[q.id] ?? {}).some(
                  (v) => v.trim().length > 0
                );
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`w-full text-left text-xs rounded px-2 py-1.5 transition-colors ${
                      currentQuestionIdx === idx
                        ? "bg-indigo-600 text-white"
                        : hasAnswer
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Q{idx + 1} — FRQ
                    {hasAnswer && currentQuestionIdx !== idx && (
                      <span className="ml-1 text-green-500">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Section instructions */}
            {activeSection.instructions && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">Instructions</p>
                <p>{activeSection.instructions}</p>
              </div>
            )}
          </aside>
        )}

        {/* Main question area */}
        <main className="flex-1 min-w-0">
          {completedSections[activeSection?.id ?? ""] && !showQuestionsOverride ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Section Completed</h3>
              {isLastSection ? (
                <>
                  <p className="text-gray-500 mb-4">
                    All sections done. Review your answers before submitting.
                  </p>
                  <Button onClick={handleOpenReview} disabled={submitting} className="bg-indigo-600 gap-2">
                    <Eye className="h-4 w-4" />
                    {submitting ? "Submitting…" : "Review & Submit"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-4">Move on to the next section.</p>
                  <Button
                    onClick={() => {
                      setActiveSectionIdx(activeSectionIdx + 1);
                      setCurrentQuestionIdx(0);
                    }}
                  >
                    Continue to {sections[activeSectionIdx + 1]?.title} →
                  </Button>
                </>
              )}
            </div>
          ) : currentQuestion ? (
            isMcqSection ? (
              <McqQuestion
                question={currentQuestion}
                selectedOption={mcqAnswers[currentQuestion.id] ?? null}
                onSelect={(optId) => handleMcqSelect(currentQuestion.id, optId)}
                questionNumber={currentQuestionIdx + 1}
                total={activeSection.questions.length}
                onPrev={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                onNext={() =>
                  setCurrentQuestionIdx((i) => Math.min(activeSection.questions.length - 1, i + 1))
                }
              />
            ) : (
              <FrqQuestion
                question={currentQuestion}
                answers={frqAnswers[currentQuestion.id] ?? {}}
                onPartChange={(partId, text) =>
                  handleFrqChange(currentQuestion.id, partId, text)
                }
                questionNumber={currentQuestionIdx + 1}
                total={activeSection.questions.length}
                onPrev={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                onNext={() =>
                  setCurrentQuestionIdx((i) => Math.min(activeSection.questions.length - 1, i + 1))
                }
              />
            )
          ) : (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              No questions in this section.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── MCQ Question ──────────────────────────────────────────────────────────────

function McqQuestion({
  question,
  selectedOption,
  onSelect,
  questionNumber,
  total,
  onPrev,
  onNext,
}: {
  question: QuestionData;
  selectedOption: string | null;
  onSelect: (optId: string) => void;
  questionNumber: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="border-b px-6 py-3 flex items-center justify-between bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">
          Question {questionNumber} of {total}
        </span>
        <Badge variant="outline" className="text-xs">
          {question.difficulty}
        </Badge>
      </div>

      <div className="px-6 py-5">
        <p className="text-base leading-relaxed text-gray-900 whitespace-pre-wrap mb-6">
          {question.stem}
        </p>

        <div className="space-y-2.5">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`w-full flex items-start gap-3 text-left rounded-lg border p-3.5 transition-all ${
                selectedOption === opt.id
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                  selectedOption === opt.id
                    ? "border-indigo-500 bg-indigo-500 text-white"
                    : "border-gray-300 text-gray-500"
                }`}
              >
                {opt.label}
              </span>
              <span className="text-sm text-gray-800 leading-relaxed">{opt.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t px-6 py-3 flex justify-between bg-gray-50">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={questionNumber === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={questionNumber === total}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── FRQ Question ──────────────────────────────────────────────────────────────

function FrqQuestion({
  question,
  answers,
  onPartChange,
  questionNumber,
  total,
  onPrev,
  onNext,
}: {
  question: QuestionData;
  answers: Record<string, string>;
  onPartChange: (partId: string, text: string) => void;
  questionNumber: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalMarks = question.parts.reduce((sum, p) => sum + p.marks, 0);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="border-b px-6 py-3 flex items-center justify-between bg-gray-50">
        <span className="text-sm font-semibold text-gray-700">
          Free Response Question {questionNumber} of {total}
        </span>
        <Badge variant="outline" className="text-xs">
          {totalMarks} points
        </Badge>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Question stem */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{question.stem}</p>
        </div>

        {/* Parts */}
        {question.parts.length > 0 ? (
          <div className="space-y-5">
            {question.parts.map((part) => (
              <div key={part.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-indigo-700">{part.label}</span>
                    <span className="text-sm text-gray-800">{part.prompt}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {part.marks} pt{part.marks > 1 ? "s" : ""}
                  </Badge>
                </div>
                {part.requiresGraph && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    This part requires a labeled graph. Describe your graph in words below — you will
                    draw it on paper during the actual exam.
                  </div>
                )}
                <textarea
                  value={answers[part.id] ?? ""}
                  onChange={(e) => onPartChange(part.id, e.target.value)}
                  rows={part.requiresGraph ? 5 : 4}
                  placeholder={
                    part.requiresGraph
                      ? "Describe your graph: label axes, curves, equilibrium points, and any shifts…"
                      : "Type your answer here…"
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y leading-relaxed"
                />
              </div>
            ))}
          </div>
        ) : (
          // No parts defined — full response
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Your Answer</label>
            <textarea
              value={answers["__full__"] ?? ""}
              onChange={(e) => onPartChange("__full__", e.target.value)}
              rows={8}
              placeholder="Type your answer here…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
            />
          </div>
        )}
      </div>

      <div className="border-t px-6 py-3 flex justify-between bg-gray-50">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={questionNumber === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={questionNumber === total}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Review Panel ──────────────────────────────────────────────────────────────

function ReviewPanel({
  sections,
  mcqAnswers,
  frqAnswers,
  onClose,
  onJumpTo,
  onSubmit,
  submitting,
}: {
  sections: SectionData[];
  mcqAnswers: Record<string, string>;
  frqAnswers: Record<string, Record<string, string>>;
  onClose: () => void;
  onJumpTo: (sectionIdx: number, questionIdx: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const mcqSectionIdx = sections.findIndex((s) =>
    s.allowedQuestionTypes.includes("MCQ")
  );
  const frqSectionIdx = sections.findIndex((s) =>
    s.allowedQuestionTypes.includes("FRQ_STRUCTURED")
  );
  const mcqSection = mcqSectionIdx >= 0 ? sections[mcqSectionIdx] : null;
  const frqSection = frqSectionIdx >= 0 ? sections[frqSectionIdx] : null;

  const mcqAnsweredCount = mcqSection
    ? mcqSection.questions.filter((q) => mcqAnswers[q.id]).length
    : 0;
  const mcqTotal = mcqSection?.questions.length ?? 0;

  const frqAnsweredCount = frqSection
    ? frqSection.questions.filter((q) =>
        Object.values(frqAnswers[q.id] ?? {}).some((v) => v.trim().length > 0)
      ).length
    : 0;
  const frqTotal = frqSection?.questions.length ?? 0;

  const unansweredMcq = mcqTotal - mcqAnsweredCount;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to exam
            </button>
            <span className="text-gray-300">|</span>
            <h2 className="text-base font-semibold text-gray-900">Review Your Answers</h2>
          </div>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Submitting…" : "Confirm & Submit"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-8">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {mcqSection && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                {mcqSection.title}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {mcqAnsweredCount}
                <span className="text-lg font-normal text-gray-400"> / {mcqTotal}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">answered</p>
              {unansweredMcq > 0 && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  ⚠ {unansweredMcq} unanswered — click to fill in
                </p>
              )}
            </div>
          )}
          {frqSection && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                {frqSection.title}
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {frqAnsweredCount}
                <span className="text-lg font-normal text-gray-400"> / {frqTotal}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">questions attempted</p>
            </div>
          )}
        </div>

        {/* MCQ answer sheet */}
        {mcqSection && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {mcqSection.title} — Answer Sheet
            </h3>
            <div className="bg-white rounded-xl border overflow-hidden divide-y">
              {mcqSection.questions.map((q, qIdx) => {
                const selectedOptId = mcqAnswers[q.id];
                const selectedOpt = q.options.find((o) => o.id === selectedOptId);
                return (
                  <div
                    key={q.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      !selectedOpt ? "bg-amber-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xs font-mono text-gray-400 w-7 shrink-0 text-right">
                      {qIdx + 1}.
                    </span>
                    <p className="text-sm text-gray-700 flex-1 truncate">
                      {q.stem.length > 90 ? q.stem.slice(0, 90) + "…" : q.stem}
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      {selectedOpt ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {selectedOpt.label}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">—</span>
                      )}
                      <button
                        onClick={() => onJumpTo(mcqSectionIdx, qIdx)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {selectedOpt ? "Change" : "Answer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* FRQ review */}
        {frqSection && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {frqSection.title} — Responses
            </h3>
            <div className="space-y-4">
              {frqSection.questions.map((q, qIdx) => {
                const qAnswers = frqAnswers[q.id] ?? {};
                const hasAny = Object.values(qAnswers).some((v) => v.trim().length > 0);
                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-xl border overflow-hidden ${
                      !hasAny ? "border-amber-200" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 shrink-0">
                          FRQ {qIdx + 1}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {q.stem.length > 60 ? q.stem.slice(0, 60) + "…" : q.stem}
                        </span>
                      </div>
                      <button
                        onClick={() => onJumpTo(frqSectionIdx, qIdx)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-3"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {q.parts.length > 0 ? (
                        q.parts.map((part) => {
                          const answer = (qAnswers[part.id] ?? "").trim();
                          return (
                            <div key={part.id} className="flex items-start gap-3">
                              <span className="text-xs font-semibold text-indigo-600 w-6 shrink-0 pt-0.5">
                                {part.label}
                              </span>
                              {answer ? (
                                <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                                  {answer.length > 140 ? answer.slice(0, 140) + "…" : answer}
                                </p>
                              ) : (
                                <span className="text-xs text-amber-500 italic">Not answered</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        (() => {
                          const answer = (qAnswers["__full__"] ?? "").trim();
                          return answer ? (
                            <p className="text-xs text-gray-700 line-clamp-2">{answer}</p>
                          ) : (
                            <span className="text-xs text-amber-500 italic">Not answered</span>
                          );
                        })()
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom submit */}
        <div className="flex items-center justify-between pt-4 pb-8 border-t">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to exam
          </button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting…" : "Confirm & Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
