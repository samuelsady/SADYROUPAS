-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- AlterEnum
ALTER TYPE "NotificationEvent" ADD VALUE 'INTEREST_CREATED';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "followUpAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'NEW',
    "message" TEXT,
    "contactedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestItem" (
    "id" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT,

    CONSTRAINT "InterestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interest_status_createdAt_idx" ON "Interest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Interest_customerId_idx" ON "Interest"("customerId");

-- CreateIndex
CREATE INDEX "InterestItem_interestId_idx" ON "InterestItem"("interestId");

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestItem" ADD CONSTRAINT "InterestItem_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestItem" ADD CONSTRAINT "InterestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
