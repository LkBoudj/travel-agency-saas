-- Fix the cross-table website slug guard (website module).
--
-- `assert_website_slug_unique` counted ROWS across `agency_website` +
-- `agency_website_draft`, but a published site keeps its draft row under the
-- SAME slug: the copy in `publish()` legitimately leaves one row per table for
-- a single agency. Counting rows therefore reported two "tenants" for one
-- agency and every publish died at COMMIT with a 23505 unique_violation, which
-- the service mapped to a 409 WEBSITE_SLUG_CONFLICT the caller could not fix.
--
-- The invariant is per TENANT, not per row: a slug must be claimed by at most
-- one agency across both tables. Counting DISTINCT agency_id states exactly
-- that, so an agency's own draft/published pair is allowed while two agencies
-- still cannot share a slug. The trigger definitions are unchanged.

CREATE OR REPLACE FUNCTION "assert_website_slug_unique"(target_slug varchar) RETURNS void AS $$
DECLARE
  claiming_agencies integer;
BEGIN
  SELECT count(DISTINCT agency_id) INTO claiming_agencies FROM (
    SELECT agency_id FROM "agency_website" WHERE "slug" = target_slug
    UNION ALL
    SELECT agency_id FROM "agency_website_draft" WHERE "slug" = target_slug
  ) s;

  IF claiming_agencies > 1 THEN
    RAISE EXCEPTION 'website slug "%" is already used by another tenant', target_slug
      USING ERRCODE = 'unique_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;
