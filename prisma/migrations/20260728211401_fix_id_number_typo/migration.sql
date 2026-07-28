/*
  Warnings:

  - You are about to drop the column `id_numer` on the `CollectionPartnerProfile` table. All the data in the column will be lost.
  - Added the required column `id_number` to the `CollectionPartnerProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CollectionPartnerProfile" DROP COLUMN "id_numer",
ADD COLUMN     "id_number" TEXT NOT NULL;
