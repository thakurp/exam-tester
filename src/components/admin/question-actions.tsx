"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { publishQuestion, unpublishQuestion, deleteQuestion } from "@/app/actions/admin";
import { toast } from "sonner";
import { MoreHorizontal, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import type { QuestionStatus } from "@prisma/client";

interface QuestionActionsProps {
  questionId: string;
  currentStatus: QuestionStatus;
}

export function QuestionActions({ questionId, currentStatus }: QuestionActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      try {
        await publishQuestion(questionId);
        toast.success("Question published");
      } catch {
        toast.error("Failed to publish");
      }
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      try {
        await unpublishQuestion(questionId);
        toast.success("Question moved to drafts");
      } catch {
        toast.error("Failed to unpublish");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteQuestion(questionId);
        toast.success("Question archived");
      } catch {
        toast.error("Failed to archive");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/questions/${questionId}/edit`}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Link>
        </DropdownMenuItem>
        {currentStatus === "DRAFT" && (
          <DropdownMenuItem onClick={handlePublish}>
            <Eye className="h-4 w-4 mr-2" /> Publish
          </DropdownMenuItem>
        )}
        {currentStatus === "PUBLISHED" && (
          <DropdownMenuItem onClick={handleUnpublish}>
            <EyeOff className="h-4 w-4 mr-2" /> Unpublish
          </DropdownMenuItem>
        )}
        {currentStatus !== "ARCHIVED" && (
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
