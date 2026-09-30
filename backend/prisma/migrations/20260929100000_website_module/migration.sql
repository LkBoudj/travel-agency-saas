-- Agency public website persistence (draft → published aggregate).
--
-- The website owns NO business data: `content` is agency-owned marketing copy,
-- tour curation rides as `content.featuredTourCodes` (codes resolved against
-- `tour` at compose time), and derived starting prices come from `departure_price`.
-- `theme_id`/`theme_settings` are theme-owned selection stored opaque to the
-- backend (schemas live in the frontend registry). Content and theme settings
-- are mutated by distinct endpoints and permissions, so they can never bleed
-- into each other.
--
-- `agency_website` is the published aggregate: a row EXISTS exactly when the
-- site was published at least once (no status column; offline/pause is future
-- scope). `PUBLISH` copies `agency_website_draft` here atomically and stamps
-- `published_at`; the backend never auto-publishes.
--
-- `slug` is the public tenant key on the storefront read boundary. It is
-- globally unique ACROSS both tables; because the rows live in two tables, the
-- uniqueness is enforced by the deferred constraint trigger
-- `website_slug_global_unique` below (a plain unique index cannot span tables).

-- CreateTable "agency_website"
CREATE TABLE "agency_website" (
    "id" BIGSERIAL NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "theme_id" VARCHAR(64),
    "theme_settings" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "navigation" JSONB NOT NULL DEFAULT '[]',
    "footer" JSONB NOT NULL DEFAULT '{}',
    "published_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_website_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (1:1 with Agency)
CREATE UNIQUE INDEX "agency_website_agency_id_key" ON "agency_website"("agency_id");

-- CreateIndex (public tenant key; cross-table uniqueness via the deferred trigger)
CREATE UNIQUE INDEX "agency_website_slug_key" ON "agency_website"("slug");

-- AddForeignKey
ALTER TABLE "agency_website" ADD CONSTRAINT "agency_website_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable "agency_website_draft"
CREATE TABLE "agency_website_draft" (
    "id" BIGSERIAL NOT NULL,
    "agency_id" BIGINT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "theme_id" VARCHAR(64),
    "theme_settings" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "navigation" JSONB NOT NULL DEFAULT '[]',
    "footer" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agency_website_draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (1:1 with Agency)
CREATE UNIQUE INDEX "agency_website_draft_agency_id_key" ON "agency_website_draft"("agency_id");

-- CreateIndex (public tenant key mirror; cross-table uniqueness via the trigger)
CREATE UNIQUE INDEX "agency_website_draft_slug_key" ON "agency_website_draft"("slug");

-- AddForeignKey
ALTER TABLE "agency_website_draft" ADD CONSTRAINT "agency_website_draft_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Global slug uniqueness across both website tables.
--
-- A site can be published (row in `agency_website`) WHILE its draft
-- (`agency_website_draft`) is being edited, so a slug can legitimately exist in
-- one row of each table at the same time — but never in two rows across the
-- pair. Two BEFORE/DEFERRED triggers assert that invariant at COMMIT, mirroring
-- how `agency_ownership_invariants` guarantees cross-table rules.
CREATE OR REPLACE FUNCTION "assert_website_slug_unique"(target_slug varchar) RETURNS void AS $$
DECLARE
  used_by_tenants integer;
BEGIN
  SELECT count(*) INTO used_by_tenants FROM (
    SELECT 1 FROM "agency_website" WHERE "slug" = target_slug
    UNION ALL
    SELECT 1 FROM "agency_website_draft" WHERE "slug" = target_slug
  ) s;

  IF used_by_tenants > 1 THEN
    RAISE EXCEPTION 'website slug "%" is already used by another tenant', target_slug
      USING ERRCODE = 'unique_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "website_slug_guard"() RETURNS trigger AS $$
DECLARE
  target_slug varchar;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_slug := OLD."slug";
  ELSE
    target_slug := NEW."slug";
    -- A slug change must release the old value before claiming a new one.
    IF TG_OP = 'UPDATE' AND OLD."slug" IS DISTINCT FROM NEW."slug" THEN
      PERFORM "assert_website_slug_unique"(OLD."slug");
    END IF;
  END IF;

  PERFORM "assert_website_slug_unique"(target_slug);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "website_slug_global_unique"
  AFTER INSERT OR UPDATE OR DELETE ON "agency_website"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "website_slug_guard"();

CREATE CONSTRAINT TRIGGER "website_slug_global_unique_draft"
  AFTER INSERT OR UPDATE OR DELETE ON "agency_website_draft"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "website_slug_guard"();