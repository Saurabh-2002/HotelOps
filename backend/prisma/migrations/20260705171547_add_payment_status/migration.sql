-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID_CASH', 'POSTED_TO_ROOM');

-- AlterTable
ALTER TABLE "PosOrder" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
