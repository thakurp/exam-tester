"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { Difficulty, QuestionType } from "@prisma/client";

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

${d.extraInstructions ? `Additional instructions: ${d.extraInstructions}` : ""}

Respond ONLY with a JSON array, no markdown, no explanation outside JSON:
[
  {
    "stem": "question text",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "correct": "A",
    "difficulty": "EASY",
    "explanation": "..."
  }
]`;

  let generated: Array<{
    stem: string;
    options: Record<string, string>;
    correct: string;
    difficulty: string;
    explanation: string;
  }>;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_GENERATION_MODEL ?? "anthropic/claude-3.7-sonnet",
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
      await prisma.question.create({
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
    } catch {
      // skip bad questions
    }
  }

  revalidatePath("/admin/questions");
  return { success: true, saved };
}
