import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDiagramForQuestion } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro/Hobby max for cron endpoints

export async function GET(req: NextRequest) {
  // Verify the cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  // Find published questions with PENDING diagrams that haven't exceeded retry limit
  const pending = await prisma.question.findMany({
    where: {
      status: "PUBLISHED",
      diagramStatus: "PENDING",
      diagramAttempts: { lt: 3 },
      diagramHint: { not: null },
    },
    select: { id: true },
    take: 10,
  });

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, generated: 0 });
  }

  // Process in batches of 3 to avoid timeouts
  const BATCH = 3;
  let generated = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((q) => generateDiagramForQuestion(q.id, apiKey))
    );
    generated += results.filter(Boolean).length;
  }

  // Mark questions that have hit 3 failed attempts as SKIPPED
  await prisma.question.updateMany({
    where: {
      diagramStatus: "PENDING",
      diagramAttempts: { gte: 3 },
    },
    data: { diagramStatus: "SKIPPED" },
  });

  return NextResponse.json({ processed: pending.length, generated });
}
