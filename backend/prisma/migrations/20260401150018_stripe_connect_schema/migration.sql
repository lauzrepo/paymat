/*
  Warnings:

  - You are about to drop the column `helcim_invoice_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_pdf_url` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `card_token` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `helcim_transaction_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `gdpr_consent` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gdpr_consent_date` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `helcim_customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `payment_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripe_payment_intent_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contact_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id,email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organization_id` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";

-- DropIndex
DROP INDEX "invoices_helcim_invoice_id_key";

-- DropIndex
DROP INDEX "invoices_user_id_idx";

-- DropIndex
DROP INDEX "payments_created_at_idx";

-- DropIndex
DROP INDEX "payments_helcim_transaction_id_key";

-- DropIndex
DROP INDEX "payments_user_id_idx";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_helcim_customer_id_key";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "organization_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "helcim_invoice_id",
DROP COLUMN "invoice_pdf_url",
DROP COLUMN "user_id",
ADD COLUMN     "contact_id" TEXT,
ADD COLUMN     "family_id" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount_paid" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "card_token",
DROP COLUMN "description",
DROP COLUMN "helcim_transaction_id",
DROP COLUMN "metadata",
ADD COLUMN     "invoice_id" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "stripe_charge_id" TEXT,
ADD COLUMN     "stripe_payment_intent_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "gdpr_consent",
DROP COLUMN "gdpr_consent_date",
DROP COLUMN "helcim_customer_id",
ADD COLUMN     "contact_id" TEXT,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ADD COLUMN     "password_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'admin';

-- DropTable
DROP TABLE "payment_methods";

-- DropTable
DROP TABLE "subscriptions";

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "logo_url" TEXT,
    "primary_color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT NOT NULL DEFAULT 'inactive',
    "stripe_connect_account_id" TEXT,
    "stripe_connect_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "family_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "notes" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_default_payment_method_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_email" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_default_payment_method_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billing_frequency" TEXT NOT NULL,
    "capacity" INTEGER,
    "max_billing_cycles" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "next_billing_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "enrollment_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_submissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "type" TEXT NOT NULL DEFAULT 'feedback',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_subscription_id_key" ON "organizations"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_connect_account_id_key" ON "organizations"("stripe_connect_account_id");

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_organization_id_stripe_customer_id_key" ON "contacts"("organization_id", "stripe_customer_id");

-- CreateIndex
CREATE INDEX "families_organization_id_idx" ON "families"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "families_organization_id_stripe_customer_id_key" ON "families"("organization_id", "stripe_customer_id");

-- CreateIndex
CREATE INDEX "programs_organization_id_idx" ON "programs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_contact_id_program_id_key" ON "enrollments"("contact_id", "program_id");

-- CreateIndex
CREATE INDEX "feedback_submissions_organization_id_idx" ON "feedback_submissions"("organization_id");

-- CreateIndex
CREATE INDEX "feedback_submissions_status_idx" ON "feedback_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_token_idx" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_organization_id_idx" ON "payments"("organization_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_contact_id_key" ON "users"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
