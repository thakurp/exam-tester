"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generateQuestionsAction } from "@/app/actions/admin";
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Subject, Topic } from "@prisma/client";

type SubjectWithTopics = Subject & { topics: Topic[] };

interface Props {
  subjects: SubjectWithTopics[];
}

const COUNTS = [3, 5, 10, 15, 20];

export function GenerateClient({ subjects }: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("MIXED");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ saved: number } | null>(null);

  const currentSubject = subjects.find((s) => s.id === subjectId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicId) { toast.error("Please select a topic"); return; }
    setLoading(true);
    setResult(null);
    const fd = new FormData();
    fd.set("topicId", topicId);
    fd.set("count", count);
    fd.set("difficulty", difficulty);
    if (extra) fd.set("extraInstructions", extra);
    const res = await generateQuestionsAction(fd);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
    } else if (res?.saved !== undefined) {
      setResult({ saved: res.saved });
      toast.success(`Generated ${res.saved} questions — saved as drafts`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId(""); }}>
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

      <div className="space-y-1.5">
        <Label>Topic</Label>
        <Select value={topicId} onValueChange={setTopicId} disabled={!subjectId}>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Number of Questions</Label>
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MIXED">Mixed</SelectItem>
              <SelectItem value="EASY">Easy</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HARD">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="extra">Extra Instructions (optional)</Label>
        <Textarea
          id="extra"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="e.g. Focus on supply and demand graphs, avoid calculus..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading || !topicId} className="w-full">
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Generate Questions</>
        )}
      </Button>

      {result && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-sm text-green-800">
            ✅ {result.saved} questions saved as drafts.{" "}
            <Link href="/admin/questions?status=DRAFT" className="font-medium underline">
              Review them →
            </Link>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
