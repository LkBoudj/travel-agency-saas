-- Agency bookings (Booking), their immutable price snapshots (BookingPriceLine)
-- and business lifecycle history (BookingStatusHistory), Module I.
--
-- A Booking links one agency Customer to one scheduled Departure of that same
-- agency's Tour and owns an immutable `reserved_seats` reservation plus a
-- server-computed `total_amount`. Tenancy uses the composite pattern of every
-- agency-owned row: because a Booking spans two aggregates (Customer and
-- Departure), the row carries its own `agency_id`, every FK cascades and
-- application code never accepts an agency reference from a request body.
-- `tour_id` is derived by the backend from the selected Departure, never
-- trusted from the request.
--
-- Lifecycle: PENDING (creation always lands here) -> CONFIRMED via the explicit
-- confirm action; CANCELLED is one-way and terminal. PENDING and CONFIRMED
-- consume Departure capacity; CANCELLED releases it. Seat consumption is
-- derived by summing `reserved_seats` of non-cancelled Bookings per Departure
-- -- there is deliberately no `booked_seats` counter on Departure.
--
-- Totals are computed server-side from the Departure's stored prices at
-- creation and frozen into `booking_price_line` snapshot rows (frozen option
-- code/name/basis, currency, unit amount, quantity and line total), so later
-- Pricing edits or deactivations never rewrite an existing Booking. One
-- Booking has exactly one currency, matching the Tour's single-currency rule.
-- Payment settlement, refunds and balances belong to a later module and do not
-- live here.
--
-- Module I scope: a Booking carries its seat reservation directly. Travelers
-- (Module J) reconcile against `reserved_seats` and are deliberately absent.

-- CreateTable
CREATE TABLE "booking" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "tour_id" BIGINT NOT NULL,
    "departure_id" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "reserved_seats" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "confirmed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary, the way every other status column is constrained.
-- PENDING is the only status a new booking can land in (the backend never
-- accepts a status from the body); CONFIRMED and CANCELLED come only through
-- their explicit gated actions.
ALTER TABLE "booking"
  ADD CONSTRAINT "booking_status_check"
  CHECK ("status" IN ('PENDING', 'CONFIRMED', 'CANCELLED'));

-- A booking always reserves at least one seat (no zero/multi-zero rows) and its
-- server-computed total can never go negative. The (12,2) precision matches the
-- pricing module and bounds the stored value the same way the zod contract
-- bounds the server computation.
ALTER TABLE "booking"
  ADD CONSTRAINT "booking_reserved_seats_check"
  CHECK ("reserved_seats" > 0);

ALTER TABLE "booking"
  ADD CONSTRAINT "booking_total_amount_check"
  CHECK ("total_amount" >= 0);

-- A booking has exactly one currency, a 3-letter ISO-4217-ish uppercase code,
-- matching the tour's single-currency rule enforced at the service layer.
ALTER TABLE "booking"
  ADD CONSTRAINT "booking_currency_format_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');

-- CreateIndex
CREATE UNIQUE INDEX "booking_code_key" ON "booking"("code");

CREATE INDEX "booking_agency_id_idx" ON "booking"("agency_id");

CREATE INDEX "booking_customer_id_idx" ON "booking"("customer_id");

CREATE INDEX "booking_departure_id_idx" ON "booking"("departure_id");

-- The (departure, status) index serves the derived seat-consumption sums (the
-- capacity check) and the status-filtered listings.
CREATE INDEX "booking_departure_id_status_idx" ON "booking"("departure_id", "status");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking" ADD CONSTRAINT "booking_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking" ADD CONSTRAINT "booking_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking" ADD CONSTRAINT "booking_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "departure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "booking_price_line" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "pricing_option_id" BIGINT,
    "option_code" VARCHAR(24) NOT NULL,
    "option_name" VARCHAR(100) NOT NULL,
    "basis" VARCHAR(16) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "booking_price_line_pkey" PRIMARY KEY ("id")
);

-- Pricing-basis vocabulary, matching the pricing module and the zod contract.
ALTER TABLE "booking_price_line"
  ADD CONSTRAINT "booking_price_line_basis_check"
  CHECK ("basis" IN ('per_person', 'per_booking'));

-- A snapshot line always prices something: a positive unit amount, at least one
-- unit, and a positive line total.
ALTER TABLE "booking_price_line"
  ADD CONSTRAINT "booking_price_line_amounts_check"
  CHECK ("unit_amount" > 0 AND "quantity" > 0 AND "line_total" > 0);

ALTER TABLE "booking_price_line"
  ADD CONSTRAINT "booking_price_line_currency_format_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');

-- CreateIndex
CREATE INDEX "booking_price_line_booking_id_idx" ON "booking_price_line"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Optional internal reference to the pricing definition that was snapped. It is
-- a SetNull FK so a hypothetical option cleanup never destroys booking history.
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_pricing_option_id_fkey" FOREIGN KEY ("pricing_option_id") REFERENCES "pricing_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" BIGSERIAL NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "from_status" VARCHAR(16),
    "to_status" VARCHAR(16) NOT NULL,
    "actor_code" VARCHAR(24),
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary for both sides of a transition; `from_status` is NULL
-- for the initial null -> PENDING creation row.
ALTER TABLE "booking_status_history"
  ADD CONSTRAINT "booking_status_history_from_status_check"
  CHECK ("from_status" IS NULL OR "from_status" IN ('PENDING', 'CONFIRMED', 'CANCELLED'));

ALTER TABLE "booking_status_history"
  ADD CONSTRAINT "booking_status_history_to_status_check"
  CHECK ("to_status" IN ('PENDING', 'CONFIRMED', 'CANCELLED'));

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_idx" ON "booking_status_history"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;