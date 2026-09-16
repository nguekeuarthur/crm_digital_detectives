-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('ADMIN', 'EXCHANGES', 'CONTRACTS', 'CLIENT_DOCS', 'EVIDENCE', 'RESEARCH', 'AI_NOTES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('NIKON_CLOUD', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SubcontractorStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FolderType" NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "exifData" JSONB,
    "geoLat" DECIMAL(10,7),
    "geoLng" DECIMAL(10,7),
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "observerUserId" TEXT,
    "description" TEXT,
    "capturedAt" TIMESTAMP(3),
    "location" TEXT,
    "source" "EvidenceSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "mandateId" TEXT NOT NULL,
    "hoursWorked" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "SubcontractorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Folder_mandateId_idx" ON "Folder"("mandateId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "File_folderId_idx" ON "File"("folderId");

-- CreateIndex
CREATE INDEX "File_uploadedBy_idx" ON "File"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "File_storagePath_key" ON "File"("storagePath");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_fileId_key" ON "Evidence"("fileId");

-- CreateIndex
CREATE INDEX "Evidence_mandateId_idx" ON "Evidence"("mandateId");

-- CreateIndex
CREATE INDEX "Evidence_observerUserId_idx" ON "Evidence"("observerUserId");

-- CreateIndex
CREATE INDEX "Subcontractor_mandateId_idx" ON "Subcontractor"("mandateId");

-- CreateIndex
CREATE INDEX "Subcontractor_userId_idx" ON "Subcontractor"("userId");

-- CreateIndex
CREATE INDEX "Subcontractor_status_idx" ON "Subcontractor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontractor_userId_mandateId_key" ON "Subcontractor"("userId", "mandateId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_observerUserId_fkey" FOREIGN KEY ("observerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
