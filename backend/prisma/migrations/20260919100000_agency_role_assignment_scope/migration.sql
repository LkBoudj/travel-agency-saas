-- Tenant isolation for agency role assignments.
--
-- Before this migration `agency_role_assignment(membership_id, role_id)` had two
-- foreign keys and nothing linking them: the database happily accepted
--
--   * a PLATFORM role assigned to an agency membership, and
--   * a CUSTOM role owned by agency A assigned to a membership in agency B.
--
-- The authorization service already refuses to count such a role, but a wrong
-- row could still exist and would surface anywhere the raw assignments are read.
-- The invariant belongs in the database.
--
-- Why a trigger and not a constraint: the rule spans three tables
-- (assignment -> membership.agency_id, assignment -> role.agency_id/scope), and
-- a CHECK cannot read other tables. A composite foreign key cannot express it
-- either, because a GLOBAL agency role has `agency_id IS NULL`: MATCH SIMPLE
-- would skip the check entirely for those rows, and MATCH FULL cannot represent
-- them at all. Two small BEFORE triggers are the proportionate mechanism.

CREATE OR REPLACE FUNCTION "assert_agency_role_assignment_scope"() RETURNS trigger AS $$
DECLARE
  membership_agency_id bigint;
  role_scope text;
  role_agency_id bigint;
BEGIN
  SELECT m."agency_id" INTO membership_agency_id
    FROM "agency_membership" m WHERE m."id" = NEW."membership_id";

  SELECT r."scope", r."agency_id" INTO role_scope, role_agency_id
    FROM "role" r WHERE r."id" = NEW."role_id";

  IF role_scope IS DISTINCT FROM 'AGENCY' THEN
    RAISE EXCEPTION
      'AGENCY_ROLE_SCOPE_INVALID: only AGENCY-scoped roles can be assigned to an agency membership'
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- NULL agency_id is a global agency role and is valid everywhere; a custom
  -- role is valid only inside the agency that owns it.
  IF role_agency_id IS NOT NULL AND role_agency_id IS DISTINCT FROM membership_agency_id THEN
    RAISE EXCEPTION
      'AGENCY_ROLE_FOREIGN_AGENCY: role % belongs to another agency and cannot be assigned in agency %',
      NEW."role_id", membership_agency_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "agency_role_assignment_scope"
  BEFORE INSERT OR UPDATE ON "agency_role_assignment"
  FOR EACH ROW EXECUTE FUNCTION "assert_agency_role_assignment_scope"();

-- The check above runs when the assignment is written. A role could otherwise be
-- moved to another agency, or out of AGENCY scope, AFTER it was validly
-- assigned, silently turning existing rows into cross-tenant grants.
CREATE OR REPLACE FUNCTION "protect_assigned_agency_role_scope"() RETURNS trigger AS $$
BEGIN
  IF OLD."scope" IS NOT DISTINCT FROM NEW."scope"
     AND OLD."agency_id" IS NOT DISTINCT FROM NEW."agency_id" THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM "agency_role_assignment" a WHERE a."role_id" = OLD."id") THEN
    RAISE EXCEPTION
      'AGENCY_ROLE_IN_USE: the scope or owning agency of role % cannot change while it is assigned to a membership',
      OLD."id"
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "role_protect_assigned_scope"
  BEFORE UPDATE ON "role"
  FOR EACH ROW EXECUTE FUNCTION "protect_assigned_agency_role_scope"();
