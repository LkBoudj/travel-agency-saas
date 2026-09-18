-- Agency Application flow foundation:
--   agency                 -> approved business tenant
--   agency_application     -> request to create an agency (permanent audit record)
--   agency_membership      -> relationship between an AppUser and an Agency
--   agency_role_assignment -> Global/Custom Agency roles assigned to a membership
--
-- Conventions mirror the identity/RBAC migrations: BIGSERIAL ids, snake_case
-- mapped columns, constrained-string lifecycle statuses with CHECK constraints,
-- CITEXT not required here (no case-insensitive uniqueness on these tables).
-- No applied migration is modified.

-- CreateTable
CREATE TABLE "agency" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "country" VARCHAR(100),
    "website" VARCHAR(255),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_application" (
    "id" BIGSERIAL NOT NULL,
    "app_user_id" BIGINT NOT NULL,
    "agency_name" VARCHAR(200) NOT NULL,
    "country" VARCHAR(100),
    "website" VARCHAR(255),
    "description" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by_app_user_id" BIGINT,
    "agency_id" BIGINT,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_membership" (
    "id" BIGSERIAL NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "app_user_id" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_role_assignment" (
    "id" BIGSERIAL NOT NULL,
    "membership_id" BIGINT NOT NULL,
    "role_id" BIGINT NOT NULL,

    CONSTRAINT "agency_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CheckConstraint
ALTER TABLE "agency" ADD CONSTRAINT "agency_status_check"
    CHECK ("status" IN ('ACTIVE', 'SUSPENDED'));

-- CheckConstraint
ALTER TABLE "agency_application" ADD CONSTRAINT "agency_application_status_check"
    CHECK ("status" IN ('PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN'));

-- CheckConstraint
ALTER TABLE "agency_membership" ADD CONSTRAINT "agency_membership_status_check"
    CHECK ("status" IN ('ACTIVE', 'SUSPENDED'));

-- CreateIndex
CREATE UNIQUE INDEX "agency_code_key" ON "agency"("code");

-- One application can produce at most one agency (idempotency guard for
-- approval). Not expressible in Prisma PSL (partial index).
CREATE UNIQUE INDEX "agency_application_created_agency_id_key"
    ON "agency_application"("agency_id") WHERE "agency_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "agency_application_app_user_id_idx" ON "agency_application"("app_user_id");

-- CreateIndex
CREATE INDEX "agency_application_status_idx" ON "agency_application"("status");

-- CreateIndex
CREATE INDEX "agency_application_agency_id_idx" ON "agency_application"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "agency_membership_agency_id_app_user_id_key" ON "agency_membership"("agency_id","app_user_id");

-- CreateIndex
CREATE INDEX "agency_membership_app_user_id_idx" ON "agency_membership"("app_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agency_role_assignment_membership_id_role_id_key" ON "agency_role_assignment"("membership_id","role_id");

-- CreateIndex
CREATE INDEX "agency_role_assignment_role_id_idx" ON "agency_role_assignment"("role_id");

-- AddForeignKey
ALTER TABLE "agency_application" ADD CONSTRAINT "agency_application_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_application" ADD CONSTRAINT "agency_application_reviewed_by_app_user_id_fkey" FOREIGN KEY ("reviewed_by_app_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_application" ADD CONSTRAINT "agency_application_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_membership" ADD CONSTRAINT "agency_membership_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_membership" ADD CONSTRAINT "agency_membership_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_role_assignment" ADD CONSTRAINT "agency_role_assignment_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "agency_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_role_assignment" ADD CONSTRAINT "agency_role_assignment_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
