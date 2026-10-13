-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('STORE_PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'STORE_PICKUP',
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "pickedUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "ownerAlertWhatsapp" BOOLEAN NOT NULL DEFAULT true;
