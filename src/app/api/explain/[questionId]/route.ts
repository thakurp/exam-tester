import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateExplanation } from "@/lib/openrouter";
import { z } from "zod";

const paramsSchema = z.object({
  questionId: z.string().cuid(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid question ID" }, { status: 400 });
  }

  const { questionId } = parsed.data;

  const explanation = await getOrCreateExplanation(questionId);
  return NextResponse.json(explanation);
}
