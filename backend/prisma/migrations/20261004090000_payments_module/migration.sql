-- Manual payments of a Booking (Module K).
--
-- There is NO external payment gateway in the MVP. A payment is a fact an
-- agency asserts about money it actually received: cash handed over, a bank
-- transfer it watched land. The table is therefore an APPEND-ONLY LEDGER, not
-- a mutable balance column — the remaining balance is always DERIVED server
-- side as `booking.total_amount - SUM(payment.amount)` and is never stored.
--
-- Accounting integrity (PRD §23):
--   * monetary totals are server-authoritative — `amount` is what was received
--     and the client never sends a total, a paid amount or a remaining amount;
--   * a payment belongs to the same Agency as its booking — tenancy is INHERITED
--     through the booking (`:agencyCode` + `:bookingCode` route), so this table
--     carries no `agency_id` and a cross-tenant posting is structurally
--     impossible rather than merely unauthorized;
--   * the ledger is immutable — UPDATE and DELETE are rejected outright by the
--     triggers below, so a correction is a new compensating row and history is
--     never rewritten. Refunds are a separate Module L concern and deliberately
--     do not reuse this table;
--   * the booking FK is RESTRICT, not CASCADE: deleting a booking must never
--     silently destroy the financial record of what the agency was paid.
--
-- Overpayment and negative amounts are rejected by the service under the
-- booking row lock (`SELECT ... FOR UPDATE`), which is what makes
-- "paid + new payment <= total" hold under concurrency. The database backs the
-- sign and precision rules with the CHECK constraints below.

-- CreateTable
CREATE TABLE "payment" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "method" VARCHAR(32),
    "reference" VARCHAR(120),
    "note" TEXT,
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_code" VARCHAR(24),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- A payment records money RECEIVED: strictly positive and never negative or
-- zero. A negative amount is a refund/adjustment, not a payment, and is
-- refused here as well as in the service.
ALTER TABLE "payment"
  ADD CONSTRAINT "payment_amount_check"
  CHECK ("amount" > 0);

-- One booking is settled in exactly one currency, so the currency is a
-- well-formed 3-letter ISO-4217 code (the API layer additionally rejects a
-- payment whose currency differs from its booking's).
ALTER TABLE "payment"
  ADD CONSTRAINT "payment_currency_check"
  CHECK ("currency" ~ '^[A-Z]{3}$');

-- The recorded method is a closed vocabulary the UI can offer as filters
-- without inventing labels; agencies that need more granularity put it in
-- `reference` or `note`.
ALTER TABLE "payment"
  ADD CONSTRAINT "payment_method_check"
  CHECK (
    "method" IS NULL OR "method" IN (
      'CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'OTHER'
    )
  );

-- An empty string is never stored as a stub: when present, each optional text
-- column carries real content (the zod contract normalizes blanks to NULL
-- first; this is belt and braces).
ALTER TABLE "payment"
  ADD CONSTRAINT "payment_optional_text_check"
  CHECK (
    ("method" IS NULL OR length(btrim("method")) >= 1) AND
    ("reference" IS NULL OR length(btrim("reference")) >= 1) AND
    ("note" IS NULL OR length(btrim("note")) >= 1) AND
    ("recorded_by_code" IS NULL OR length(btrim("recorded_by_code")) >= 1)
  );

-- CreateIndex
CREATE UNIQUE INDEX "payment_code_key" ON "payment"("code");

CREATE INDEX "payment_booking_id_idx" ON "payment"("booking_id");

-- Newest payment first; ties broken by id so the ledger order is total.
CREATE INDEX "payment_booking_id_paid_at_idx" ON "payment"("booking_id", "paid_at");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only ledger: a recorded payment is a historical fact and is never
-- edited or removed, so a booking's paid history can always be re-derived from
-- the rows that survived. Corrections and refunds are recorded as NEW rows.
CREATE FUNCTION enforce_payment_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'payment rows are an append-only ledger and cannot be modified or deleted'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payment_append_only_update"
  BEFORE UPDATE ON "payment"
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_append_only();

CREATE TRIGGER "payment_append_only_delete"
  BEFORE DELETE ON "payment"
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_append_only();