"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { toggleSubjectActive, createTopic } from "@/app/actions/admin";
import { PlusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { CreateSubjectWizard } from "@/components/admin/create-subject-wizard";
import type { Subject, Topic } from "@prisma/client";

type TopicWithCount = Topic & { _count: { questions: number } };

type SubjectWithTopics = Subject & {
  topics: TopicWithCount[];
};

interface Props {
  subjects: SubjectWithTopics[];
}

export function SubjectsClient({ subjects: initial }: Props) {
  const [subjects, setSubjects] = useState(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [wizardOpen, setWizardOpen] = useState(false);
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggleActive(id: string, current: boolean) {
    await toggleSubjectActive(id, !current);
    setSubjects((s) => s.map((x) => x.id === id ? { ...x, isActive: !current } : x));
    toast.success(!current ? "Subject activated" : "Subject deactivated");
  }

  async function handleAddTopic(subjectId: string) {
    if (!newTopicName.trim()) return;
    const fd = new FormData();
    fd.set("name", newTopicName.trim());
    fd.set("subjectId", subjectId);
    const result = await createTopic(fd);
    if (result?.error) { toast.error(result.error); return; }
    toast.success("Topic added");
    setNewTopicName("");
    setAddingTopicFor(null);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <CreateSubjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      <div className="flex justify-end">
        <Button onClick={() => setWizardOpen(true)}><PlusCircle className="h-4 w-4 mr-2" /> New Subject</Button>
      </div>
      {subjects.map((subject) => (
        <Card key={subject.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle(subject.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expanded.has(subject.id) ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <CardTitle className="text-base">{subject.name}</CardTitle>
                <Badge variant="outline" className="text-xs">{subject.code}</Badge>
                <Badge
                  variant={subject.isActive ? "default" : "secondary"}
                  className="text-xs ml-auto"
                >
                  {subject.isActive ? "Active" : "Inactive"}
                </Badge>
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{subject.topics.length} topics</span>
                <span>·</span>
                <span>{subject.topics.reduce((a, t) => a + t._count.questions, 0)} questions</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleToggleActive(subject.id, subject.isActive)}
                >
                  {subject.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          </CardHeader>

          {expanded.has(subject.id) && (
            <CardContent className="pt-0 pb-4">
              <div className="pl-6 space-y-2">
                {subject.topics.map((topic) => (
                  <div key={topic.id} className="flex items-center gap-2 text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                    {topic.name}
                  </div>
                ))}

                {addingTopicFor === subject.id ? (
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="Topic name"
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTopic(subject.id)}
                      autoFocus
                    />
                    <Button size="sm" className="h-8" onClick={() => handleAddTopic(subject.id)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingTopicFor(null); setNewTopicName(""); }}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                    onClick={() => setAddingTopicFor(subject.id)}
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add topic
                  </button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
