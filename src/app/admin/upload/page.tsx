export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { CsvUploadClient } from "@/components/admin/csv-upload-client";

export default async function UploadPage() {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Upload Questions</h1>
        <p className="text-gray-500 mt-1">Import questions in bulk via CSV or Excel spreadsheet.</p>
      </div>
      <CsvUploadClient subjects={subjects} />
    </div>
  );
}
