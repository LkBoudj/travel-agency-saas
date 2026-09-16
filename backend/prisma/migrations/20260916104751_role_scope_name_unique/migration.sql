/*
  Warnings:

  - A unique constraint covering the columns `[scope,name]` on the table `role` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "role_scope_name_key" ON "role"("scope", "name");
