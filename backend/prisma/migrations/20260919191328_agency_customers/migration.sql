-- Agency-owned business customer records.
--
-- A Customer is NOT an identity: it never connects to `app_user`, holds no
-- credentials, and is never forced into the authentication model. Tenant
-- isolation follows the composite super-key pattern of every agency-owned row:
-- `agency_id` is required, the FK cascades so a deleted agency takes its
-- customers with it, and application code never accepts `agency_id` from a
-- request body.

-- CreateTable
CREATE TABLE "customer" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "email" CITEXT,
    "phone" VARCHAR(32),
    "notes" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary, the way every other status column is constrained.
-- Archiving (the AGENCY_CUSTOMER_ARCHIVE capability) is the deletion equivalent
-- and is one-way in the current model — there is no restore permission.
ALTER TABLE "customer"
  ADD CONSTRAINT "customer_status_check"
  CHECK ("status" IN ('ACTIVE', 'ARCHIVED'));

-- CreateIndex
CREATE UNIQUE INDEX "customer_code_key" ON "customer"("code");

-- CreateIndex
CREATE INDEX "customer_agency_id_idx" ON "customer"("agency_id");

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
