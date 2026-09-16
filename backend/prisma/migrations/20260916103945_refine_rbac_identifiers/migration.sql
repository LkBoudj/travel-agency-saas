/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `permission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `permission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "permission" ADD COLUMN     "key" VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "permission_key_key" ON "permission"("key");
