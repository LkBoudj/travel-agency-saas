-- Fix the traveler manifest delete guard (Module J).
--
-- `pg_trigger_depth()` is 1 when a trigger fires from a directly executed SQL
-- statement, and 2 when it fires as part of a foreign-key ON DELETE action
-- (the internal FK trigger at depth 1 invokes ours at depth 2). The original
-- guard used `> 0`, which wrongly classified every direct DELETE as a cascade
-- and let a non-PENDING booking's manifest be deleted. This replaces the
-- enforcement function in place; the trigger definition is unchanged.

CREATE OR REPLACE FUNCTION enforce_booking_traveler_frozen_delete() RETURNS trigger AS $$
DECLARE
  booking_status VARCHAR(16);
BEGIN
  -- Does this DELETE come from a foreign-key ON DELETE action? Then pg_trigger
  -- depth is already 2, it is housekeeping (agency/booking removal), and it
  -- must pass. A direct statement fires us at depth 1: such a delete on a
  -- frozen manifest is refused.
  IF pg_trigger_depth() > 1 THEN
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