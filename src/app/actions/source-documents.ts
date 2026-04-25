"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SourceDocumentType, SourceDocumentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Register a single source document
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  examProgramCode: z.string().min(1),
  subjectId: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  setNumber: z.coerce.number().int().min(1).optional(),
  questionNumber: z.coerce.number().int().min(1).optional(),
  documentType: z.nativeEnum(SourceDocumentType),
  fileName: z.string().min(1),
  localPath: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  permissionsStatus: z.enum(["INTERNAL", "LICENSED", "PUBLIC_DOMAIN"]).default("INTERNAL"),
});

export type RegisterSourceDocumentInput = z.infer<typeof registerSchema>;

export async function registerSourceDocument(input: RegisterSourceDocumentInput): Promise<{
  error?: string;
  id?: string;
}> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // Find the exam program
  const program = await prisma.examProgram.findUnique({
    where: { code: data.examProgramCode },
  });
  if (!program) return { error: `ExamProgram not found: ${data.examProgramCode}` };

  // Compute hash from local file if available
  let sha256Hash: string | undefined;
  let fileSizeBytes: number | undefined;
  if (data.localPath) {
    try {
      const buf = await readFile(data.localPath);
      sha256Hash = createHash("sha256").update(buf).digest("hex");
      fileSizeBytes = buf.length;

      // Deduplication check
      const existing = await prisma.sourceDocument.findFirst({
        where: { sha256Hash },
      });
      if (existing) {
        return { error: `Duplicate: file already registered as ${existing.id} (${existing.fileName})` };
      }
    } catch {
      // Local file not readable — register without hash (URL-only source)
    }
  }

  const doc = await prisma.sourceDocument.create({
    data: {
      examProgramId: program.id,
      subjectId: data.subjectId,
      year: data.year,
      setNumber: data.setNumber,
      questionNumber: data.questionNumber,
      documentType: data.documentType,
      fileName: data.fileName,
      localPath: data.localPath,
      sha256Hash,
      fileSizeBytes,
      sourceUrl: data.sourceUrl,
      permissionsStatus: data.permissionsStatus,
      extractionStatus: SourceDocumentStatus.REGISTERED,
    },
  });

  revalidatePath("/admin/source-documents");
  return { id: doc.id };
}

// ---------------------------------------------------------------------------
// Bulk register from manifest CSV rows
// ---------------------------------------------------------------------------

export interface ManifestRow {
  Subject: string;
  Year: string;
  File: string;
  SizeBytes: string;
}

function inferDocumentType(fileName: string): SourceDocumentType {
  const lower = fileName.toLowerCase();
  if (lower.includes("scoring-guideline") || lower.includes("sg")) return SourceDocumentType.SCORING_GUIDELINE;
  if (lower.includes("scoring-statistic")) return SourceDocumentType.SCORING_STATISTICS;
  if (lower.includes("score-distribution") || lower.includes("dist")) return SourceDocumentType.SCORE_DISTRIBUTION;
  if (lower.includes("chief-reader") || lower.includes("chief_reader")) return SourceDocumentType.EXAMINER_REPORT;
  if (lower.includes("sample-response") || lower.includes("sample_response")) return SourceDocumentType.SAMPLE_RESPONSE;
  if (lower.includes("frq") || lower.includes("free-response")) return SourceDocumentType.QUESTION_PAPER;
  if (lower.includes("mcq") || lower.includes("multiple-choice")) return SourceDocumentType.QUESTION_PAPER;
  return SourceDocumentType.QUESTION_PAPER;
}

function subjectCodeFromManifest(subject: string): string {
  const lower = subject.toLowerCase();
  if (lower.includes("macro")) return "AP_MACRO";
  if (lower.includes("micro")) return "AP_MICRO";
  return "AP_MACRO";
}

export async function bulkRegisterFromManifest(
  rows: ManifestRow[],
  basePath: string
): Promise<{ registered: number; skipped: number; errors: string[] }> {
  try {
    await requireAdmin();
  } catch {
    return { registered: 0, skipped: 0, errors: ["Unauthorized"] };
  }

  const program = await prisma.examProgram.findUnique({ where: { code: "AP" } });
  if (!program) return { registered: 0, skipped: 0, errors: ["ExamProgram AP not found"] };

  // Get all subjects for lookup
  const subjects = await prisma.subject.findMany({ where: { code: { in: ["AP_MACRO", "AP_MICRO"] } } });
  const subjectMap = new Map(subjects.map((s) => [s.code, s.id]));

  let registered = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const subjectCode = subjectCodeFromManifest(row.Subject);
      const subjectId = subjectMap.get(subjectCode);
      const year = parseInt(row.Year, 10);
      const fileName = row.File;
      const localPath = `${basePath}/${row.Subject}/${fileName}`;
      const documentType = inferDocumentType(fileName);

      // Compute hash
      let sha256Hash: string | undefined;
      let fileSizeBytes: number | undefined;
      try {
        const buf = await readFile(localPath);
        sha256Hash = createHash("sha256").update(buf).digest("hex");
        fileSizeBytes = buf.length;
      } catch {
        fileSizeBytes = row.SizeBytes ? parseInt(row.SizeBytes, 10) : undefined;
      }

      // Skip duplicates by hash
      if (sha256Hash) {
        const existing = await prisma.sourceDocument.findFirst({ where: { sha256Hash } });
        if (existing) {
          skipped++;
          continue;
        }
      }

      await prisma.sourceDocument.create({
        data: {
          examProgramId: program.id,
          subjectId,
          year: isNaN(year) ? undefined : year,
          documentType,
          fileName,
          localPath,
          sha256Hash,
          fileSizeBytes,
          permissionsStatus: "INTERNAL",
          extractionStatus: SourceDocumentStatus.REGISTERED,
        },
      });

      registered++;
    } catch (e) {
      errors.push(`${row.File}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  revalidatePath("/admin/source-documents");
  return { registered, skipped, errors };
}

// ---------------------------------------------------------------------------
// Update extraction status
// ---------------------------------------------------------------------------

export async function updateSourceDocumentStatus(
  id: string,
  status: SourceDocumentStatus
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Unauthorized" };
  }

  await prisma.sourceDocument.update({ where: { id }, data: { extractionStatus: status } });
  revalidatePath("/admin/source-documents");
  return {};
}
