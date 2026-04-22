"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { toggleSubjectActive, createTopic, updateTopicCanonicalImage } from "@/app/actions/admin";
import { PlusCircle, ChevronDown, ChevronRight, ImageIcon } from "lucide-react";
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
  const [editingImageFor, setEditingImageFor] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

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

  async function handleSaveImage(topicId: string) {
    const url = imageUrl.trim() || null;
    const result = await updateTopicCanonicalImage(topicId, url);
    if ("error" in result) { toast.error(result.error); return; }
    toast.success(url ? "Image URL saved" : "Image URL cleared");
    setEditingImageFor(null);
    setImageUrl("");
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
                  <div key={topic.id} className="py-1 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="flex-1">{topic.name}</span>
                      <span className="text-xs text-gray-400">{topic._count.questions}q</span>
                      {topic.canonicalImageUrl && (
                        <span className="text-xs text-green-600" title={topic.canonicalImageUrl}>✓ img</span>
                      )}
                      <button
                        className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-0.5"
                        onClick={() => {
                          setEditingImageFor(editingImageFor === topic.id ? null : topic.id);
                          setImageUrl(topic.canonicalImageUrl ?? "");
                        }}
                        title="Set canonical image URL for SCIENCE_COMPLEX diagrams"
                      >
                        <ImageIcon className="h-3 w-3" />
                      </button>
                    </div>
                    {editingImageFor === topic.id && (
                      <div className="flex gap-2 mt-1 ml-4">
                        <Input
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://... (leave blank to clear)"
                          className="h-7 text-xs"
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveImage(topic.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingImageFor(null); setImageUrl(""); }}>Cancel</Button>
                      </div>
                    )}
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
