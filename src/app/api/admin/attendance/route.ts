import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { calculateLateMinutes, calculateMissingMinutes, calculateOvertimeMinutes } from "@/lib/time";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const where = {
    ...(date ? { workDate: date } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(month ? { workDate: { startsWith: month } } : {}),
  };

  const records = await prisma.attendance.findMany({
    where,
    include: { employee: { select: { id: true, name: true, active: true } } },
    orderBy: [{ workDate: "desc" }, { checkIn: "desc" }],
    take: 300,
  });

  return NextResponse.json({
    records: records.map((record) => ({
      ...record,
      computedLateMinutes: calculateLateMinutes(record.checkIn),
      missingMinutes: record.checkOut ? calculateMissingMinutes(record.checkOut) : null,
      overtimeMinutes: record.checkOut ? calculateOvertimeMinutes(record.checkOut) : null,
    })),
  });
}
