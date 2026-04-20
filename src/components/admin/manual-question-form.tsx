"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createManualQuestion } from "@/app/actions/admin";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { Subject, Topic } from "@prisma/client";

type SubjectWithTopics = Subject & { topics: Topic[] };

interface ManualQuestionFormProps {
  subjects: SubjectWithTopics[];
}

export function ManualQuestionForm({ subjects }: ManualQuestionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [difficulty, setDifficulty] = useState("MEDIUM");

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("subjectId", subjectId);
    formData.set("topicId", topicId);
    formData.set("correctAnswer", correctAnswer);
    formData.set("difficulty", difficulty);

    startTransition(async () => {
      const res = await createManualQuestion(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Question created as draft");
      router.push("/admin/questions");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subject & Topic */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Subject *</Label>
          <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject..." />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Topic *</Label>
          <Select value={topicId} onValueChange={setTopicId} disabled={!selectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select topic..." />
            </SelectTrigger>
            <SelectContent>
              {selectedSubject?.topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stem */}
      <div className="space-y-2">
        <Label htmlFor="stem">Question Stem *</Label>
        <Textarea id="stem" name="stem" placeholder="Enter the question text..." rows={3} required />
      </div>

      {/* Options */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>Answer Options *</Label>
          <p className="text-xs text-gray-400">Select the correct answer using the radio buttons.</p>
          <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
            {(["A", "B", "C", "D"] as const).map((label) => (
              <div key={label} className="flex items-center gap-3">
                <RadioGroupItem value={label} id={`opt-${label}`} />
                <span className="font-bold text-indigo-400 w-5">{label}</span>
                <Input
                  name={`option${label}`}
                  placeholder={`Option ${label}`}
                  required
                  className="flex-1"
                />
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label>Difficulty</Label>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EASY">Easy</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HARD">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <Label htmlFor="explanation">Explanation (optional)</Label>
        <Textarea
          id="explanation"
          name="explanation"
          placeholder="Provide a brief explanation of the correct answer..."
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (optional)</Label>
        <Input id="tags" name="tags" placeholder="comma-separated, e.g. supply,demand,elasticity" />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending || !subjectId || !topicId}>
        {isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          <><CheckCircle2 className="h-4 w-4 mr-2" /> Create Question</>
        )}
      </Button>
    </form>
  );
}
