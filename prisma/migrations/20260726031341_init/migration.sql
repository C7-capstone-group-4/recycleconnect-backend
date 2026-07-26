-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HOUSEHOLD', 'COLLECTION_PARTNER', 'RECYCLING_ORG', 'ADMIN');

-- CreateEnum
CREATE TYPE "DeclarationStatus" AS ENUM ('READY', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SCHEDULED_COLLECTION', 'DROP_OFF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "device_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "service_zone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPartnerProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "badge_title" TEXT,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "dropoff_hours" TEXT,
    "service_zones" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionPartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingOrgProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingOrgProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMaterialPrice" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "price_per_kg" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMaterialPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSchedule" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "service_zone" TEXT NOT NULL,
    "collection_day" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledDeclaration" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "service_zone" TEXT NOT NULL,
    "status" "DeclarationStatus" NOT NULL DEFAULT 'READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTransaction" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "total_cash_paid" DOUBLE PRECISION NOT NULL,
    "is_confirmed_by_home" BOOLEAN NOT NULL DEFAULT false,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionItem" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "price_per_kg" DOUBLE PRECISION NOT NULL,
    "subtotal_cash" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdProfile_user_id_key" ON "HouseholdProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionPartnerProfile_user_id_key" ON "CollectionPartnerProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "RecyclingOrgProfile_user_id_key" ON "RecyclingOrgProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_name_key" ON "MaterialCategory"("name");

-- AddForeignKey
ALTER TABLE "HouseholdProfile" ADD CONSTRAINT "HouseholdProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionPartnerProfile" ADD CONSTRAINT "CollectionPartnerProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingOrgProfile" ADD CONSTRAINT "RecyclingOrgProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMaterialPrice" ADD CONSTRAINT "PartnerMaterialPrice_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "CollectionPartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMaterialPrice" ADD CONSTRAINT "PartnerMaterialPrice_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "MaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchedule" ADD CONSTRAINT "PartnerSchedule_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "CollectionPartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledDeclaration" ADD CONSTRAINT "ScheduledDeclaration_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "HouseholdProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledDeclaration" ADD CONSTRAINT "ScheduledDeclaration_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "CollectionPartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTransaction" ADD CONSTRAINT "CollectionTransaction_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "CollectionPartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTransaction" ADD CONSTRAINT "CollectionTransaction_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "HouseholdProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "CollectionTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "MaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
