"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { Difficulty, QuestionType } from "@prisma/client";
import { sanitizeSvg, isValidSvg } from "@/lib/sanitize-svg";

// ---------------------------------------------------------------------------
// CSV / Excel bulk import
// ---------------------------------------------------------------------------

const rowSchema = z.object({
  stem: z.string().min(5),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  topic: z.string().min(1),
  explanation: z.string().optional(),
});

type CsvRow = z.infer<typeof rowSchema>;

interface UploadResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export async function uploadQuestionsFromFile(formData: FormData): Promise<{
  error?: string;
  result?: UploadResult;
}> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File | null;
  const subjectId = formData.get("subjectId") as string | null;

  if (!file || !subjectId) {
    return { error: "File and subject are required" };
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { topics: true },
  });
  if (!subject) return { error: "Subject not found" };

  // Parse rows from file
  let rows: Record<string, string>[] = [];

  const arrayBuffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = Buffer.from(arrayBuffer).toString("utf-8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    rows = parsed.data;
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
      header: 0,
      defval: "",
      raw: false,
    });
    // Normalise headers
    rows = rows.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k.trim().toLowerCase().replace(/\s+/g, "_"),
          String(v),
        ])
      )
    );
  } else {
    return { error: "Unsupported file format. Use .csv, .xlsx, or .xls" };
  }

  const result: UploadResult = { total: rows.length, imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-based, +1 for header
    const raw = rows[i];

    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      result.errors.push({ row: rowNum, reason: msg });
      result.skipped++;
      continue;
    }

    const data: CsvRow = parsed.data;

    // Find or create topic
    let topic = subject.topics.find(
      (t) => t.name.toLowerCase() === data.topic.toLowerCase()
    );
    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          name: data.topic,
          subjectId: subject.id,
        },
      });
      // Keep local cache up to date
      (subject.topics as typeof topic[]).push(topic);
    }

    try {
      await prisma.question.create({
        data: {
          stem: data.stem,
          type: QuestionType.MCQ,
          difficulty: data.difficulty as Difficulty,
          explanation: data.explanation ?? null,
          topicId: topic.id,
          status: "DRAFT",
          source: "UPLOAD",
          options: {
            create: [
              { label: "A", text: data.option_a, isCorrect: data.correct_answer === "A", sortOrder: 0 },
              { label: "B", text: data.option_b, isCorrect: data.correct_answer === "B", sortOrder: 1 },
              { label: "C", text: data.option_c, isCorrect: data.correct_answer === "C", sortOrder: 2 },
              { label: "D", text: data.option_d, isCorrect: data.correct_answer === "D", sortOrder: 3 },
            ],
          },
        },
      });
      result.imported++;
    } catch (e) {
      result.errors.push({ row: rowNum, reason: "Database error — possible duplicate" });
      result.skipped++;
    }
  }

  revalidatePath("/admin/questions");
  return { result };
}

// ---------------------------------------------------------------------------
// Publish / unpublish question
// ---------------------------------------------------------------------------

export async function publishQuestion(questionId: string) {
  await requireAdmin();
  await prisma.question.update({
    where: { id: questionId },
    data: { status: "PUBLISHED" },
  });
  revalidatePath("/admin/questions");
}

export async function unpublishQuestion(questionId: string) {
  await requireAdmin();
  await prisma.question.update({
    where: { id: questionId },
    data: { status: "DRAFT" },
  });
  revalidatePath("/admin/questions");
}

// ---------------------------------------------------------------------------
// Delete question
// ---------------------------------------------------------------------------

export async function deleteQuestion(questionId: string) {
  await requireAdmin();
  await prisma.question.update({
    where: { id: questionId },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/admin/questions");
}

export async function bulkPublishQuestions(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return { count: 0 };
  const { count } = await prisma.question.updateMany({
    where: { id: { in: ids }, status: "DRAFT" },
    data: { status: "PUBLISHED" },
  });
  revalidatePath("/admin/questions");
  return { count };
}

export async function bulkArchiveQuestions(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return { count: 0 };
  const { count } = await prisma.question.updateMany({
    where: { id: { in: ids }, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/admin/questions");
  return { count };
}

// ---------------------------------------------------------------------------
// Manual question creation
// ---------------------------------------------------------------------------

const manualQuestionSchema = z.object({
  stem: z.string().min(5),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  topicId: z.string().cuid(),
  subjectId: z.string().cuid(),
  explanation: z.string().optional(),
  tags: z.string().optional(),
});

export async function createManualQuestion(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = manualQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const d = parsed.data;
  const question = await prisma.question.create({
    data: {
      stem: d.stem,
      type: QuestionType.MCQ,
      difficulty: d.difficulty as Difficulty,
      explanation: d.explanation ?? null,
      topicId: d.topicId,
      status: "DRAFT",
      source: "MANUAL",
      options: {
        create: [
          { label: "A", text: d.optionA, isCorrect: d.correctAnswer === "A", sortOrder: 0 },
          { label: "B", text: d.optionB, isCorrect: d.correctAnswer === "B", sortOrder: 1 },
          { label: "C", text: d.optionC, isCorrect: d.correctAnswer === "C", sortOrder: 2 },
          { label: "D", text: d.optionD, isCorrect: d.correctAnswer === "D", sortOrder: 3 },
        ],
      },
    },
  });

  revalidatePath("/admin/questions");
  return { questionId: question.id };
}

// ---------------------------------------------------------------------------
// Update existing question
// ---------------------------------------------------------------------------

const updateQuestionSchema = z.object({
  id: z.string().cuid(),
  stem: z.string().min(5),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  topicId: z.string().cuid(),
  explanation: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function updateQuestion(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const d = parsed.data;

  // Delete old options and recreate
  await prisma.mcqOption.deleteMany({ where: { questionId: d.id } });

  await prisma.question.update({
    where: { id: d.id },
    data: {
      stem: d.stem,
      difficulty: d.difficulty as Difficulty,
      explanation: d.explanation ?? null,
      topicId: d.topicId,
      ...(d.status ? { status: d.status } : {}),
      options: {
        create: [
          { label: "A", text: d.optionA, isCorrect: d.correctAnswer === "A", sortOrder: 0 },
          { label: "B", text: d.optionB, isCorrect: d.correctAnswer === "B", sortOrder: 1 },
          { label: "C", text: d.optionC, isCorrect: d.correctAnswer === "C", sortOrder: 2 },
          { label: "D", text: d.optionD, isCorrect: d.correctAnswer === "D", sortOrder: 3 },
        ],
      },
    },
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${d.id}/edit`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Subject CRUD
// ---------------------------------------------------------------------------

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  description: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  examBoard: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
});

export async function createSubject(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = subjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }
  const d = parsed.data;
  await prisma.subject.create({
    data: {
      name: d.name,
      code: d.code,
      description: d.description,
      ...(d.country ? { country: d.country } : {}),
      ...(d.state ? { state: d.state } : {}),
      examBoard: d.examBoard,
      ...(d.color ? { color: d.color } : {}),
      sortOrder: d.sortOrder,
      isActive: true,
    },
  });
  revalidatePath("/admin/subjects");
  return { success: true };
}

export async function toggleSubjectActive(subjectId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.subject.update({ where: { id: subjectId }, data: { isActive } });
  revalidatePath("/admin/subjects");
}

const topicSchema = z.object({
  name: z.string().min(2),
  subjectId: z.string().cuid(),
  description: z.string().optional(),
});

export async function createTopic(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = topicSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }
  const d = parsed.data;
  await prisma.topic.create({
    data: { name: d.name, subjectId: d.subjectId, description: d.description ?? null },
  });
  revalidatePath("/admin/subjects");
  return { success: true };
}

// ---------------------------------------------------------------------------
// AI Topic Detection from subject name / URL / pasted content
// ---------------------------------------------------------------------------

export async function detectTopicsAction(input: {
  subjectName: string;
  country: string;
  state?: string;
  examBoard?: string;
  url?: string;
  pastedContent?: string;
}): Promise<{ topics: string[] } | { error: string }> {
  await requireAdmin();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "OpenRouter API key not configured" };

  let urlContent = "";
  if (input.url) {
    try {
      const res = await fetch(input.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ExamTester/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const html = await res.text();
        // Strip HTML tags, keep text
        urlContent = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000); // cap to avoid huge prompts
      }
    } catch {
      // ignore fetch errors — proceed without URL content
    }
  }

  const contextParts: string[] = [];
  if (input.country) contextParts.push(`Country: ${input.country}`);
  if (input.state) contextParts.push(`State/Region: ${input.state}`);
  if (input.examBoard) contextParts.push(`Exam Board: ${input.examBoard}`);
  if (urlContent) contextParts.push(`Curriculum content:\n${urlContent}`);
  if (input.pastedContent) contextParts.push(`Pasted information:\n${input.pastedContent.slice(0, 6000)}`);

  const prompt = `You are a curriculum expert. Identify the key topics (chapters/units) for the subject "${input.subjectName}" given the context below.

${contextParts.join("\n\n")}

Return ONLY a JSON array of topic name strings (10-25 topics), ordered logically as they would appear in a curriculum. No markdown, no explanation, just the array.

Example: ["Topic 1", "Topic 2", "Topic 3"]`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_GENERATION_MODEL ?? "anthropic/claude-sonnet-4.6",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `AI API error: ${err}` };
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "[]";
    // Strip possible markdown fences
    const cleaned = content.replace(/```json|```/g, "").trim();
    const topics: string[] = JSON.parse(cleaned);
    if (!Array.isArray(topics)) return { error: "Unexpected AI response format" };
    return { topics: topics.filter((t) => typeof t === "string" && t.trim()) };
  } catch (e) {
    return { error: `Failed to detect topics: ${String(e)}` };
  }
}

export async function createSubjectWithTopics(input: {
  name: string;
  code: string;
  description?: string;
  country: string;
  state?: string;
  examBoard?: string;
  color: string;
  topics: string[];
}): Promise<{ subjectId: string } | { error: string }> {
  await requireAdmin();

  const subject = await prisma.subject.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      country: input.country,
      state: input.state ?? null,
      examBoard: input.examBoard ?? null,
      color: input.color,
      isActive: true,
    },
  });

  for (let i = 0; i < input.topics.length; i++) {
    await prisma.topic.create({
      data: {
        subjectId: subject.id,
        name: input.topics[i],
        sortOrder: i,
      },
    });
  }

  revalidatePath("/admin/subjects");
  return { subjectId: subject.id };
}

// ---------------------------------------------------------------------------
// AI Question Generation
// ---------------------------------------------------------------------------

const generateSchema = z.object({
  topicId: z.string().cuid(),
  count: z.coerce.number().int().min(1).max(20).default(5),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).default("MIXED"),
  extraInstructions: z.string().optional(),
});

export async function generateQuestionsAction(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const d = parsed.data;
  const topic = await prisma.topic.findUnique({
    where: { id: d.topicId },
    include: { subject: true },
  });
  if (!topic) return { error: "Topic not found" };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "OpenRouter API key not configured" };

  const difficulties = d.difficulty === "MIXED" ? ["EASY", "MEDIUM", "HARD"] : [d.difficulty];
  const diffText = d.difficulty === "MIXED" ? "a mix of EASY, MEDIUM, and HARD" : d.difficulty;

  const prompt = `You are an expert educator creating multiple-choice exam questions for ${topic.subject.name} — specifically the topic "${topic.name}".

Generate exactly ${d.count} high-quality MCQ questions. Each question must have:
- A clear stem
- 4 options (A, B, C, D) — only one correct
- Difficulty: ${diffText}
- A concise explanation for the correct answer
- needsDiagram: true if the question involves shapes, geometry, graphs, diagrams, coordinates, science figures, or any visual concept — false otherwise

${d.extraInstructions ? `Additional instructions: ${d.extraInstructions}` : ""}

Respond ONLY with a JSON array, no markdown, no explanation outside JSON:
[
  {
    "stem": "question text",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "correct": "A",
    "difficulty": "EASY",
    "explanation": "...",
    "needsDiagram": false
  }
]`;

  let generated: Array<{
    stem: string;
    options: Record<string, string>;
    correct: string;
    difficulty: string;
    explanation: string;
    needsDiagram?: boolean;
  }>;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_GENERATION_MODEL ?? "anthropic/claude-sonnet-4.6",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `AI API error: ${err}` };
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    generated = JSON.parse(content);
  } catch (e) {
    return { error: `Failed to parse AI response: ${String(e)}` };
  }

  let saved = 0;
  for (const q of generated) {
    try {
      const diff = difficulties.includes(q.difficulty) ? q.difficulty : "MEDIUM";
      const created = await prisma.question.create({
        data: {
          stem: q.stem,
          type: "MCQ",
          difficulty: diff as Difficulty,
          explanation: q.explanation ?? null,
          topicId: topic.id,
          status: "DRAFT",
          source: "AI",
          options: {
            create: ["A", "B", "C", "D"].map((label, i) => ({
              label,
              text: q.options[label] ?? "",
              isCorrect: q.correct === label,
              sortOrder: i,
            })),
          },
        },
      });
      saved++;

      // Auto-generate diagram for visual questions
      if (q.needsDiagram) {
        void generateDiagramForQuestion(created.id, q.stem, apiKey);
      }
    } catch {
      // skip bad questions
    }
  }

  revalidatePath("/admin/questions");
  return { success: true, saved };
}

// Internal helper — generates and saves a diagram without blocking the response
async function generateDiagramForQuestion(questionId: string, stem: string, apiKey: string) {
  const diagramPrompt = `You are a diagram generator for educational exam questions. Create a clean, minimal SVG diagram that visually represents this question scenario.

Question: "${stem}"

Rules:
- Use viewBox="0 0 400 300" and width="400" height="300"
- Use only: rect, circle, polygon, path, line, text, g, defs
- No JavaScript, no external references, no event attributes, no xlink
- Colors: gray (#6b7280), blue (#3b82f6), green (#10b981), red (#ef4444), amber (#f59e0b)
- Add clear text labels inside the diagram
- Make shapes large and clearly visible with good spacing
- For geometry: show the shape with labeled dimensions/angles
- For graphs: show labeled axes and data points
- If NO diagram is appropriate for this question, respond with exactly: null

Respond ONLY with raw SVG markup starting with <svg, or the word null.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_GENERATION_MODEL ?? "anthropic/claude-sonnet-4.6",
        messages: [{ role: "user", content: diagramPrompt }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) return;
    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (content === "null" || !isValidSvg(content)) return;
    const clean = sanitizeSvg(content);
    await prisma.question.update({ where: { id: questionId }, data: { diagramSvg: clean } });
  } catch {
    // silently skip — diagram generation is best-effort
  }
}

// ---------------------------------------------------------------------------
// Admin: Generate diagram for a single question (on-demand)
// ---------------------------------------------------------------------------

export async function generateDiagramAction(questionId: string) {
  await requireAdmin();

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, stem: true },
  });
  if (!question) return { error: "Question not found" };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "OpenRouter API key not configured" };

  const diagramPrompt = `You are a diagram generator for educational exam questions. Create a clean, minimal SVG diagram that visually represents this question scenario.

Question: "${question.stem}"

Rules:
- Use viewBox="0 0 400 300" and width="400" height="300"
- Use only: rect, circle, polygon, path, line, text, g, defs
- No JavaScript, no external references, no event attributes, no xlink
- Colors: gray (#6b7280), blue (#3b82f6), green (#10b981), red (#ef4444), amber (#f59e0b)
- Add clear text labels inside the diagram
- Make shapes large and clearly visible with good spacing
- For geometry: show the shape with labeled dimensions/angles
- For graphs: show labeled axes and data points
- If NO diagram is appropriate for this question, respond with exactly: null

Respond ONLY with raw SVG markup starting with <svg, or the word null.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_GENERATION_MODEL ?? "anthropic/claude-sonnet-4.6",
        messages: [{ role: "user", content: diagramPrompt }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) return { error: "AI API error" };

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content?.trim() ?? "";

    if (content === "null" || !isValidSvg(content)) {
      await prisma.question.update({ where: { id: questionId }, data: { diagramSvg: null } });
      revalidatePath("/admin/questions");
      return { success: true, hasDiagram: false };
    }

    const clean = sanitizeSvg(content);
    await prisma.question.update({ where: { id: questionId }, data: { diagramSvg: clean } });
    revalidatePath("/admin/questions");
    return { success: true, hasDiagram: true, svg: clean };
  } catch (e) {
    return { error: `Failed to generate diagram: ${String(e)}` };
  }
}

export async function clearDiagramAction(questionId: string) {
  await requireAdmin();
  await prisma.question.update({ where: { id: questionId }, data: { diagramSvg: null } });
  revalidatePath("/admin/questions");
  return { success: true };
}
