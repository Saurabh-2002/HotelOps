-- AlterTable
ALTER TABLE "Folio" ADD COLUMN "invoiceSnapshot" JSONB;
ALTER TABLE "Folio" ADD COLUMN "snapshotVersion" INTEGER;
ALTER TABLE "Folio" ADD COLUMN "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Folio_bookingId_key" ON "Folio"("bookingId");
