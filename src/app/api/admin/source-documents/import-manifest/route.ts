import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { bulkRegisterFromManifest, ManifestRow } from "@/app/actions/source-documents";
import { readFile } from "fs/promises";
import { join } from "path";
import Papa from "papaparse";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manifestPath = join(process.cwd(), "Sample Test Papers", "manifest.csv");
  let csv: string;
  try {
    csv = await readFile(manifestPath, "utf8");
  } catch {
    return NextResponse.json({ error: "manifest.csv not found at Sample Test Papers/manifest.csv" }, { status: 404 });
  }

  const { data, errors: parseErrors } = Papa.parse<ManifestRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0) {
    return NextResponse.json({ error: `CSV parse error: ${parseErrors[0].message}` }, { status: 400 });
  }

  const basePath = join(process.cwd(), "Sample Test Papers");
  const result = await bulkRegisterFromManifest(data, basePath);

  return NextResponse.json(result);
}
