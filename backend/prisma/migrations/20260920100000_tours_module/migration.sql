-- Agency-owned reusable travel products (the Tour aggregate).
--
-- A Tour is the product template an agency authors and publishes. Tenant
-- isolation follows the composite super-key pattern of every agency-owned row:
-- `agency_id` is required, the FK cascades so a deleted agency takes its tours
-- with it, and application code never accepts `agency_id` from a request body.
--
-- Module F scope: departures, prices and extras belong to later modules (G/H),
-- so none of them exist here. Destinations and itinerary days are ordered child
-- tables (`position` unique per tour); simple value lists (`highlights`,
-- `included`, `notIncluded`, `gallery`) and `activity_requirements` ride as
-- JSON, the way unstructured metadata is stored elsewhere in this schema.

-- CreateTable
CREATE TABLE "tour" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "internal_ref" VARCHAR(80),
    "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    "format" VARCHAR(24) NOT NULL,
    "geographic_scope" VARCHAR(16) NOT NULL,
    "availability_mode" VARCHAR(16) NOT NULL,
    "participation_mode" VARCHAR(24),
    "guidance_type" VARCHAR(24),
    "days" INTEGER,
    "nights" INTEGER,
    "hours" INTEGER,
    "is_flexible" BOOLEAN NOT NULL DEFAULT false,
    "min_travelers" INTEGER NOT NULL DEFAULT 1,
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "themes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "activities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "audiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "transport_modes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "accommodation_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "activity_requirements" JSONB,
    "short_description" VARCHAR(160),
    "description" TEXT,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "included" JSONB NOT NULL DEFAULT '[]',
    "not_included" JSONB NOT NULL DEFAULT '[]',
    "important_information" TEXT,
    "cancellation_policy" TEXT,
    "meeting_point" VARCHAR(500),
    "meeting_instructions" VARCHAR(2000),
    "cover_image_url" VARCHAR(2048),
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tour_pkey" PRIMARY KEY ("id")
);

-- Lifecycle vocabulary, the way every other status column is constrained.
-- DRAFT → PUBLISHED (guarded by the server-side readiness gate; the backend
-- never auto-publishes) → ARCHIVED (one-way terminal state, like customers).
ALTER TABLE "tour"
  ADD CONSTRAINT "tour_status_check"
  CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));

-- Product structure enums echoed verbatim from the client vocabulary.
ALTER TABLE "tour"
  ADD CONSTRAINT "tour_format_check"
  CHECK ("format" IN ('experience', 'day_excursion', 'stay', 'circuit', 'cruise'));

ALTER TABLE "tour"
  ADD CONSTRAINT "tour_geographic_scope_check"
  CHECK ("geographic_scope" IN ('domestic', 'international'));

ALTER TABLE "tour"
  ADD CONSTRAINT "tour_availability_mode_check"
  CHECK ("availability_mode" IN ('scheduled', 'on_request', 'custom_quote'));

-- CreateIndex
CREATE UNIQUE INDEX "tour_code_key" ON "tour"("code");

-- CreateIndex
CREATE INDEX "tour_agency_id_idx" ON "tour"("agency_id");

-- AddForeignKey
ALTER TABLE "tour" ADD CONSTRAINT "tour_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "tour_destination" (
    "id" BIGSERIAL NOT NULL,
    "tour_id" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "wilaya_code" VARCHAR(8),
    "locality" VARCHAR(120),
    "place" VARCHAR(200),

    CONSTRAINT "tour_destination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_destination_tour_id_position_key" ON "tour_destination"("tour_id", "position");

-- CreateIndex
CREATE INDEX "tour_destination_tour_id_idx" ON "tour_destination"("tour_id");

-- AddForeignKey
ALTER TABLE "tour_destination" ADD CONSTRAINT "tour_destination_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "tour_itinerary_day" (
    "id" BIGSERIAL NOT NULL,
    "tour_id" BIGINT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "tour_itinerary_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_itinerary_day_tour_id_position_key" ON "tour_itinerary_day"("tour_id", "position");

-- CreateIndex
CREATE INDEX "tour_itinerary_day_tour_id_idx" ON "tour_itinerary_day"("tour_id");

-- AddForeignKey
ALTER TABLE "tour_itinerary_day" ADD CONSTRAINT "tour_itinerary_day_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;