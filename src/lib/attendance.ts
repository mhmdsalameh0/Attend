import { AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendCheckInEmail, sendCheckOutEmail } from "@/lib/email";
import { clearFailedPin, isPinLocked, recordFailedPin } from "@/lib/rate-limit";
import {
  calculateLateMinutes,
  calculateTotalMinutes,
  formatArabicBusinessTime,
  formatBusinessDateTime,
  formatDuration,
  getBusinessDate,
} from "@/lib/time";

async function verifyPin(employeeId: string, pin: string) {
  if (isPinLocked(employeeId)) {
    return { ok: false as const, message: "تم إيقاف المحاولات مؤقتاً. حاول لاحقاً." };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, active: true },
  });

  if (!employee) {
    return { ok: false as const, message: "الموظف غير موجود أو غير مفعل." };
  }

  const pinMatches = await bcrypt.compare(pin, employee.pinHash);

  if (!pinMatches) {
    recordFailedPin(employeeId);
    return { ok: false as const, message: "الرقم السري غير صحيح." };
  }

  clearFailedPin(employeeId);
  return { ok: true as const, employee };
}

export async function getActiveEmployees() {
  return prisma.employee.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

export async function getPublicAttendanceSnapshot() {
  const workDate = getBusinessDate();
  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    take: 4,
    select: {
      id: true,
      name: true,
      attendance: {
        where: { workDate },
        take: 1,
        select: {
          checkIn: true,
          checkOut: true,
          lateMinutes: true,
          status: true,
          totalMinutes: true,
        },
      },
    },
  });

  return employees.map((employee) => {
    const today = employee.attendance[0];
    let status: "not_started" | "present" | "finished" | "late" = "not_started";

    if (today?.checkOut) {
      status = "finished";
    } else if (today?.lateMinutes && today.lateMinutes > 0) {
      status = "late";
    } else if (today?.checkIn) {
      status = "present";
    }

    return {
      id: employee.id,
      name: employee.name,
      status,
      checkIn: today?.checkIn ? formatArabicBusinessTime(today.checkIn) : null,
      checkOut: today?.checkOut ? formatArabicBusinessTime(today.checkOut) : null,
      totalMinutes: today?.totalMinutes ?? null,
      lateMinutes: today?.lateMinutes ?? 0,
    };
  });
}

export async function checkIn(employeeId: string, pin: string) {
  const verified = await verifyPin(employeeId, pin);

  if (!verified.ok) {
    return { ok: false as const, message: verified.message };
  }

  const now = new Date();
  const workDate = getBusinessDate(now);
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_workDate: { employeeId, workDate } },
  });

  if (existing) {
    return { ok: false as const, message: "لا يمكن تسجيل الدخول مرتين في نفس يوم العمل." };
  }

  const lateMinutes = calculateLateMinutes(now);
  const record = await prisma.attendance.create({
    data: {
      employeeId,
      workDate,
      checkIn: now,
      lateMinutes,
      status: lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME,
    },
    include: { employee: true },
  });

  try {
    await sendCheckInEmail({
      employeeName: record.employee.name,
      when: formatBusinessDateTime(record.checkIn),
      status: record.status === AttendanceStatus.ON_TIME ? "On time" : `Late by ${lateMinutes} minutes`,
    });
  } catch (error) {
    console.error("Attendance email failed after check-in", error instanceof Error ? error.message : "Unknown error");
    return {
      ok: true as const,
      message: "تم حفظ العملية، ولكن تعذّر إرسال إشعار الإيميل.",
    };
  }

  return {
    ok: true as const,
    message: `تم تسجيل دخول ${record.employee.name} الساعة ${formatArabicBusinessTime(record.checkIn)}.`,
  };
}

export async function checkOut(employeeId: string, pin: string) {
  const verified = await verifyPin(employeeId, pin);

  if (!verified.ok) {
    return { ok: false as const, message: verified.message };
  }

  const now = new Date();
  const workDate = getBusinessDate(now);
  const record = await prisma.attendance.findUnique({
    where: { employeeId_workDate: { employeeId, workDate } },
    include: { employee: true },
  });

  if (!record) {
    return { ok: false as const, message: "لا يمكن تسجيل الخروج قبل تسجيل الدخول." };
  }

  if (record.checkOut) {
    return { ok: false as const, message: "تم تسجيل الخروج مسبقاً لهذا اليوم." };
  }

  const totalMinutes = calculateTotalMinutes(record.checkIn, now);
  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      totalMinutes,
    },
    include: { employee: true },
  });

  try {
    await sendCheckOutEmail({
      employeeName: updated.employee.name,
      when: formatBusinessDateTime(updated.checkOut ?? now),
      totalWorked: formatDuration(totalMinutes),
    });
  } catch (error) {
    console.error("Attendance email failed after check-out", error instanceof Error ? error.message : "Unknown error");
    return {
      ok: true as const,
      message: "تم حفظ العملية، ولكن تعذّر إرسال إشعار الإيميل.",
    };
  }

  return {
    ok: true as const,
    message: `تم تسجيل خروج ${updated.employee.name} الساعة ${formatArabicBusinessTime(updated.checkOut ?? now)}. مجموع وقت العمل: ${formatDuration(totalMinutes)}.`,
  };
}

export function deriveAttendanceFields(checkIn: Date, checkOut?: Date | null) {
  const lateMinutes = calculateLateMinutes(checkIn);

  return {
    lateMinutes,
    status: lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME,
    totalMinutes: checkOut ? calculateTotalMinutes(checkIn, checkOut) : null,
  };
}
