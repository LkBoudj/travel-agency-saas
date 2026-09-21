-- Traveler records of a Booking (Module J).
--
-- A Traveler is a named seat of the Booking it belongs to: `firstName` and
-- `lastName` are required, contact details are optional, and every record
-- resolves through its Booking so tenancy is inherited (`:agencyCode` +
-- `:bookingCode`) and no traveler row carries its own `agency_id`. There is
-- deliberately NO delete endpoint: travelers are added and corrected while the
-- booking is still being prepared.
--
-- Confirmation readiness (Module I contract): a PENDING booking is confirmable
-- only when the number of traveler records equals its immutable
-- `reserved_seats`. The booking row lock (`SELECT ... FOR UPDATE`) is what
-- makes that count authoritative under concurrency — see the service.
--
-- Records are written ONLY while the parent booking is PENDING. A CONFIRMED
-- booking's traveler list is the confirmation's ticket manifest and a
-- CANCELLED booking's is historical, so once a booking leaves PENDING its
-- traveler rows are frozen by the database triggers below:
--   * INSERT/UPDATE of traveler rows against a non-PENDING booking is rejected;
--   * DELETE of a traveler row whose booking is not PENDING is rejected.
-- The same invariant is enforced first at the service layer with explicit
-- `BOOKING_TRAVELERS_FROZEN` conflicts; these triggers are the final protection.

-- CreateTable
CREATE TABLE "booking_traveler" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" CITEXT,
    "phone" VARCHAR(32),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "booking_traveler_pkey" PRIMARY KEY ("id")
);

-- Both name parts are present and non-blank. Unlike Customer (where a blank is
-- cleared to NULL) a Traveler record always names its seat.
ALTER TABLE "booking_traveler"
  ADD CONSTRAINT "booking_traveler_name_check"
  CHECK (length(btrim("first_name")) >= 1 AND length(btrim("last_name")) >= 1);

-- An empty string is never stored as a stub: when present, each optional
-- contact field carries real content (the zod contract normalizes blanks to
-- NULL first; this is belt and braces).
ALTER TABLE "booking_traveler"
  ADD CONSTRAINT "booking_traveler_optional_text_check"
  CHECK (
    ("email" IS NULL OR length(btrim("email")) >= 1) AND
    ("phone" IS NULL OR length(btrim("phone")) >= 1) AND
    ("notes" IS NULL OR length(btrim("notes")) >= 1)
  );

-- CreateIndex
CREATE UNIQUE INDEX "booking_traveler_code_key" ON "booking_traveler"("code");

CREATE INDEX "booking_traveler_booking_id_idx" ON "booking_traveler"("booking_id");

-- AddForeignKey
ALTER TABLE "booking_traveler" ADD CONSTRAINT "booking_traveler_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Freeze invariant: no traveler write (INSERT/UPDATE/DELETE) may touch a row
-- whose parent booking has left PENDING. Confirmation and cancellation both
-- happen after this check, so the ticket manifest recorded at confirmation can
-- never be edited or emptied afterwards.
CREATE FUNCTION enforce_booking_traveler_frozen() RETURNS trigger AS $$
DECLARE
  booking_status VARCHAR(16);
BEGIN
  SELECT status INTO booking_status FROM booking WHERE id = NEW.booking_id;
  IF booking_status IS NULL OR booking_status <> 'PENDING' THEN
    RAISE EXCEPTION 'traveler records can only be written while the booking is PENDING'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_traveler_booking_pending
  BEFORE INSERT OR UPDATE OF booking_id, first_name, last_name, email, phone, notes
  ON booking_traveler
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_traveler_frozen();

CREATE FUNCTION enforce_booking_traveler_frozen_delete() RETURNS trigger AS $$
DECLARE
  booking_status VARCHAR(16);
BEGIN
  -- A cascade-initiated delete (agency/booking removal) must always pass; only
  -- a direct DELETE of a frozen manifest row is refused. `pg_trigger_depth()`
  -- is > 0 exactly for internals running foreign-key ON DELETE actions.
  IF pg_trigger_depth() > 0 THEN
    RETURN OLD;
  END IF;
  SELECT status INTO booking_status FROM booking WHERE id = OLD.booking_id;
  IF booking_status IS NULL OR booking_status <> 'PENDING' THEN
    RAISE EXCEPTION 'traveler records of a non-PENDING booking cannot be deleted'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_traveler_booking_pending_delete
  BEFORE DELETE
  ON booking_traveler
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_traveler_frozen_delete();