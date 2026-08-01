/*
  Warnings:

  - You are about to drop the column `company_name` on the `CollectionPartnerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `CollectionPartnerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `service_zones` on the `CollectionPartnerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `is_confirmed_by_home` on the `CollectionTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `total_cash_paid` on the `CollectionTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `HouseholdProfile` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `HouseholdProfile` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `HouseholdProfile` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `PartnerSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `service_zone` on the `PartnerSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `service_zone` on the `ScheduledDeclaration` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ScheduledDeclaration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reference_code]` on the table `HouseholdProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `business_name` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_numer` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_photo_url` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_type` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landmark` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_area` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storage_capacity` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle_type` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seller_type` to the `CollectionTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `CollectionTransaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `transaction_type` on the `CollectionTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `area` to the `HouseholdProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `HouseholdProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landmark` to the `HouseholdProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference_code` to the `HouseholdProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `HouseholdProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_area` to the `PartnerSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contact_name` to the `RecyclingOrgProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_area` to the `ScheduledDeclaration` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('EXISTING_OPERATOR', 'NEW_ENTRANT');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('REGISTERED_HOUSEHOLD', 'GENERAL_UNREGISTERED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- AlterTable
ALTER TABLE "CollectionPartnerProfile" DROP COLUMN "company_name",
DROP COLUMN "is_verified",
DROP COLUMN "service_zones",
ADD COLUMN     "business_name" TEXT NOT NULL,
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "id_numer" TEXT NOT NULL,
ADD COLUMN     "id_photo_url" TEXT NOT NULL,
ADD COLUMN     "id_type" TEXT NOT NULL,
ADD COLUMN     "landmark" TEXT NOT NULL,
ADD COLUMN     "partner_type" "PartnerType" NOT NULL DEFAULT 'EXISTING_OPERATOR',
ADD COLUMN     "service_area" TEXT NOT NULL,
ADD COLUMN     "storage_capacity" TEXT NOT NULL,
ADD COLUMN     "vehicle_type" TEXT NOT NULL,
ALTER COLUMN "badge_title" SET DEFAULT 'Verified Partner';

-- AlterTable
ALTER TABLE "CollectionTransaction" DROP COLUMN "is_confirmed_by_home",
DROP COLUMN "total_cash_paid",
ADD COLUMN     "seller_type" "SellerType" NOT NULL,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
ADD COLUMN     "total_amount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "household_id" DROP NOT NULL,
DROP COLUMN "transaction_type",
ADD COLUMN     "transaction_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "HouseholdProfile" DROP COLUMN "address",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "area" TEXT NOT NULL,
ADD COLUMN     "bank_account_no" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "landmark" TEXT NOT NULL,
ADD COLUMN     "loyalty_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reference_code" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "tier_status" TEXT NOT NULL DEFAULT 'BRONZE';

-- AlterTable
ALTER TABLE "PartnerSchedule" DROP COLUMN "notes",
DROP COLUMN "service_zone",
ADD COLUMN     "service_area" TEXT NOT NULL,
ADD COLUMN     "time_window" TEXT;

-- AlterTable
ALTER TABLE "RecyclingOrgProfile" ADD COLUMN     "contact_name" TEXT NOT NULL,
ADD COLUMN     "materials_of_interest" TEXT[];

-- AlterTable
ALTER TABLE "ScheduledDeclaration" DROP COLUMN "service_zone",
DROP COLUMN "status",
ADD COLUMN     "materials" TEXT[],
ADD COLUMN     "service_area" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pin_hash" TEXT,
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'APPROVED',
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- DropEnum
DROP TYPE "DeclarationStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "paystack_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "admin_notes" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclerInterest" (
    "id" TEXT NOT NULL,
    "recycler_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "estimated_kg" DOUBLE PRECISION NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'PENDING',
    "paystack_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclerInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_user_id_key" ON "Wallet"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_paystack_ref_key" ON "WalletTransaction"("paystack_ref");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclerInterest_paystack_ref_key" ON "RecyclerInterest"("paystack_ref");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdProfile_reference_code_key" ON "HouseholdProfile"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "CollectionTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "HouseholdProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclerInterest" ADD CONSTRAINT "RecyclerInterest_recycler_id_fkey" FOREIGN KEY ("recycler_id") REFERENCES "RecyclingOrgProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclerInterest" ADD CONSTRAINT "RecyclerInterest_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "CollectionPartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
