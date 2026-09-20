-- Departure-location structure of a tour, as one self-contained JSON value.
-- Kept identical to the client's location shape (wilayaCode / cityId / place);
-- the reference subsystem for countries/cities is a later module and the
-- backend never resolves wilaya labels.

ALTER TABLE "tour"
  ADD COLUMN "origin" JSONB;