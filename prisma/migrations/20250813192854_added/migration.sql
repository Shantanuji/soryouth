/*
  Warnings:

  - You are about to drop the column `createdAt` on the `IntegrationSetting` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `IntegrationSetting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "IntegrationSetting" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "defaultAssignedToId" TEXT;
