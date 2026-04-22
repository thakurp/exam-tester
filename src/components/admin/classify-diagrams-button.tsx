"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { classifyAndGenerateExistingDiagrams } from "@/app/actions/admin";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";

interface Props {
  unclassifiedCount: number;
}

export function ClassifyDiagramsButton({ unclassifiedCount: initial }: Props) {
  const [remaining, setRemaining] = useState(initial);
  const [isPending, startTransition] = useTransition();

  if (remaining === 0) return null;

  function handleClassify() {
    startTransition(async () => {
      const res = await classifyAndGenerateExistingDiagrams();
      setRemaining(res.remaining);
      if (res.classified === 0) {
        toast.info("No questions to classify right now.");
      } else {
        toast.success(
          `Classified ${res.classified} question${res.classified !== 1 ? "s" : ""}, generated ${res.generated} diagram${res.generated !== 1 ? "s" : ""}` +
            (res.remaining > 0 ? ` — ${res.remaining} more remaining` : " — all done!")
        );
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClassify}
      disabled={isPending}
      className="text-violet-700 border-violet-200 hover:bg-violet-50"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <Wand2 className="h-3.5 w-3.5 mr-1.5" />
      )}
      {isPending ? "Classifying…" : `Classify ${remaining} questions`}
    </Button>
  );
}
