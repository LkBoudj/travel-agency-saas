-- Agency Ownership Foundation
--
-- Makes the database the final source of truth for the ownership invariants:
--
--   1. a role can carry a PROTECTED system identity (`role.system_key`) that
--      cannot be renamed into another identity, converted into a custom agency
--      role, cleared, or deleted;
--   2. every agency has EXACTLY ONE OWNER membership;
--   3. that OWNER is ACTIVE;
--   4. that OWNER holds the canonical global AGENCY_ADMIN system role.
--
-- Ownership (`agency_membership.membership_type`) is deliberately separate from
-- authorization (`permission.key`): OWNER is who owns the agency, AGENCY_ADMIN
-- is a permission bundle an EMPLOYEE may hold too. Nothing here authorizes
-- anything -- `system_key` only marks protected system semantics.
--
-- "At most one OWNER" uses a partial unique index, which is ALWAYS immediate and
-- can never be DEFERRABLE. "At least one OWNER" therefore uses a separate
-- DEFERRED constraint trigger, so a future ownership transfer can run
-- (demote old owner -> promote new owner -> COMMIT) inside one transaction.

-- ---------------------------------------------------------------------------
-- 1. Protected system identity on `role`
-- ---------------------------------------------------------------------------

ALTER TABLE "role" ADD COLUMN "system_key" VARCHAR(64);

-- One row per system identity.
CREATE UNIQUE INDEX "role_system_key_key"
  ON "role" ("system_key")
  WHERE "system_key" IS NOT NULL;

-- A system identity must be one we know about AND must satisfy that identity's
-- required shape. This is what forbids converting the canonical role into a
-- custom agency role (agency_id) or moving it to another scope.
ALTER TABLE "role"
  ADD CONSTRAINT "role_system_key_shape_check"
  CHECK (
    "system_key" IS NULL
    OR (
      "system_key" = 'AGENCY_ADMIN'
      AND "scope" = 'AGENCY'
      AND "agency_id" IS NULL
    )
  );

-- Deterministic backfill: the canonical global agency role already seeded by
-- `DEFAULT_GLOBAL_AGENCY_ROLES` (scope = AGENCY, agency_id IS NULL, the full
-- AGENCY permission bundle) becomes the AGENCY_ADMIN system role. No role is
-- created here and no ownership is invented; if the seed has never run this
-- simply updates zero rows and `prisma db seed` establishes it afterwards.
UPDATE "role"
   SET "system_key" = 'AGENCY_ADMIN'
 WHERE "scope" = 'AGENCY'
   AND "agency_id" IS NULL
   AND "key" = 'AGENCY_OWNER';

-- Immutability + undeletability of a system identity.
CREATE OR REPLACE FUNCTION "protect_role_system_identity"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."system_key" IS NOT NULL THEN
      RAISE EXCEPTION
        'SYSTEM_ROLE_PROTECTED: role % carries system identity % and cannot be deleted',
        OLD."id", OLD."system_key"
        USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."system_key" IS NOT NULL
     AND NEW."system_key" IS DISTINCT FROM OLD."system_key" THEN
    RAISE EXCEPTION
      'SYSTEM_ROLE_PROTECTED: the system identity of role % cannot be changed or cleared',
      OLD."id"
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "role_protect_system_identity"
  BEFORE UPDATE OR DELETE ON "role"
  FOR EACH ROW EXECUTE FUNCTION "protect_role_system_identity"();

-- ---------------------------------------------------------------------------
-- 2. Explicit ownership on `agency_membership`
-- ---------------------------------------------------------------------------

-- Added with a temporary default so the column can be NOT NULL on existing
-- rows; the default is dropped below so every future write is explicit.
ALTER TABLE "agency_membership"
  ADD COLUMN "membership_type" VARCHAR(16) NOT NULL DEFAULT 'EMPLOYEE';

-- Deterministic backfill. Before this migration the only way an
-- `agency_membership` row could exist was the agency application approval
-- transaction, which creates exactly one membership -- the applicant, i.e. the
-- owner. That is promoted. Anything the data does not determine is a hard stop:
-- owners are never invented.
DO $$
DECLARE
  ambiguous_agencies bigint;
  ownerless_agencies bigint;
BEGIN
  SELECT count(*) INTO ambiguous_agencies
    FROM (
      SELECT "agency_id"
        FROM "agency_membership"
       GROUP BY "agency_id"
      HAVING count(*) > 1
    ) AS multi;

  IF ambiguous_agencies > 0 THEN
    RAISE EXCEPTION
      'AGENCY_OWNER_BACKFILL_AMBIGUOUS: % agency/agencies already have more than one membership; ownership cannot be derived deterministically. Resolve ownership manually before applying this migration.',
      ambiguous_agencies;
  END IF;

  UPDATE "agency_membership" SET "membership_type" = 'OWNER';

  SELECT count(*) INTO ownerless_agencies
    FROM "agency" a
   WHERE NOT EXISTS (
     SELECT 1 FROM "agency_membership" m
      WHERE m."agency_id" = a."id"
        AND m."membership_type" = 'OWNER'
   );

  IF ownerless_agencies > 0 THEN
    RAISE EXCEPTION
      'AGENCY_WITHOUT_OWNER: % agency/agencies have no membership to promote; an owner cannot be invented. Create the owning membership manually before applying this migration.',
      ownerless_agencies;
  END IF;
END $$;

ALTER TABLE "agency_membership" ALTER COLUMN "membership_type" DROP DEFAULT;

ALTER TABLE "agency_membership"
  ADD CONSTRAINT "agency_membership_type_check"
  CHECK ("membership_type" IN ('OWNER', 'EMPLOYEE'));

-- An OWNER membership can never be SUSPENDED. Suspending the BUSINESS is
-- `agency.status`; membership suspension is not a substitute for it.
ALTER TABLE "agency_membership"
  ADD CONSTRAINT "agency_membership_owner_active_check"
  CHECK ("membership_type" <> 'OWNER' OR "status" = 'ACTIVE');

-- At most one OWNER per agency. Immediate by nature -- never deferrable.
CREATE UNIQUE INDEX "agency_membership_owner_key"
  ON "agency_membership" ("agency_id")
  WHERE "membership_type" = 'OWNER';

CREATE INDEX "agency_membership_type_idx"
  ON "agency_membership" ("agency_id", "membership_type");

-- ---------------------------------------------------------------------------
-- 3. Deferred ownership invariants
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "assert_agency_ownership_invariants"(target_agency_id bigint)
RETURNS void AS $$
DECLARE
  owner_count integer;
  owner_row "agency_membership"%ROWTYPE;
BEGIN
  -- The agency may legitimately have been deleted in the same transaction.
  IF NOT EXISTS (SELECT 1 FROM "agency" WHERE "id" = target_agency_id) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO owner_count
    FROM "agency_membership"
   WHERE "agency_id" = target_agency_id
     AND "membership_type" = 'OWNER';

  IF owner_count = 0 THEN
    RAISE EXCEPTION
      'AGENCY_REQUIRES_OWNER: agency % has no OWNER membership', target_agency_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Unreachable while `agency_membership_owner_key` exists; asserted so the two
  -- halves of "exactly one" are stated in one place.
  IF owner_count > 1 THEN
    RAISE EXCEPTION
      'AGENCY_REQUIRES_SINGLE_OWNER: agency % has % OWNER memberships',
      target_agency_id, owner_count
      USING ERRCODE = 'restrict_violation';
  END IF;

  SELECT * INTO owner_row
    FROM "agency_membership"
   WHERE "agency_id" = target_agency_id
     AND "membership_type" = 'OWNER';

  IF owner_row."status" <> 'ACTIVE' THEN
    RAISE EXCEPTION
      'OWNER_CANNOT_BE_SUSPENDED: the OWNER of agency % must stay ACTIVE', target_agency_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Only the protected system identity satisfies this -- never a role merely
  -- named or keyed like it, and never a custom agency role.
  IF NOT EXISTS (
    SELECT 1
      FROM "agency_role_assignment" ara
      JOIN "role" r ON r."id" = ara."role_id"
     WHERE ara."membership_id" = owner_row."id"
       AND r."system_key" = 'AGENCY_ADMIN'
  ) THEN
    RAISE EXCEPTION
      'OWNER_REQUIRES_AGENCY_ADMIN: the OWNER of agency % does not hold the canonical AGENCY_ADMIN system role',
      target_agency_id
      USING ERRCODE = 'restrict_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "agency_ownership_guard"() RETURNS trigger AS $$
DECLARE
  target_agency_id bigint;
  previous_agency_id bigint;
BEGIN
  IF TG_TABLE_NAME = 'agency' THEN
    target_agency_id := NEW."id";

  ELSIF TG_TABLE_NAME = 'agency_membership' THEN
    IF TG_OP = 'DELETE' THEN
      target_agency_id := OLD."agency_id";
    ELSE
      target_agency_id := NEW."agency_id";
      IF TG_OP = 'UPDATE' AND OLD."agency_id" IS DISTINCT FROM NEW."agency_id" THEN
        PERFORM "assert_agency_ownership_invariants"(OLD."agency_id");
      END IF;
    END IF;

  ELSE -- agency_role_assignment
    IF TG_OP = 'DELETE' THEN
      SELECT m."agency_id" INTO target_agency_id
        FROM "agency_membership" m WHERE m."id" = OLD."membership_id";
    ELSE
      SELECT m."agency_id" INTO target_agency_id
        FROM "agency_membership" m WHERE m."id" = NEW."membership_id";

      IF TG_OP = 'UPDATE' AND OLD."membership_id" IS DISTINCT FROM NEW."membership_id" THEN
        SELECT m."agency_id" INTO previous_agency_id
          FROM "agency_membership" m WHERE m."id" = OLD."membership_id";
        IF previous_agency_id IS NOT NULL THEN
          PERFORM "assert_agency_ownership_invariants"(previous_agency_id);
        END IF;
      END IF;
    END IF;

    -- The membership itself is gone; its own trigger covers the agency.
    IF target_agency_id IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  PERFORM "assert_agency_ownership_invariants"(target_agency_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- DEFERRED so ordering inside one transaction is free:
--   create agency -> create OWNER membership -> assign AGENCY_ADMIN -> COMMIT
-- and, later, demote old owner -> promote new owner -> COMMIT.
CREATE CONSTRAINT TRIGGER "agency_ownership_invariants"
  AFTER INSERT ON "agency"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "agency_ownership_guard"();

CREATE CONSTRAINT TRIGGER "agency_ownership_invariants"
  AFTER INSERT OR UPDATE OR DELETE ON "agency_membership"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "agency_ownership_guard"();

CREATE CONSTRAINT TRIGGER "agency_ownership_invariants"
  AFTER INSERT OR UPDATE OR DELETE ON "agency_role_assignment"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "agency_ownership_guard"();
