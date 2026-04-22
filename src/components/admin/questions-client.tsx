"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { QuestionActions } from "@/components/admin/question-actions";
import { bulkPublishQuestions, bulkArchiveQuestions } from "@/app/actions/admin";
import { toast } from "sonner";
import { Eye, Archive, CheckSquare, Square, Loader2 } from "lucide-react";
import type { QuestionStatus } from "@prisma/client";

interface Question {
  id: string;
  stem: string;
  difficulty: string;
  status: QuestionStatus;
  source: string | null;
  diagramStatus: string;
  topic: { name: string; subject: { name: string } };
}

interface Props {
  questions: Question[];
  status: QuestionStatus;
}

export function QuestionsClient({ questions, status }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = questions.length > 0 && selected.size === questions.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map((q) => q.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkPublish() {
    startTransition(async () => {
      const res = await bulkPublishQuestions(Array.from(selected));
      toast.success(`Published ${res.count} question${res.count !== 1 ? "s" : ""}`);
      setSelected(new Set());
    });
  }

  function handleBulkArchive() {
    startTransition(async () => {
      const res = await bulkArchiveQuestions(Array.from(selected));
      toast.success(`Archived ${res.count} question${res.count !== 1 ? "s" : ""}`);
      setSelected(new Set());
    });
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No {status.toLowerCase()} questions found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4 text-indigo-600" />
          ) : someSelected ? (
            <CheckSquare className="h-4 w-4 text-indigo-400" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {allSelected ? "Deselect all" : "Select all"}
        </button>

        {selected.size > 0 && (
          <>
            <span className="text-sm text-gray-400">{selected.size} selected</span>
            {status === "DRAFT" && (
              <Button
                size="sm"
                onClick={handleBulkPublish}
                disabled={isPending}
                className="ml-auto"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                )}
                Publish {selected.size}
              </Button>
            )}
            {status !== "ARCHIVED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkArchive}
                disabled={isPending}
                className={status === "DRAFT" ? "" : "ml-auto"}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                )}
                Archive {selected.size}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Question rows */}
      {questions.map((q) => (
        <Card
          key={q.id}
          className={selected.has(q.id) ? "ring-2 ring-indigo-400" : ""}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <Checkbox
              checked={selected.has(q.id)}
              onCheckedChange={() => toggleOne(q.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{q.stem}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  {q.topic.subject.name} › {q.topic.name}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    q.difficulty === "EASY"
                      ? "text-green-600 bg-green-50"
                      : q.difficulty === "MEDIUM"
                        ? "text-amber-600 bg-amber-50"
                        : "text-red-600 bg-red-50"
                  }`}
                >
                  {q.difficulty}
                </Badge>
                {q.diagramType !== "NONE" && (
                  <Badge variant="secondary" className="text-xs text-indigo-700 bg-indigo-50">
                    {q.diagramType === "GEOMETRY" ? "geometry"
                      : q.diagramType === "GRAPH" ? "graph"
                      : q.diagramType === "SCHEMATIC" ? "schematic"
                      : q.diagramType === "SCIENCE_COMPLEX" ? "complex image"
                      : q.diagramType.toLowerCase()}
                  </Badge>
                )}
                {q.diagramStatus === "PENDING" && (
                  <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50">svg pending</Badge>
                )}
                {q.diagramStatus === "GENERATED" && (
                  <Badge variant="secondary" className="text-xs text-green-700 bg-green-50">diagram ✓</Badge>
                )}
                {q.diagramStatus === "SKIPPED" && q.diagramType !== "NONE" && (
                  <Badge variant="secondary" className="text-xs text-red-700 bg-red-50">svg failed</Badge>
                )}
                {q.diagramStatus === "SKIPPED" && q.diagramType === "NONE" && (
                  <Badge variant="secondary" className="text-xs text-gray-500 bg-gray-100">no diagram</Badge>
                )}
                {q.source && (
                  <span className="text-xs text-gray-300">{q.source}</span>
                )}
              </div>
            </div>
            <QuestionActions questionId={q.id} currentStatus={q.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
