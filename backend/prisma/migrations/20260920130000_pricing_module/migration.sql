-- Agency-defined pricing categories (PricingOption) and their concrete amounts
-- per scheduled run (DeparturePrice), Module H.
--
-- A PricingOption is a Tour-owned definition only ("Adult", "Child", "Single
-- room", "Double room"): a name (case-insensitive, unique per tour), an
-- optional description, a pricing basis (per_person | per_booking), a single
-- currency per tour (ISO-4217, default DZD), and a lifecycle status. The
-- actual money lives in `departure_price`, one row per (departure, option)
-- pair. Tenancy is inherited through `pricing_option -> tour -> agency` and
-- `departure_price -> departure -> tour -> agency`; every FK cascades and
-- application code never accepts a tour or agency reference from a request
-- body.
--
-- Lifecycle: ACTIVE -> INACTIVE (one-way, like tour ARCHIVED / departure
-- CANCELLED). Deactivating an option keeps stored prices intact but stops it
-- being offered on new price sets.
--
-- Module H scope: this module stores and manages price definitions and amounts
-- only. Booking totals, traveler pricing, discounts, taxes and payments belong
-- to the Bookings module and do not live here.

-- CreateTable
CREATE TABLE "pricing_option" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "tour_id" BIGINT NOT NULL,
    "name" CITEXT NOT NULL,
    "description" VARCHAR(500),
    "basis" VARCHAR(16) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'DZD',
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pricing_option_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary, the way every other status column is constrained.
-- ACTIVE is the only status a new option can land in (the backend never
-- accepts a status from the body); INACTIVE is one-way via the deactivate
-- action.
ALTER TABLE "pricing_option"
  ADD CONSTRAINT "pricing_option_status_check"
  CHECK ("status" IN ('ACTIVE', 'INACTIVE'));

-- Pricing basis vocabulary, matching the zod contract.
ALTER TABLE "pricing_option"
  ADD CONSTRAINT "pricing_option_basis_check"
  CHECK ("basis" IN ('per_person', 'per_booking'));

-- A currency must be a 3-letter ISO-4217-ish uppercase code. The single-currency-
-- per-tour rule itself is enforced at the service layer (a tour mixes at most
-- one currency across its options), because it spans rows.
ALTER TABLE "pricing_option"
  ADD CONSTRAINT "pricing_option_currency_format_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');

-- CreateIndex
CREATE UNIQUE INDEX "pricing_option_code_key" ON "pricing_option"("code");

-- Case-insensitive unique name per tour (CITEXT column).
CREATE UNIQUE INDEX "pricing_option_tour_id_name_key" ON "pricing_option"("tour_id", "name");

-- CreateIndex
CREATE INDEX "pricing_option_tour_id_idx" ON "pricing_option"("tour_id");

-- AddForeignKey
ALTER TABLE "pricing_option" ADD CONSTRAINT "pricing_option_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "departure_price" (
    "departure_id" BIGINT NOT NULL,
    "pricing_option_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "departure_price_pkey" PRIMARY KEY ("departure_id","pricing_option_id")
);

-- A price must carry a positive amount; free/promotional rows are out of scope.
-- The (12,2) precision bounds the stored value in the same way the zod
-- contract bounds the request.
ALTER TABLE "departure_price"
  ADD CONSTRAINT "departure_price_amount_check"
  CHECK ("amount" > 0);

-- CreateIndex
CREATE INDEX "departure_price_pricing_option_id_idx" ON "departure_price"("pricing_option_id");

-- AddForeignKey
ALTER TABLE "departure_price" ADD CONSTRAINT "departure_price_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "departure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departure_price" ADD CONSTRAINT "departure_price_pricing_option_id_fkey" FOREIGN KEY ("pricing_option_id") REFERENCES "pricing_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;