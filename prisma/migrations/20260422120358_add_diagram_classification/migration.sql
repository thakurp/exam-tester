-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "diagramAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "diagramHint" TEXT,
ADD COLUMN     "diagramStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "diagramType" TEXT NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "canonicalImageUrl" TEXT;
