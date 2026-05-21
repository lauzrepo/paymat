-- AlterTable
ALTER TABLE "super_admins" ADD COLUMN "password_reset_token" TEXT,
ADD COLUMN "password_reset_expiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_password_reset_token_key" ON "super_admins"("password_reset_token");
