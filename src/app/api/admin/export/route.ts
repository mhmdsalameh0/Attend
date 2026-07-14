import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  calculateLateMinutes,
  calculateMissingMinutes,
  calculateOvertimeMinutes,
  formatArabicBusinessTime,
  formatBusinessTime,
  formatDuration,
  type SupportedLanguage,
} from "@/lib/time";

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function timeCell(date: Date | null, language: SupportedLanguage) {
  if (!date) return "";
  return language === "ar" ? formatArabicBusinessTime(date) : formatBusinessTime(date);
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const language: SupportedLanguage = searchParams.get("language") === "ar" ? "ar" : "en";
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

  const headings =
    language === "ar"
      ? [
          "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641",
          "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
          "\u0627\u0644\u062f\u062e\u0648\u0644",
          "\u0627\u0644\u062e\u0631\u0648\u062c",
          "\u0645\u062c\u0645\u0648\u0639 \u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0645\u0644",
          "\u0627\u0644\u062a\u0623\u062e\u064a\u0631",
          "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0646\u0627\u0642\u0635",
          "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u064a",
          "\u0627\u0644\u062d\u0627\u0644\u0629",
          "\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629",
        ]
      : [
          "Employee Name",
          "Date",
          "Check In",
          "Check Out",
          "Total Hours",
          "Late",
          "Missing Time",
          "Overtime",
          "Status",
          "Note",
        ];

  const rows = [
    headings,
    ...records.map((record) => {
      const lateMinutes = calculateLateMinutes(record.checkIn);
      const missingMinutes = record.checkOut ? calculateMissingMinutes(record.checkOut) : null;
      const overtimeMinutes = record.checkOut ? calculateOvertimeMinutes(record.checkOut) : null;

      return [
        record.employee.name,
        record.workDate,
        timeCell(record.checkIn, language),
        timeCell(record.checkOut, language),
        record.totalMinutes == null ? "" : formatDuration(record.totalMinutes, language),
        formatDuration(lateMinutes, language),
        missingMinutes == null ? "" : formatDuration(missingMinutes, language),
        overtimeMinutes == null ? "" : formatDuration(overtimeMinutes, language),
        record.status === "LATE"
          ? language === "ar"
            ? "\u0645\u062a\u0623\u062e\u0631"
            : "Late"
          : language === "ar"
            ? "\u0641\u064a \u0627\u0644\u0648\u0642\u062a"
            : "On time",
        record.note ?? "",
      ];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=attendance.csv",
    },
  });
}
