-- AppUser account status: an explicit identity lifecycle so Platform Admins can
-- suspend/reactivate accounts. Follows the project's constrained-string
-- convention (see role_scope_check on `role.scope`).
--
--   ACTIVE    -> authentication allowed (login + existing JWTs resolve)
--   SUSPENDED -> authentication denied by login and JWT validation
--
-- `DEFAULT 'ACTIVE'` backfills every existing row to ACTIVE, matching current
-- behavior and keeping the migration safe on a non-empty `app_user` table.

-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';

-- CheckConstraint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_status_check"
    CHECK ("status" IN ('ACTIVE', 'SUSPENDED'));