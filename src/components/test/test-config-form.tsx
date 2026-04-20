"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createTestSession } from "@/app/actions/test";
import { toast } from "sonner";
import { Loader2, BookOpen, Clock, BarChart } from "lucide-react";
import type { Subject, Topic } from "@prisma/client";

type SubjectWithTopics = Subject & { topics: Topic[] };

interface TestConfigFormProps {
  subjects: SubjectWithTopics[];
  initialSubject: SubjectWithTopics;
  userId: string;
}

const QUESTION_COUNTS = [5, 10, 15, 20, 30, 40];
const TIME_LIMITS = [
  { label: "Untimed", value: 0 },
  { label: "10 min", value: 10 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export function TestConfigForm({ subjects, initialSubject, userId }: TestConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(0);
  const [difficulties, setDifficulties] = useState<string[]>(["EASY", "MEDIUM", "HARD"]);
  const [mode, setMode] = useState<"EXAM" | "PRACTICE">("EXAM");

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((t) => t !== topicId) : [...prev, topicId]
    );
  };

  const toggleDifficulty = (diff: string) => {
    setDifficulties((prev) =>
      prev.includes(diff)
        ? prev.length > 1 ? prev.filter((d) => d !== diff) : prev
        : [...prev, diff]
    );
  };

  const handleStart = () => {
    startTransition(async () => {
      const result = await createTestSession({
        userId,
        subjectId: selectedSubject.id,
        topicIds: selectedTopics,
        questionCount,
        timeLimitMinutes: timeLimit,
        difficulties,
        mode,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push(`/test/${result.sessionId}/take`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Subject selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSubject(s);
                  setSelectedTopics([]);
                }}
                className={`text-left p-3 rounded-lg border text-sm font-medium transition-all ${
                  selectedSubject.id === s.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="h-1.5 w-8 rounded-full mb-2"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Topics{" "}
            <span className="text-gray-400 font-normal text-sm">
              (leave blank for all)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedSubject.topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  selectedTopics.includes(topic.id)
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Question count */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    questionCount === n
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time limit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Time limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {TIME_LIMITS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTimeLimit(value)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                    timeLimit === value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Difficulty + Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart className="h-4 w-4" /> Difficulty & Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-gray-500 mb-2 block">Difficulty</Label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    difficulties.includes(d)
                      ? d === "EASY"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : d === "MEDIUM"
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-400"
                  }`}
                >
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-sm text-gray-500 mb-2 block">Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["EXAM", "PRACTICE"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    mode === m
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {m === "EXAM" ? "🎯 Exam" : "📖 Practice"}
                  <p className="text-xs font-normal mt-0.5 text-gray-400">
                    {m === "EXAM" ? "Timed, review after" : "Instant feedback"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={handleStart}
        disabled={isPending}
      >
        {isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating test...</>
        ) : (
          `Start ${questionCount}-Question Test`
        )}
      </Button>
    </div>
  );
}
