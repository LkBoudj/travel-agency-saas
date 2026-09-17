-- Scoped permissions: every Permission row carries a scope plus the resource/action
-- that make up its key (`<SCOPE>_<RESOURCE>_<ACTION>`). Existing RolePermission and
-- PlatformRoleAssignment rows are preserved by renaming keys in place: relationships
-- reference `permission.id`, never `permission.key`, so links survive the rename.

-- Step 1: add the new columns as nullable so the backfill can run before NOT NULL.
ALTER TABLE "permission"
ADD COLUMN "scope" VARCHAR(16),
ADD COLUMN "resource" VARCHAR(64),
ADD COLUMN "action" VARCHAR(32);

-- Step 2: map every legacy catalog key to its scoped replacement.
CREATE TEMP TABLE "_permission_key_migration" (
    "old_key" VARCHAR(64) PRIMARY KEY,
    "new_key" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(16) NOT NULL,
    "resource" VARCHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL
);

INSERT INTO "_permission_key_migration" ("old_key", "new_key", "scope", "resource", "action")
VALUES
    ('USER_VIEW',              'PLATFORM_USER_VIEW',              'PLATFORM', 'USER',            'VIEW'),
    ('USER_CREATE',            'PLATFORM_USER_CREATE',            'PLATFORM', 'USER',            'CREATE'),
    ('USER_UPDATE',            'PLATFORM_USER_UPDATE',            'PLATFORM', 'USER',            'UPDATE'),
    ('USER_DISABLE',           'PLATFORM_USER_DISABLE',           'PLATFORM', 'USER',            'DISABLE'),
    ('ROLE_VIEW',              'PLATFORM_ROLE_VIEW',              'PLATFORM', 'ROLE',            'VIEW'),
    ('ROLE_CREATE',            'PLATFORM_ROLE_CREATE',            'PLATFORM', 'ROLE',            'CREATE'),
    ('ROLE_UPDATE',            'PLATFORM_ROLE_UPDATE',            'PLATFORM', 'ROLE',            'UPDATE'),
    ('ROLE_DELETE',            'PLATFORM_ROLE_DELETE',            'PLATFORM', 'ROLE',            'DELETE'),
    ('ROLE_PERMISSION_MANAGE', 'PLATFORM_ROLE_PERMISSION_MANAGE', 'PLATFORM', 'ROLE_PERMISSION', 'MANAGE'),
    ('PLATFORM_ROLE_VIEW',     'PLATFORM_USER_ROLE_VIEW',         'PLATFORM', 'USER_ROLE',       'VIEW'),
    ('PLATFORM_ROLE_MANAGE',   'PLATFORM_USER_ROLE_MANAGE',       'PLATFORM', 'USER_ROLE',       'MANAGE');

-- Step 3a: move legacy keys into a temporary namespace first. Target scoped keys
-- would otherwise collide with each other while the old rows still hold them
-- (e.g. ROLE_VIEW -> PLATFORM_ROLE_VIEW collides with the existing PLATFORM_ROLE_VIEW).
UPDATE "permission" AS p
SET "key" = '__migrating__' || m."new_key"
FROM "_permission_key_migration" AS m
WHERE p."key" = m."old_key";

-- Step 3b: apply the final scoped keys and metadata. Rows without a mapping stay
-- unmatched and are caught by the NOT NULL below, so an incomplete catalog fails
-- the migration instead of silently producing unscoped permissions.
UPDATE "permission" AS p
SET "key"      = m."new_key",
    "scope"    = m."scope",
    "resource" = m."resource",
    "action"   = m."action"
FROM "_permission_key_migration" AS m
WHERE p."key" = '__migrating__' || m."new_key";

DROP TABLE "_permission_key_migration";

-- Step 4: new columns become required now that every row is backfilled.
ALTER TABLE "permission"
ALTER COLUMN "scope" SET NOT NULL,
ALTER COLUMN "resource" SET NOT NULL,
ALTER COLUMN "action" SET NOT NULL;

-- Step 5: mirror role_scope_check: only known scopes may be stored.
ALTER TABLE "permission"
ADD CONSTRAINT "permission_scope_check" CHECK ("scope" IN ('PLATFORM', 'AGENCY'));

CREATE INDEX "permission_scope_idx" ON "permission"("scope");
