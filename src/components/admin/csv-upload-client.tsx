"use client";

import { useState, useCallback, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { uploadQuestionsFromFile } from "@/app/actions/admin";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import type { Subject } from "@prisma/client";

interface UploadPageClientProps {
  subjects: Subject[];
}

interface ParsedQuestion {
  row: number;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  difficulty: string;
  topic: string;
  explanation?: string;
  valid: boolean;
  error?: string;
}

interface UploadResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export function CsvUploadClient({ subjects }: UploadPageClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UploadResult | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
  });

  const handleUpload = () => {
    if (!file || !subjectId) {
      toast.error("Please select a file and a subject.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subjectId", subjectId);

      const res = await uploadQuestionsFromFile(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setResult(res.result!);
      toast.success(`Imported ${res.result!.imported} questions successfully`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Format guide */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Required columns (CSV/Excel)</p>
              <p className="text-xs text-blue-700 font-mono bg-blue-100 px-2 py-1 rounded">
                stem, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D), difficulty (EASY/MEDIUM/HARD), topic, explanation (optional)
              </p>
              <Button size="sm" variant="link" className="text-blue-600 px-0 h-auto mt-1 text-xs">
                Download template →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject selector */}
      <div className="space-y-2">
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select a subject..." />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : file
              ? "border-green-400 bg-green-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-10 w-10 text-green-500" />
            <p className="font-medium text-green-700">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            <p className="text-xs text-gray-400">Click or drag to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-700">
              {isDragActive ? "Drop the file here" : "Drag & drop your CSV or Excel file"}
            </p>
            <p className="text-sm text-gray-400">or click to browse</p>
            <p className="text-xs text-gray-300">Max 10 MB · .csv, .xlsx, .xls</p>
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={handleUpload}
        disabled={!file || !subjectId || isPending}
      >
        {isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Import Questions</>
        )}
      </Button>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-gray-500">Total rows</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                <p className="text-xs text-gray-500">Skipped</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
                {result.errors.map((e) => (
                  <div key={e.row} className="flex gap-2 text-xs text-red-700 bg-red-50 px-3 py-2 rounded">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>Row {e.row}: {e.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
