CREATE TYPE "AttendanceStatus" AS ENUM ('ON_TIME', 'LATE');

CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "workDate" TEXT NOT NULL,
  "checkIn" TIMESTAMP(3) NOT NULL,
  "checkOut" TIMESTAMP(3),
  "totalMinutes" INTEGER,
  "lateMinutes" INTEGER NOT NULL DEFAULT 0,
  "status" "AttendanceStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attendance_employeeId_workDate_key" ON "Attendance"("employeeId", "workDate");
CREATE INDEX "Employee_active_idx" ON "Employee"("active");
CREATE INDEX "Attendance_workDate_idx" ON "Attendance"("workDate");
CREATE INDEX "Attendance_employeeId_idx" ON "Attendance"("employeeId");

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
