"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { detectTopicsAction, createSubjectWithTopics } from "@/app/actions/admin";
import { GEO_DATA } from "@/lib/geo-data";
import {
  Loader2,
  Sparkles,
  Globe,
  BookOpen,
  CheckSquare,
  Square,
  Link as LinkIcon,
  FileText,
  ChevronRight,
  ChevronLeft,
  Pencil,
  X,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "location" | "subject" | "topics" | "confirm";

const STEP_LABELS: Record<Step, string> = {
  location: "1. Location",
  subject: "2. Subject",
  topics: "3. Topics",
  confirm: "4. Create",
};
const STEPS: Step[] = ["location", "subject", "topics", "confirm"];

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

export function CreateSubjectWizard({ open, onClose }: Props) {
  // Step state
  const [step, setStep] = useState<Step>("location");

  // Location
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [examBoard, setExamBoard] = useState("");

  // Subject
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [url, setUrl] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [contentTab, setContentTab] = useState<"url" | "paste" | "none">("none");

  // Topics
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [detecting, setDetecting] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newTopicName, setNewTopicName] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);

  const selectedCountry = GEO_DATA.find((c) => c.code === country);

  function reset() {
    setStep("location");
    setCountry(""); setState(""); setExamBoard("");
    setSubjectName(""); setSubjectCode(""); setDescription(""); setColor(COLORS[0]);
    setUrl(""); setPastedContent(""); setContentTab("none");
    setTopics([]); setSelectedTopics(new Set());
    setDetecting(false); setSubmitting(false);
    setEditingIdx(null); setNewTopicName("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Auto-generate code from name
  function handleNameChange(val: string) {
    setSubjectName(val);
    setSubjectCode(
      val
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .trim()
        .split(/\s+/)
        .map((w) => w.slice(0, 4))
        .join("_")
        .slice(0, 20)
    );
  }

  async function handleDetectTopics() {
    if (!subjectName.trim()) { toast.error("Enter a subject name first"); return; }
    setDetecting(true);
    const res = await detectTopicsAction({
      subjectName: subjectName.trim(),
      country,
      state,
      examBoard,
      url: contentTab === "url" ? url : undefined,
      pastedContent: contentTab === "paste" ? pastedContent : undefined,
    });
    setDetecting(false);
    if ("error" in res) { toast.error(res.error); return; }
    setTopics(res.topics);
    setSelectedTopics(new Set(res.topics.map((_, i) => i)));
    setStep("topics");
  }

  function toggleTopic(idx: number) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleAllTopics() {
    if (selectedTopics.size === topics.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(topics.map((_, i) => i)));
    }
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditVal(topics[idx]);
  }

  function saveEdit() {
    if (editingIdx === null) return;
    const next = [...topics];
    next[editingIdx] = editVal.trim() || next[editingIdx];
    setTopics(next);
    setEditingIdx(null);
  }

  function removeTopic(idx: number) {
    const next = topics.filter((_, i) => i !== idx);
    setTopics(next);
    setSelectedTopics((prev) => {
      const next2 = new Set<number>();
      prev.forEach((v) => { if (v < idx) next2.add(v); else if (v > idx) next2.add(v - 1); });
      return next2;
    });
  }

  function addTopic() {
    if (!newTopicName.trim()) return;
    const next = [...topics, newTopicName.trim()];
    setTopics(next);
    setSelectedTopics((prev) => new Set([...prev, next.length - 1]));
    setNewTopicName("");
  }

  async function handleCreate() {
    setSubmitting(true);
    const finalTopics = topics.filter((_, i) => selectedTopics.has(i));
    if (finalTopics.length === 0) { toast.error("Select at least one topic"); setSubmitting(false); return; }
    const res = await createSubjectWithTopics({
      name: subjectName.trim(),
      code: subjectCode.trim(),
      description: description.trim() || undefined,
      country,
      state: state || undefined,
      examBoard: examBoard.trim() || undefined,
      color,
      topics: finalTopics,
    });
    setSubmitting(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(`Subject "${subjectName}" created with ${finalTopics.length} topics`);
    handleClose();
    window.location.reload();
  }

  const canProceedLocation = !!country;
  const canProceedSubject = subjectName.trim().length >= 2 && subjectCode.trim().length >= 2;

  const currentIdx = STEPS.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  s === step
                    ? "bg-indigo-600 text-white"
                    : i < currentIdx
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Location ── */}
        {step === "location" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Globe className="h-4 w-4 text-indigo-500" /> Where is this subject taught?
            </div>

            <div className="space-y-1.5">
              <Label>Country *</Label>
              <Select value={country} onValueChange={(v) => { setCountry(v); setState(""); }}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {GEO_DATA.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCountry && (
              <div className="space-y-1.5">
                <Label>State / Region</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue placeholder="Select state / region" /></SelectTrigger>
                  <SelectContent>
                    {selectedCountry.states.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Exam Board / Curriculum</Label>
              <Input
                value={examBoard}
                onChange={(e) => setExamBoard(e.target.value)}
                placeholder="e.g. NESA, College Board, Cambridge, CBSE…"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep("subject")} disabled={!canProceedLocation}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Subject details ── */}
        {step === "subject" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="h-4 w-4 text-indigo-500" /> Subject details
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Subject Name *</Label>
                <Input
                  value={subjectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mathematics Extension 1"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20))}
                  placeholder="MATH_EXT1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
              </div>
            </div>

            {/* URL / paste content */}
            <div className="space-y-2">
              <Label>Curriculum source (optional — helps AI detect accurate topics)</Label>
              <div className="flex gap-2">
                {(["url", "paste", "none"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentTab(t)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      contentTab === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {t === "url" && <LinkIcon className="h-3 w-3" />}
                    {t === "paste" && <FileText className="h-3 w-3" />}
                    {t === "url" ? "Paste URL" : t === "paste" ? "Paste content" : "None"}
                  </button>
                ))}
              </div>

              {contentTab === "url" && (
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://curriculum.nsw.edu.au/…"
                  type="url"
                />
              )}
              {contentTab === "paste" && (
                <Textarea
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Paste syllabus, topic list, or any curriculum content here…"
                  rows={5}
                />
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("location")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleDetectTopics} disabled={!canProceedSubject || detecting}>
                {detecting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Detecting topics…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Detect Topics with AI</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review & edit topics ── */}
        {step === "topics" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                AI detected <strong>{topics.length}</strong> topics. Review, edit, and select which to include.
              </p>
              <button
                type="button"
                onClick={toggleAllTopics}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
              >
                {selectedTopics.size === topics.length
                  ? <><CheckSquare className="h-3 w-3" /> Deselect all</>
                  : <><Square className="h-3 w-3" /> Select all</>}
              </button>
            </div>

            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {topics.map((t, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                  <Checkbox
                    checked={selectedTopics.has(i)}
                    onCheckedChange={() => toggleTopic(i)}
                  />
                  {editingIdx === i ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingIdx(null); }}
                      />
                      <Button size="sm" className="h-7 px-2" onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingIdx(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{t}</span>
                      <button type="button" onClick={() => startEdit(i)} className="text-gray-400 hover:text-gray-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => removeTopic(i)} className="text-gray-300 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom topic */}
            <div className="flex gap-2">
              <Input
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Add a topic manually…"
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); }}}
              />
              <Button size="sm" className="h-8" onClick={addTopic} disabled={!newTopicName.trim()}>Add</Button>
            </div>

            <p className="text-xs text-gray-400">
              {selectedTopics.size} of {topics.length} topics selected
            </p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("subject")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={selectedTopics.size === 0}>
                Review <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm & create ── */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <p className="font-semibold text-base">{subjectName}</p>
                  <p className="text-gray-400 text-xs">{subjectCode}</p>
                </div>
              </div>
              {description && <p className="text-gray-600">{description}</p>}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>🌏 {GEO_DATA.find((c) => c.code === country)?.name ?? country}{state ? ` › ${state}` : ""}</span>
                {examBoard && <span>📋 {examBoard}</span>}
              </div>
              <div className="pt-2">
                <p className="font-medium text-gray-700 mb-1">{selectedTopics.size} topics:</p>
                <div className="flex flex-wrap gap-1.5">
                  {topics
                    .filter((_, i) => selectedTopics.has(i))
                    .map((t, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("topics")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
                ) : (
                  "Create Subject"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
