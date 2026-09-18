-- Role technical key: a stable, human-meaningful identifier (uppercase snake
-- case) that is set on creation and immutable afterwards. Existing rows are
-- backfilled from their name before the NOT NULL + unique indexes are applied,
-- so this migration is safe on a non-empty `role` table.

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "role" ADD COLUMN "key" VARCHAR(64);

-- Backfill: derive an uppercase snake case key from the role name.
UPDATE "role"
SET "key" = left(regexp_replace(upper("name"), '[^A-Z0-9]+', '_', 'g'), 64);

-- Rows whose derived key is empty or does not start with a letter fall back to
-- a deterministic id-based key.
UPDATE "role"
SET "key" = 'ROLE_' || "id"
WHERE "key" IS NULL OR "key" !~ '^[A-Z][A-Z0-9_]*$';

-- Resolve collisions within the same ownership group by suffixing the id.
UPDATE "role" r
SET "key" = left(r."key", 40) || '_' || r."id"
WHERE EXISTS (
  SELECT 1 FROM "role" o
  WHERE o."id" < r."id"
    AND o."scope" = r."scope"
    AND o."key" = r."key"
    AND o."agency_id" IS NOT DISTINCT FROM r."agency_id"
);

ALTER TABLE "role" ALTER COLUMN "key" SET NOT NULL;

-- CreateIndex: key uniqueness mirrors name uniqueness (partial indexes).
-- Global keys (Platform roles and Global Agency roles) are unique per scope.
CREATE UNIQUE INDEX "role_global_key_key" ON "role"("scope", "key")
    WHERE "agency_id" IS NULL;

-- Custom keys are unique per owning agency.
CREATE UNIQUE INDEX "role_agency_key_key" ON "role"("agency_id", "key")
    WHERE "agency_id" IS NOT NULL;
