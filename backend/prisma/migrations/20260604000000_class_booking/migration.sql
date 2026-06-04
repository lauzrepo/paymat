-- AlterTable programs: add max_classes and allow_self_enrollment
ALTER TABLE "programs" ADD COLUMN "max_classes" INTEGER;
ALTER TABLE "programs" ADD COLUMN "allow_self_enrollment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable enrollments: add classes_booked
ALTER TABLE "enrollments" ADD COLUMN "classes_booked" INTEGER NOT NULL DEFAULT 0;

-- CreateTable recurrence_series
CREATE TABLE "recurrence_series" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "days_of_week" TEXT[],
    "time_of_day" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "notes" TEXT,
    "series_start_date" DATE NOT NULL,
    "series_end_date" DATE,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable class_sessions
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "recurrence_series_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable session_bookings
CREATE TABLE "session_bookings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurrence_series_organization_id_idx" ON "recurrence_series"("organization_id");
CREATE INDEX "class_sessions_organization_id_idx" ON "class_sessions"("organization_id");
CREATE INDEX "class_sessions_program_id_idx" ON "class_sessions"("program_id");
CREATE INDEX "class_sessions_starts_at_idx" ON "class_sessions"("starts_at");
CREATE UNIQUE INDEX "session_bookings_session_id_enrollment_id_key" ON "session_bookings"("session_id", "enrollment_id");
CREATE INDEX "session_bookings_organization_id_idx" ON "session_bookings"("organization_id");
CREATE INDEX "session_bookings_enrollment_id_idx" ON "session_bookings"("enrollment_id");

-- AddForeignKey
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_recurrence_series_id_fkey" FOREIGN KEY ("recurrence_series_id") REFERENCES "recurrence_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "session_bookings" ADD CONSTRAINT "session_bookings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_bookings" ADD CONSTRAINT "session_bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session_bookings" ADD CONSTRAINT "session_bookings_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
