"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assembleAndStartPaperAttempt } from "@/app/actions/paper-attempt";
import { Loader2 } from "lucide-react";

interface StartPracticeButtonProps {
  examTemplateId: string;
}

export function StartPracticeButton({ examTemplateId }: StartPracticeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleStart() {
    setLoading(true);
    setError(null);
    const result = await assembleAndStartPaperAttempt(examTemplateId);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/practice/${result.attemptId}`);
    }
  }

  return (
    <div className="pt-1">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <Button
        onClick={handleStart}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Assembling paper…
          </>
        ) : (
          "Start Practice Test"
        )}
      </Button>
    </div>
  );
}
