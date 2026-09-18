-- Role ownership: `scope` + `agency_id` encode all three role kinds without an
-- extra boolean:
--   scope='PLATFORM', agency_id IS NULL -> Platform Role (global)
--   scope='AGENCY',   agency_id IS NULL -> Global Agency Role (Platform-Admin-managed)
--   scope='AGENCY',   agency_id = X     -> Custom Agency Role owned by agency X
--
-- `role_scope_check` (added in 20260916101639) already restricts `scope`. This
-- migration adds the ownership column, the scope/ownership invariant, and the
-- name-uniqueness rules, then leaves PLATFORM role behavior unchanged.

-- AlterTable
ALTER TABLE "role" ADD COLUMN     "agency_id" BIGINT;

-- CreateIndex
CREATE INDEX "role_agency_id_idx" ON "role"("agency_id");

-- Ownership is only meaningful for AGENCY roles: PLATFORM roles are always global.
-- agency_id is intentionally NOT a foreign key yet — the `agency` table does not
-- exist (Group 2). Add `role_agency_id_fkey` (ON DELETE CASCADE) in the migration
-- that introduces `agency`.
ALTER TABLE "role" ADD CONSTRAINT "role_agency_scope_check"
    CHECK ("agency_id" IS NULL OR "scope" = 'AGENCY');

-- DropIndex: the old (scope, name) unique also constrained custom roles, so two
-- agencies could not both own a role named e.g. "Visa Officer".
DROP INDEX "role_scope_name_key";

-- Global names (Platform roles and Global Agency roles) are unique per scope.
CREATE UNIQUE INDEX "role_global_name_key" ON "role"("scope", "name")
    WHERE "agency_id" IS NULL;

-- Custom names are unique per owning agency (scope is guaranteed AGENCY by the
-- `role_agency_scope_check` constraint above).
CREATE UNIQUE INDEX "role_agency_name_key" ON "role"("agency_id", "name")
    WHERE "agency_id" IS NOT NULL;
