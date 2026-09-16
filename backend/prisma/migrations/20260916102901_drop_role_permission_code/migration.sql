/*
  Warnings:

  - You are about to drop the column `code` on the `permission` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `role` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "permission_code_key";

-- DropIndex
DROP INDEX "role_code_key";

-- AlterTable
ALTER TABLE "permission" DROP COLUMN "code";

-- AlterTable
ALTER TABLE "role" DROP COLUMN "code";
