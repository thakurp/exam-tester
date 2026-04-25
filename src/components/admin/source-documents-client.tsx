"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bulkRegisterFromManifest } from "@/app/actions/source-documents";
import { SourceDocumentStatus } from "@prisma/client";

interface Doc {
  id: string;
  fileName: string;
  year: number | null;
  documentType: string;
  extractionStatus: string;
  fileSizeBytes: number | null;
  examProgram: { code: string; name: string } | null;
}

interface Props {
  docs: Doc[];
  total: number;
  page: number;
  pageSize: number;
  programs: { code: string; name: string }[];
  statusCounts: { status: string; count: number }[];
  currentProgram?: string;
  currentStatus?: string;
}

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: "bg-gray-100 text-gray-700",
  EXTRACTING: "bg-blue-100 text-blue-700",
  EXTRACTED: "bg-cyan-100 text-cyan-700",
  STRUCTURING: "bg-purple-100 text-purple-700",
  REVIEW_PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  QUESTION_PAPER: "Paper",
  INDIVIDUAL_QUESTION: "Question",
  ANSWER_KEY: "Answer Key",
  SCORING_GUIDELINE: "Scoring Guide",
  MARKING_SCHEME: "Marking Scheme",
  SAMPLE_RESPONSE: "Sample Response",
  EXAMINER_REPORT: "Examiner Report",
  SCORE_DISTRIBUTION: "Score Dist.",
  SCORING_STATISTICS: "Stats",
  SYLLABUS_SPECIFICATION: "Syllabus",
  OTHER: "Other",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SourceDocumentsClient({
  docs,
  total,
  page,
  pageSize,
  programs,
  statusCounts,
  currentProgram,
  currentStatus,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  function setFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams();
    if (currentProgram && key !== "program") params.set("program", currentProgram);
    if (currentStatus && key !== "status") params.set("status", currentStatus);
    if (value) params.set(key, value);
    params.set("page", "1");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function setPage(p: number) {
    const params = new URLSearchParams();
    if (currentProgram) params.set("program", currentProgram);
    if (currentStatus) params.set("status", currentStatus);
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function handleBulkImport() {
    setImporting(true);
    setImportResult(null);
    try {
      // The manifest CSV is at Sample Test Papers/manifest.csv in the project root
      const res = await fetch("/api/admin/source-documents/import-manifest", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setImportResult(`Error: ${data.error}`);
      } else {
        setImportResult(
          `Imported ${data.registered} documents, skipped ${data.skipped} duplicates.${
            data.errors?.length ? ` Errors: ${data.errors.slice(0, 3).join("; ")}` : ""
          }`
        );
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setImportResult(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + import */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Program filter */}
          <select
            value={currentProgram ?? ""}
            onChange={(e) => setFilter("program", e.target.value || undefined)}
            className="text-sm border rounded-md px-2 py-1.5 bg-white"
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={currentStatus ?? ""}
            onChange={(e) => setFilter("status", e.target.value || undefined)}
            className="text-sm border rounded-md px-2 py-1.5 bg-white"
          >
            <option value="">All Statuses</option>
            {statusCounts.map((s) => (
              <option key={s.status} value={s.status}>
                {s.status} ({s.count})
              </option>
            ))}
          </select>

          {(currentProgram || currentStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                startTransition(() => router.push(pathname));
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkImport}
          disabled={importing}
        >
          {importing ? "Importing…" : "Import AP manifest"}
        </Button>
      </div>

      {importResult && (
        <div
          className={`text-sm px-4 py-2 rounded-md ${
            importResult.startsWith("Error") || importResult.startsWith("Failed")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {importResult}
        </div>
      )}

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        {statusCounts.map((s) => (
          <span
            key={s.status}
            className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer ${
              currentStatus === s.status ? "ring-2 ring-offset-1 ring-indigo-400" : ""
            } ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-700"}`}
            onClick={() => setFilter("status", currentStatus === s.status ? undefined : s.status)}
          >
            {s.status}: {s.count}
          </span>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No documents found. Use &quot;Import AP manifest&quot; to register all 292 AP PDFs.
                    </td>
                  </tr>
                )}
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 max-w-sm truncate">
                      {doc.fileName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{doc.examProgram?.code ?? "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{doc.year ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[doc.documentType] ?? doc.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {formatBytes(doc.fileSizeBytes)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_COLORS[doc.extractionStatus] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {doc.extractionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
