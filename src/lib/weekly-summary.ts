import { prisma } from "@/lib/db";
import {
  calculateOvertimeMinutes,
  calculateTotalMinutes,
  formatDuration,
  type SupportedLanguage,
} from "@/lib/time";

export type WeeklySummaryRow = {
  employeeId: string;
  employeeName: string;
  daysWorked: number;
  regularMinutes: number;
  overtimeMinutes: number;
  totalMinutes: number;
  incompleteCount: number;
};

export type WeeklySummaryResult = {
  weekStart: string;
  weekEnd: string;
  rows: WeeklySummaryRow[];
};

export function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getMondayForDateString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return addDaysToDateString(dateString, -daysSinceMonday);
}

export async function getWeeklySummary(weekStartInput: string, employeeId?: string | null): Promise<WeeklySummaryResult> {
  const weekStart = getMondayForDateString(weekStartInput);
  const weekEnd = addDaysToDateString(weekStart, 6);

  const employees = await prisma.employee.findMany({
    where: employeeId ? { id: employeeId } : {},
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const attendance = await prisma.attendance.findMany({
    where: {
      workDate: {
        gte: weekStart,
        lte: weekEnd,
      },
      ...(employeeId ? { employeeId } : {}),
    },
    select: {
      employeeId: true,
      workDate: true,
      checkIn: true,
      checkOut: true,
      totalMinutes: true,
    },
  });

  const attendanceByEmployee = new Map<string, typeof attendance>();

  for (const record of attendance) {
    const list = attendanceByEmployee.get(record.employeeId) ?? [];
    list.push(record);
    attendanceByEmployee.set(record.employeeId, list);
  }

  const rows = employees.map((employee) => {
    const employeeAttendance = attendanceByEmployee.get(employee.id) ?? [];
    const completedDays = new Set<string>();
    let regularMinutes = 0;
    let overtimeMinutes = 0;
    let totalMinutes = 0;
    let incompleteCount = 0;

    for (const record of employeeAttendance) {
      if (!record.checkOut) {
        incompleteCount += 1;
        continue;
      }

      const workedMinutes = record.totalMinutes ?? calculateTotalMinutes(record.checkIn, record.checkOut);
      const recordOvertimeMinutes = calculateOvertimeMinutes(record.checkOut);
      completedDays.add(record.workDate);
      overtimeMinutes += recordOvertimeMinutes;
      totalMinutes += workedMinutes;
      regularMinutes += Math.max(0, workedMinutes - recordOvertimeMinutes);
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      daysWorked: completedDays.size,
      regularMinutes,
      overtimeMinutes,
      totalMinutes,
      incompleteCount,
    };
  });

  return { weekStart, weekEnd, rows };
}

export function formatWeeklyMinutes(minutes: number, language: SupportedLanguage) {
  return formatDuration(minutes, language);
}
