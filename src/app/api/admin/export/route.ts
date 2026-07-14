import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { formatArabicBusinessTime, formatDuration } from "@/lib/time";

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

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
    include: { employee: { select: { name: true } } },
    orderBy: [{ workDate: "asc" }, { checkIn: "asc" }],
  });

  const rows = [
    ["Employee Name", "Date", "Check In", "Check Out", "Total Hours", "Late Minutes", "Status", "Note"],
    ...records.map((record) => [
      record.employee.name,
      record.workDate,
      formatArabicBusinessTime(record.checkIn),
      record.checkOut ? formatArabicBusinessTime(record.checkOut) : "",
      record.totalMinutes == null ? "" : formatDuration(record.totalMinutes),
      record.lateMinutes,
      record.status === "LATE" ? "Late" : "On time",
      record.note ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=attendance.csv",
    },
  });
}
