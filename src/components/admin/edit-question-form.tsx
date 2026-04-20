"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { updateQuestion } from "@/app/actions/admin";
import type { Question, McqOption, Topic, Subject } from "@prisma/client";

type QuestionWithRelations = Question & {
  options: McqOption[];
  topic: Topic & { subject: Subject & { topics: Topic[] } };
};

type SubjectWithTopics = Subject & { topics: Topic[] };

interface Props {
  question: QuestionWithRelations;
  subjects: SubjectWithTopics[];
}

export function EditQuestionForm({ question, subjects }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [subjectId, setSubjectId] = useState(question.topic.subjectId);

  const currentSubject = subjects.find((s) => s.id === subjectId);
  const optionMap = Object.fromEntries(question.options.map((o) => [o.label, o.text]));
  const correctOption = question.options.find((o) => o.isCorrect)?.label ?? "A";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    formData.set("id", question.id);
    const result = await updateQuestion(formData);
    setSaving(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Question updated");
      router.push("/admin/questions");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Subject selector (for filtering topics) */}
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Topic */}
      <div className="space-y-1.5">
        <Label htmlFor="topicId">Topic</Label>
        <Select name="topicId" defaultValue={question.topicId}>
          <SelectTrigger>
            <SelectValue placeholder="Select topic" />
          </SelectTrigger>
          <SelectContent>
            {(currentSubject?.topics ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stem */}
      <div className="space-y-1.5">
        <Label htmlFor="stem">Question</Label>
        <Textarea name="stem" id="stem" defaultValue={question.stem} rows={4} required />
      </div>

      {/* Options */}
      {(["A", "B", "C", "D"] as const).map((label) => (
        <div key={label} className="space-y-1.5">
          <Label htmlFor={`option${label}`}>Option {label}</Label>
          <Input
            name={`option${label}`}
            id={`option${label}`}
            defaultValue={optionMap[label] ?? ""}
            required
          />
        </div>
      ))}

      {/* Correct answer */}
      <div className="space-y-1.5">
        <Label htmlFor="correctAnswer">Correct Answer</Label>
        <Select name="correctAnswer" defaultValue={correctOption}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["A", "B", "C", "D"].map((l) => (
              <SelectItem key={l} value={l}>Option {l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty */}
      <div className="space-y-1.5">
        <Label htmlFor="difficulty">Difficulty</Label>
        <Select name="difficulty" defaultValue={question.difficulty}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={question.status}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Explanation */}
      <div className="space-y-1.5">
        <Label htmlFor="explanation">Explanation (optional)</Label>
        <Textarea
          name="explanation"
          id="explanation"
          defaultValue={question.explanation ?? ""}
          rows={3}
          placeholder="Explain why the correct answer is right..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
