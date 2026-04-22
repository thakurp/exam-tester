import { NextRequest, NextResponse } from "next/server";
import { classifyQuestionsInternal } from "@/app/actions/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  // Process 30 questions per run (6 AI batches of 5 — fits within 60s function limit)
  const result = await classifyQuestionsInternal(apiKey, 30);
  return NextResponse.json(result);
}
