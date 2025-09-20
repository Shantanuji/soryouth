/*
  Warnings:

  - You are about to drop the column `externalId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the `IntegrationSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "externalId";

-- DropTable
DROP TABLE "IntegrationSetting";
