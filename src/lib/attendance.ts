import { AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendCheckInEmail, sendCheckOutEmail } from "@/lib/email";
import { clearFailedPin, isPinLocked, recordFailedPin } from "@/lib/rate-limit";
import {
  calculateLateMinutes,
  calculateMissingMinutes,
  calculateOvertimeMinutes,
  calculateTotalMinutes,
  formatArabicBusinessTime,
  formatBusinessDateTime,
  formatBusinessTime,
  formatDuration,
  getBusinessDate,
} from "@/lib/time";

type Language = "en" | "ar";

const messages = {
  en: {
    locked: "Too many wrong PIN attempts. Please try again later.",
    inactive: "Employee was not found or is disabled.",
    wrongPin: "Incorrect PIN.",
    doubleCheckIn: "You cannot check in twice on the same work date.",
    checkoutBeforeCheckin: "You cannot check out before checking in.",
    doubleCheckOut: "You already checked out today.",
    emailFailed: "Attendance was saved, but the email notification could not be sent.",
    checkIn: (name: string, time: string) => `${name} checked in at ${time}.`,
    checkOut: (name: string, time: string, total: string) =>
      `${name} checked out at ${time}. Total worked time: ${total}.`,
  },
  ar: {
    locked: "تم إيقاف المحاولات مؤقتًا. حاول لاحقًا.",
    inactive: "الموظف غير موجود أو غير مفعل.",
    wrongPin: "الرقم السري غير صحيح.",
    doubleCheckIn: "لا يمكن تسجيل الدخول مرتين في نفس يوم العمل.",
    checkoutBeforeCheckin: "لا يمكن تسجيل الخروج قبل تسجيل الدخول.",
    doubleCheckOut: "تم تسجيل الخروج مسبقًا لهذا اليوم.",
    emailFailed: "تم حفظ العملية، ولكن تعذّر إرسال إشعار الإيميل.",
    checkIn: (name: string, time: string) => `تم تسجيل دخول ${name} الساعة ${time}.`,
    checkOut: (name: string, time: string, total: string) =>
      `تم تسجيل خروج ${name} الساعة ${time}. مجموع وقت العمل: ${total}.`,
  },
};

async function verifyPin(employeeId: string, pin: string, language: Language) {
  const t = messages[language];

  if (isPinLocked(employeeId)) {
    return { ok: false as const, message: t.locked };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, active: true },
  });

  if (!employee) {
    return { ok: false as const, message: t.inactive };
  }

  const pinMatches = await bcrypt.compare(pin, employee.pinHash);

  if (!pinMatches) {
    recordFailedPin(employeeId);
    return { ok: false as const, message: t.wrongPin };
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
          totalMinutes: true,
        },
      },
    },
  });

  return employees.map((employee) => {
    const today = employee.attendance[0];
    const lateMinutes = today?.checkIn ? calculateLateMinutes(today.checkIn) : 0;
    let status: "not_started" | "present" | "finished" | "late" = "not_started";

    if (today?.checkOut) {
      status = "finished";
    } else if (lateMinutes > 0) {
      status = "late";
    } else if (today?.checkIn) {
      status = "present";
    }

    return {
      id: employee.id,
      name: employee.name,
      status,
      checkIn: today?.checkIn ? today.checkIn.toISOString() : null,
      checkOut: today?.checkOut ? today.checkOut.toISOString() : null,
      totalMinutes: today?.totalMinutes ?? null,
      lateMinutes,
      missingMinutes: today?.checkOut ? calculateMissingMinutes(today.checkOut) : 0,
      overtimeMinutes: today?.checkOut ? calculateOvertimeMinutes(today.checkOut) : 0,
    };
  });
}

export async function checkIn(employeeId: string, pin: string, language: Language = "en") {
  const t = messages[language];
  const verified = await verifyPin(employeeId, pin, language);

  if (!verified.ok) {
    return { ok: false as const, message: verified.message };
  }

  const now = new Date();
  const workDate = getBusinessDate(now);
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_workDate: { employeeId, workDate } },
  });

  if (existing) {
    return { ok: false as const, message: t.doubleCheckIn };
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
      status: record.status === AttendanceStatus.ON_TIME ? "On time" : `Late by ${formatDuration(lateMinutes, "en")}`,
    });
  } catch (error) {
    console.error("Attendance email failed after check-in", error instanceof Error ? error.message : "Unknown error");
    return {
      ok: true as const,
      message: t.emailFailed,
    };
  }

  return {
    ok: true as const,
    message: t.checkIn(
      record.employee.name,
      language === "ar" ? formatArabicBusinessTime(record.checkIn) : formatBusinessTime(record.checkIn),
    ),
  };
}

export async function checkOut(employeeId: string, pin: string, language: Language = "en") {
  const t = messages[language];
  const verified = await verifyPin(employeeId, pin, language);

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
    return { ok: false as const, message: t.checkoutBeforeCheckin };
  }

  if (record.checkOut) {
    return { ok: false as const, message: t.doubleCheckOut };
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
      totalWorked: formatDuration(totalMinutes, "en"),
    });
  } catch (error) {
    console.error("Attendance email failed after check-out", error instanceof Error ? error.message : "Unknown error");
    return {
      ok: true as const,
      message: t.emailFailed,
    };
  }

  return {
    ok: true as const,
    message: t.checkOut(
      updated.employee.name,
      language === "ar"
        ? formatArabicBusinessTime(updated.checkOut ?? now)
        : formatBusinessTime(updated.checkOut ?? now),
      formatDuration(totalMinutes, language),
    ),
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
