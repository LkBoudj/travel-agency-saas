-- Agency-owned scheduled occurrences of a Tour (the Departure entity, Module G).
--
-- A Departure is the concrete running instance of a Tour: explicit start/end,
-- the seat capacity of that run, an optional booking deadline and operational
-- notes. Tenancy follows the composite pattern of every agency-owned row:
-- the row inherits its Agency through the owning Tour (`departure -> tour ->
-- agency`), every FK cascades, and application code never accepts a tour or
-- agency reference from a request body.
--
-- Module G scope: seat consumption and derived `sold out` states belong to the
-- Bookings module and are deliberately absent here. No per-departure pricing
-- either (that is the Pricing module).
--
-- Lifecycle: OPEN (bookable) -> CLOSED (booking disabled by the agency, still
-- a scheduled run) ; CANCELLED is terminal like tour ARCHIVED, and a cancelled
-- departure never counts toward a SCHEDULED tour's publish readiness.

-- CreateTable
CREATE TABLE "departure" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "tour_id" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "capacity" INTEGER NOT NULL,
    "booking_deadline" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departure_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary, the way every other status column is constrained.
-- OPEN counts toward publish readiness; CLOSED and CANCELLED do not.
ALTER TABLE "departure"
  ADD CONSTRAINT "departure_status_check"
  CHECK ("status" IN ('OPEN', 'CLOSED', 'CANCELLED'));

-- A departure cannot end before it starts. Enforced at the row level and
-- mirrored in the zod contract so the client learns the same rule early.
ALTER TABLE "departure"
  ADD CONSTRAINT "departure_end_after_start_check"
  CHECK ("end_at" > "start_at");

-- A departure must be able to carry at least one traveler.
ALTER TABLE "departure"
  ADD CONSTRAINT "departure_capacity_check"
  CHECK ("capacity" > 0);

-- A booking deadline, when set, cannot sit after the departure starts.
ALTER TABLE "departure"
  ADD CONSTRAINT "departure_deadline_before_start_check"
  CHECK ("booking_deadline" IS NULL OR "booking_deadline" <= "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "departure_code_key" ON "departure"("code");

-- CreateIndex
CREATE INDEX "departure_tour_id_idx" ON "departure"("tour_id");

-- AddForeignKey
ALTER TABLE "departure" ADD CONSTRAINT "departure_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;