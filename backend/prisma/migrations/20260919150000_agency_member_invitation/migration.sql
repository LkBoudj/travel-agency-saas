-- Consent-based member invitation.
--
-- Invitations replace the removed "add member" provisioning with a consent
-- flow: the agency invites an EMAIL address, the address accepts with a secret
-- redemption token it received out-of-band (email). Two privacy properties are
-- enforced here:
--
--   * `email` is NOT a foreign key to `app_user` — the schema must not be able
--     to answer "does this address already exist?" at creation time. Acceptance
--     decides existing vs new in one interactive transaction.
--   * only the SHA-256 hex digest of the redemption token is stored
--     (`token_hash`). The plaintext lives only in the delivery channel and is
--     never persisted, returned by an API, or logged.
--
-- Lifecycle statuses are constrained exactly like every other status column:
-- PENDING -> ACCEPTED / REVOKED / EXPIRED. "At most one outstanding invitation
-- per address per agency" is a partial unique index (not expressible in PSL).

CREATE TABLE "agency_member_invitation" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "email" CITEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_by_user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_member_invitation_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary, the way every other status column is constrained.
ALTER TABLE "agency_member_invitation"
  ADD CONSTRAINT "agency_member_invitation_status_check"
  CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'));

-- The agency disappears -> its outstanding invitations disappear with it.
-- The inviter is an AppUser code-carrying actor.
ALTER TABLE "agency_member_invitation" ADD CONSTRAINT "agency_member_invitation_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_member_invitation" ADD CONSTRAINT "agency_member_invitation_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The roles offered by an invitation, captured at creation time.
CREATE TABLE "agency_member_invitation_role" (
    "invitation_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,

    CONSTRAINT "agency_member_invitation_role_pkey" PRIMARY KEY ("invitation_id","role_id")
);

ALTER TABLE "agency_member_invitation_role" ADD CONSTRAINT "agency_member_invitation_role_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "agency_member_invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_member_invitation_role" ADD CONSTRAINT "agency_member_invitation_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique + routing indexes.
CREATE UNIQUE INDEX "agency_member_invitation_code_key" ON "agency_member_invitation"("code");

CREATE UNIQUE INDEX "agency_member_invitation_token_hash_key" ON "agency_member_invitation"("token_hash");

-- At most one outstanding invitation per address per agency.
CREATE UNIQUE INDEX "agency_member_invitation_pending_agency_email_key"
  ON "agency_member_invitation" ("agency_id", "email")
  WHERE "status" = 'PENDING';

CREATE INDEX "agency_member_invitation_agency_status_idx" ON "agency_member_invitation"("agency_id", "status");

CREATE INDEX "agency_member_invitation_agency_email_idx" ON "agency_member_invitation"("agency_id", "email");

CREATE INDEX "agency_member_invitation_role_role_id_idx" ON "agency_member_invitation_role"("role_id");

-- ---------------------------------------------------------------------------
-- Tenant isolation for the roles an invitation offers.
-- ---------------------------------------------------------------------------
-- Mirrors `assert_agency_role_assignment_scope` from the
-- `agency_role_assignment_scope` migration: an invitation may only offer roles
-- that are AGENCY-scoped and, when custom, owned by the invitation's own
-- agency. A PLATFORM role or another agency's custom role is rejected at the
-- database, so the authorization service's own filter and the literal row
-- cannot disagree.

CREATE OR REPLACE FUNCTION "assert_agency_invitation_role_scope"() RETURNS trigger AS $$
DECLARE
  invitation_agency_id bigint;
  role_scope text;
  role_agency_id bigint;
BEGIN
  SELECT i."agency_id" INTO invitation_agency_id
    FROM "agency_member_invitation" i WHERE i."id" = NEW."invitation_id";

  SELECT r."scope", r."agency_id" INTO role_scope, role_agency_id
    FROM "role" r WHERE r."id" = NEW."role_id";

  IF role_scope IS DISTINCT FROM 'AGENCY' THEN
    RAISE EXCEPTION
      'AGENCY_INVITATION_ROLE_SCOPE_INVALID: only AGENCY-scoped roles can be offered by an invitation'
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- NULL agency_id is a global agency role and is valid everywhere; a custom
  -- role is valid only inside the agency that owns it.
  IF role_agency_id IS NOT NULL AND role_agency_id IS DISTINCT FROM invitation_agency_id THEN
    RAISE EXCEPTION
      'AGENCY_INVITATION_ROLE_FOREIGN_AGENCY: role % belongs to another agency and cannot be offered by invitation %',
      NEW."role_id", NEW."invitation_id"
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "agency_member_invitation_role_scope"
  BEFORE INSERT OR UPDATE ON "agency_member_invitation_role"
  FOR EACH ROW EXECUTE FUNCTION "assert_agency_invitation_role_scope"();