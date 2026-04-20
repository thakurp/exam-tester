import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const EXPLANATION_MODEL =
  process.env.OPENROUTER_EXPLANATION_MODEL ??
  "anthropic/claude-3.7-sonnet";

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export interface ExplanationResponse {
  explanation: string;
  keyPoints: string[];
  steps?: string[];
  commonMistakes?: string[];
  fromCache: boolean;
}

function buildPrompt(
  questionStem: string,
  correctAnswer: string,
  options?: Array<{ label: string; text: string }>,
  subject?: string
): string {
  const optionsText = options
    ? options.map((o) => `${o.label}. ${o.text}`).join("\n")
    : "";

  return `You are an expert ${subject ?? "exam"} tutor. Explain the following exam question and its correct answer clearly and concisely.

QUESTION:
${questionStem}

${optionsText ? `OPTIONS:\n${optionsText}\n` : ""}
CORRECT ANSWER: ${correctAnswer}

Provide a JSON response with:
1. "explanation": A clear 2-4 sentence explanation of WHY this is the correct answer
2. "keyPoints": An array of 2-4 bullet point key takeaways (strings)
3. "steps": (optional) Array of step-by-step reasoning if it's a calculation/logical problem
4. "commonMistakes": Array of 1-2 common mistakes students make on this type of question

Respond ONLY with valid JSON. No markdown, no extra text.`;
}

export async function getOrCreateExplanation(
  questionId: string,
  model: string = EXPLANATION_MODEL
): Promise<ExplanationResponse> {
  // 1. Check cache first
  const cached = await prisma.llmExplanationCache.findUnique({
    where: { questionId_model: { questionId, model } },
  });

  if (cached && cached.expiresAt > new Date()) {
    // Update hit count asynchronously — don't block the response
    prisma.llmExplanationCache
      .update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 } },
      })
      .catch(() => {});

    return {
      ...(cached.response as Omit<ExplanationResponse, "fromCache">),
      fromCache: true,
    };
  }

  // 2. Fetch question with options
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      topic: { include: { subject: true } },
    },
  });

  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

  const correctAnswerLabel =
    question.correctAnswer ??
    question.options.find((o) => o.isCorrect)?.label ??
    question.correctAnswerText ??
    "See explanation";

  const prompt = buildPrompt(
    question.stem,
    correctAnswerLabel,
    question.options.length > 0
      ? question.options.map((o) => ({ label: o.label, text: o.text }))
      : undefined,
    question.topic.subject.name
  );

  const promptHash = createHash("sha256").update(prompt).digest("hex");

  // 3. Call OpenRouter
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "ExamTester",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content ?? "{}";

  let responseJson: Omit<ExplanationResponse, "fromCache">;
  try {
    responseJson = JSON.parse(rawContent);
  } catch {
    responseJson = {
      explanation: rawContent,
      keyPoints: [],
    };
  }

  // 4. Upsert into cache (90 day TTL)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await prisma.llmExplanationCache.upsert({
    where: { questionId_model: { questionId, model } },
    create: {
      questionId,
      model,
      promptHash,
      prompt,
      response: responseJson,
      hitCount: 0,
      expiresAt,
    },
    update: {
      promptHash,
      prompt,
      response: responseJson,
      hitCount: 0,
      expiresAt,
    },
  });

  return { ...responseJson, fromCache: false };
}
