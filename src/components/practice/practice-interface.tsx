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
import { Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Send } from "lucide-react";

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
    // Complete current section first
    if (activeSection && !completedSections[activeSection.id]) {
      await completeSection(attemptId, activeSection.id);
    }
    await completePaperAttempt(attemptId);
    router.push(`/practice/${attemptId}/review`);
  }

  const isLastSection = activeSectionIdx === sections.length - 1;
  const currentSectionSecondsLeft = sectionSecondsLeft[activeSection?.id ?? ""] ?? 0;
  const timerWarning = currentSectionSecondsLeft < 300 && currentSectionSecondsLeft > 0;

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

            {activeSection && !completedSections[activeSection.id] && isLastSection ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleSubmitAll}
                disabled={submitting}
                className="gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Submitting…" : "Submit All"}
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
          {completedSections[activeSection?.id ?? ""] ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Section Completed</h3>
              {isLastSection ? (
                <>
                  <p className="text-gray-500 mb-4">
                    All sections done. Submit the full paper to see your results.
                  </p>
                  <Button onClick={handleSubmitAll} disabled={submitting} className="bg-indigo-600">
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? "Submitting…" : "Submit & View Results"}
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
