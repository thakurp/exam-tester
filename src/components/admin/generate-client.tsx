"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { generateQuestionsAction } from "@/app/actions/admin";
import { Sparkles, Loader2, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import type { Subject, Topic } from "@prisma/client";

type SubjectWithTopics = Subject & { topics: Topic[] };

interface Props {
  subjects: SubjectWithTopics[];
}

const COUNTS = [3, 5, 10, 15, 20];

export function GenerateClient({ subjects }: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [count, setCount] = useState("20");
  const [difficulty, setDifficulty] = useState("MIXED");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ saved: number } | null>(null);

  const currentSubject = subjects.find((s) => s.id === subjectId);
  const topics = currentSubject?.topics ?? [];

  function toggleTopic(id: string) {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selectedTopicIds.length === topics.length) {
      setSelectedTopicIds([]);
    } else {
      setSelectedTopicIds(topics.map((t) => t.id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedTopicIds.length === 0) { toast.error("Please select at least one topic"); return; }
    setLoading(true);
    setResult(null);
    setProgress({ done: 0, total: selectedTopicIds.length });

    let totalSaved = 0;
    for (let i = 0; i < selectedTopicIds.length; i++) {
      const topicId = selectedTopicIds[i];
      const topicName = topics.find((t) => t.id === topicId)?.name ?? topicId;
      const fd = new FormData();
      fd.set("topicId", topicId);
      fd.set("count", count);
      fd.set("difficulty", difficulty);
      if (extra) fd.set("extraInstructions", extra);
      const res = await generateQuestionsAction(fd);
      if (res?.error) {
        toast.error(`Error on "${topicName}": ${res.error}`);
      } else if (res?.saved !== undefined) {
        totalSaved += res.saved;
      }
      setProgress({ done: i + 1, total: selectedTopicIds.length });
    }

    setLoading(false);
    setProgress(null);
    if (totalSaved > 0) {
      setResult({ saved: totalSaved });
      toast.success(`Generated ${totalSaved} questions across ${selectedTopicIds.length} topic(s)`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setSelectedTopicIds([]); }}>
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

      {topics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Topics <span className="text-gray-400 font-normal">({selectedTopicIds.length}/{topics.length} selected)</span></Label>
            <button type="button" onClick={toggleAll} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              {selectedTopicIds.length === topics.length ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
              {selectedTopicIds.length === topics.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
            {topics.map((t) => (
              <label key={t.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={selectedTopicIds.includes(t.id)}
                  onCheckedChange={() => toggleTopic(t.id)}
                />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Questions per Topic</Label>
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

      {selectedTopicIds.length > 1 && (
        <p className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
          Will generate <strong>{parseInt(count) * selectedTopicIds.length} questions</strong> total ({count} × {selectedTopicIds.length} topics)
        </p>
      )}

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

      <Button type="submit" disabled={loading || selectedTopicIds.length === 0} className="w-full">
        {loading && progress ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating topic {progress.done + 1} of {progress.total}…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Generate Questions</>
        )}
      </Button>

      {loading && progress && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-indigo-600 h-1.5 rounded-full transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

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
