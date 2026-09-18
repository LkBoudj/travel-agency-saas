-- Security audit trail (append-only).
--
-- No foreign keys to app_user or agency on purpose: an audit record must
-- outlive the row it describes, and ON DELETE CASCADE would destroy precisely
-- the history an investigation depends on. Subjects are referenced by their
-- stable public code instead.
CREATE TABLE "audit_log" (
  "id"          BIGSERIAL     NOT NULL,
  "action"      VARCHAR(64)   NOT NULL,
  "outcome"     VARCHAR(16)   NOT NULL,
  "actor_code"  VARCHAR(24),
  "agency_code" VARCHAR(24),
  "target_code" VARCHAR(24),
  "target_hash" VARCHAR(64),
  "metadata"    JSONB,
  "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- Constrain the outcome vocabulary at the database, the way every other status
-- column in this schema is constrained.
ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_log_outcome_check"
  CHECK ("outcome" IN ('SUCCESS', 'DENIED', 'FAILURE'));

CREATE INDEX "audit_log_action_created_at_idx"      ON "audit_log" ("action", "created_at");
CREATE INDEX "audit_log_actor_code_created_at_idx"  ON "audit_log" ("actor_code", "created_at");
CREATE INDEX "audit_log_agency_code_created_at_idx" ON "audit_log" ("agency_code", "created_at");
