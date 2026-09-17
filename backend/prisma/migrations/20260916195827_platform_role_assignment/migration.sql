-- CreateTable
CREATE TABLE "platform_role_assignment" (
    "id" BIGSERIAL NOT NULL,
    "role_id" BIGINT NOT NULL,
    "app_user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_role_assignment_role_id_idx" ON "platform_role_assignment"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_assignment_app_user_id_role_id_key" ON "platform_role_assignment"("app_user_id", "role_id");

-- AddForeignKey
ALTER TABLE "platform_role_assignment" ADD CONSTRAINT "platform_role_assignment_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_assignment" ADD CONSTRAINT "platform_role_assignment_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
