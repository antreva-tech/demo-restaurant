-- CreateEnum
CREATE TYPE "OrderPaymentChannel" AS ENUM ('CASH', 'TRANSFER', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CARDNET', 'AZUL', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentIntegrationType" AS ENUM ('CARD_LINK', 'TERMINAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TerminalEntryType" AS ENUM ('MANUAL_APPROVAL_CODE');

-- AlterTable Restaurant: payment channel toggles
ALTER TABLE "Restaurant" ADD COLUMN "allowCash" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN "allowTransfer" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN "allowCard" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Order: paymentChannel
ALTER TABLE "Order" ADD COLUMN "paymentChannel" "OrderPaymentChannel";

-- Backfill paymentChannel from paymentMethod for existing PAID orders
UPDATE "Order"
SET "paymentChannel" = CASE
  WHEN "paymentMethod" = 'CASH' THEN 'CASH'::"OrderPaymentChannel"
  WHEN "paymentMethod" = 'CARD' THEN 'CARD'::"OrderPaymentChannel"
  WHEN "paymentMethod" = 'TRANSFER' THEN 'TRANSFER'::"OrderPaymentChannel"
  WHEN "paymentMethod" = 'MIXED' THEN 'CASH'::"OrderPaymentChannel"
  ELSE NULL
END
WHERE "status" = 'PAID' AND "paymentChannel" IS NULL;

-- CreateTable PaymentIntegration
CREATE TABLE "PaymentIntegration" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "type" "PaymentIntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "type" "PaymentIntegrationType" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "approvalCode" TEXT,
    "last4" TEXT,
    "metadataJson" JSONB,
    "succeededAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "PaymentIntegration_restaurantId_idx" ON "PaymentIntegration"("restaurantId");

-- CreateIndex
CREATE INDEX "PaymentIntegration_locationId_idx" ON "PaymentIntegration"("locationId");

-- CreateIndex
CREATE INDEX "Payment_restaurantId_idx" ON "Payment"("restaurantId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");

-- AddForeignKey
ALTER TABLE "PaymentIntegration" ADD CONSTRAINT "PaymentIntegration_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntegration" ADD CONSTRAINT "PaymentIntegration_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
