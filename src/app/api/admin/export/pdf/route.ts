import { NextResponse } from "next/server";
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  calculateLateMinutes,
  calculateMissingMinutes,
  calculateOvertimeMinutes,
  formatArabicBusinessTime,
  formatBusinessTime,
  formatDuration,
  getBusinessDate,
  getScheduleLabel,
  type SupportedLanguage,
} from "@/lib/time";

pdfMake.addVirtualFileSystem(vfsFonts);

function timeCell(date: Date | null, language: SupportedLanguage) {
  if (!date) return "-";
  return language === "ar" ? formatArabicBusinessTime(date) : formatBusinessTime(date);
}

function textCell(text: string, language: SupportedLanguage, style?: string): TableCell {
  return {
    text,
    style,
    alignment: language === "ar" ? "right" : "left",
    noWrap: false,
  };
}

function contentText(text: string, language: SupportedLanguage, style?: string): Content {
  return {
    text,
    style,
    alignment: language === "ar" ? "right" : "left",
  };
}

function getDispositionFilename(filename: string) {
  const fallback = filename.replace(/[^\w.-]/g, "-");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
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

  const [records, employee] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { select: { name: true } } },
      orderBy: [{ workDate: "asc" }, { checkIn: "asc" }],
    }),
    employeeId
      ? prisma.employee.findUnique({
          where: { id: employeeId },
          select: { name: true },
        })
      : null,
  ]);

  const labels =
    language === "ar"
      ? {
          title: "\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u0636\u0648\u0631",
          range: "\u0627\u0644\u0641\u062a\u0631\u0629",
          schedule: "\u0627\u0644\u062f\u0648\u0627\u0645 \u0627\u0644\u0631\u0633\u0645\u064a",
          employee: "\u0627\u0644\u0645\u0648\u0638\u0641",
          allEmployees: "\u0643\u0644 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
          generated: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647 \u0641\u064a",
          empty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629.",
          headers: [
            "\u0627\u0644\u0645\u0648\u0638\u0641",
            "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
            "\u0627\u0644\u062f\u062e\u0648\u0644",
            "\u0627\u0644\u062e\u0631\u0648\u062c",
            "\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0633\u0627\u0639\u0627\u062a",
            "\u0627\u0644\u062a\u0623\u062e\u064a\u0631",
            "\u0627\u0644\u0646\u0627\u0642\u0635",
            "\u0627\u0644\u0625\u0636\u0627\u0641\u064a",
            "\u0627\u0644\u062d\u0627\u0644\u0629",
            "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
          ],
          late: "\u0645\u062a\u0623\u062e\u0631",
          onTime: "\u0641\u064a \u0627\u0644\u0648\u0642\u062a",
        }
      : {
          title: "Attendance Report",
          range: "Date range",
          schedule: "Official schedule",
          employee: "Employee",
          allEmployees: "All employees",
          generated: "Generated at",
          empty: "No matching attendance records.",
          headers: [
            "Employee",
            "Date",
            "Check-in",
            "Check-out",
            "Total hours",
            "Late",
            "Missing",
            "Overtime",
            "Status",
            "Notes",
          ],
          late: "Late",
          onTime: "On time",
        };

  const rangeLabel = date ?? month ?? (language === "ar" ? "\u0643\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a" : "All records");
  const body: TableCell[][] = [
    labels.headers.map((heading) => textCell(heading, language, "tableHeader")),
    ...records.map((record) => {
      const lateMinutes = calculateLateMinutes(record.checkIn);
      const missingMinutes = record.checkOut ? calculateMissingMinutes(record.checkOut) : null;
      const overtimeMinutes = record.checkOut ? calculateOvertimeMinutes(record.checkOut) : null;

      return [
        textCell(record.employee.name, language),
        textCell(record.workDate, language),
        textCell(timeCell(record.checkIn, language), language),
        textCell(timeCell(record.checkOut, language), language),
        textCell(record.totalMinutes == null ? "-" : formatDuration(record.totalMinutes, language), language),
        textCell(formatDuration(lateMinutes, language), language),
        textCell(missingMinutes == null ? "-" : formatDuration(missingMinutes, language), language),
        textCell(overtimeMinutes == null ? "-" : formatDuration(overtimeMinutes, language), language),
        textCell(record.status === "LATE" ? labels.late : labels.onTime, language),
        textCell(record.note ?? "-", language),
      ];
    }),
  ];

  const metadata: Content[] = [
    contentText(`${labels.range}: ${rangeLabel}`, language, "meta"),
    contentText(`${labels.employee}: ${employee?.name ?? labels.allEmployees}`, language, "meta"),
    contentText(`${labels.schedule}: ${getScheduleLabel(language)}`, language, "meta"),
    contentText(`${labels.generated}: ${getBusinessDate()}`, language, "meta"),
  ];

  const documentDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [24, 28, 24, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
      alignment: language === "ar" ? "right" : "left",
    },
    content: [
      contentText(labels.title, language, "title"),
      {
        columns:
          language === "ar"
            ? [{ width: "*", stack: metadata, alignment: "right" }]
            : [{ width: "*", stack: metadata, alignment: "left" }],
        margin: [0, 0, 0, 14],
      },
      records.length === 0
        ? contentText(labels.empty, language, "empty")
        : {
            table: {
              headerRows: 1,
              widths: ["*", 48, 48, 48, 54, 48, 50, 50, 44, "*"],
              body,
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f1f5f9" : rowIndex % 2 === 0 ? "#f8fafc" : null),
              hLineColor: () => "#dbe3ee",
              vLineColor: () => "#e2e8f0",
            },
          },
    ],
    styles: {
      title: { fontSize: 18, bold: true, color: "#0f172a", margin: [0, 0, 0, 10] },
      meta: { fontSize: 9, color: "#334155", margin: [0, 0, 0, 3] },
      empty: { fontSize: 11, color: "#64748b", margin: [0, 16, 0, 0] },
      tableHeader: { bold: true, color: "#0f172a", fontSize: 8 },
    },
  };

  const pdfBuffer = await pdfMake.createPdf(documentDefinition).getBuffer();
  const filename = language === "ar" ? `\u062a\u0642\u0631\u064a\u0631-\u0627\u0644\u062d\u0636\u0648\u0631-${rangeLabel}.pdf` : `attendance-report-${rangeLabel}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": getDispositionFilename(filename),
      "Cache-Control": "no-store",
    },
  });
}
