/*
  Warnings:

  - A unique constraint covering the columns `[parentDealId]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Deal_parentDealId_key" ON "Deal"("parentDealId");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_parentDealId_fkey" FOREIGN KEY ("parentDealId") REFERENCES "Deal"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
