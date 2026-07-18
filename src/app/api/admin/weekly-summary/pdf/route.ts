import { NextResponse } from "next/server";
import pdfMake from "pdfmake/build/pdfmake";
import vfsFonts from "pdfmake/build/vfs_fonts";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBusinessDate, type SupportedLanguage } from "@/lib/time";
import { formatWeeklyMinutes, getWeeklySummary } from "@/lib/weekly-summary";

pdfMake.addVirtualFileSystem(vfsFonts);

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
  const language: SupportedLanguage = searchParams.get("language") === "ar" ? "ar" : "en";
  const weekStart = searchParams.get("weekStart") ?? getBusinessDate();
  const employeeId = searchParams.get("employeeId");
  const [summary, employee] = await Promise.all([
    getWeeklySummary(weekStart, employeeId),
    employeeId ? prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } }) : null,
  ]);

  const labels =
    language === "ar"
      ? {
          title: "\u0645\u0644\u062e\u0635 \u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0623\u0633\u0628\u0648\u0639",
          range: "\u0627\u0644\u0623\u0633\u0628\u0648\u0639",
          employee: "\u0627\u0644\u0645\u0648\u0638\u0641",
          allEmployees: "\u0643\u0644 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
          generated: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647 \u0641\u064a",
          empty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639.",
          headers: [
            "\u0627\u0644\u0645\u0648\u0638\u0641",
            "\u0623\u064a\u0627\u0645 \u0627\u0644\u0639\u0645\u0644",
            "\u0627\u0644\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u0639\u0627\u062f\u064a\u0629",
            "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u064a",
            "\u0645\u062c\u0645\u0648\u0639 \u0627\u0644\u0633\u0627\u0639\u0627\u062a",
            "\u0633\u062c\u0644\u0627\u062a \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644\u0629",
          ],
        }
      : {
          title: "Weekly Hours Summary",
          range: "Week",
          employee: "Employee",
          allEmployees: "All employees",
          generated: "Generated at",
          empty: "No weekly summary data.",
          headers: [
            "Employee",
            "Days worked",
            "Regular hours",
            "Overtime hours",
            "Total hours",
            "Incomplete records",
          ],
        };

  const body: TableCell[][] = [
    labels.headers.map((heading) => textCell(heading, language, "tableHeader")),
    ...summary.rows.map((row) => [
      textCell(row.employeeName, language),
      textCell(String(row.daysWorked), language),
      textCell(formatWeeklyMinutes(row.regularMinutes, language), language),
      textCell(formatWeeklyMinutes(row.overtimeMinutes, language), language),
      textCell(formatWeeklyMinutes(row.totalMinutes, language), language),
      textCell(String(row.incompleteCount), language),
    ]),
  ];

  const metadata: Content[] = [
    contentText(`${labels.range}: ${summary.weekStart} - ${summary.weekEnd}`, language, "meta"),
    contentText(`${labels.employee}: ${employee?.name ?? labels.allEmployees}`, language, "meta"),
    contentText(`${labels.generated}: ${getBusinessDate()}`, language, "meta"),
  ];

  const documentDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [28, 32, 28, 32],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      alignment: language === "ar" ? "right" : "left",
    },
    content: [
      contentText(labels.title, language, "title"),
      { stack: metadata, margin: [0, 0, 0, 14] },
      summary.rows.length === 0
        ? contentText(labels.empty, language, "empty")
        : {
            table: {
              headerRows: 1,
              widths: ["*", 62, 88, 88, 88, 88],
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
      meta: { fontSize: 10, color: "#334155", margin: [0, 0, 0, 3] },
      empty: { fontSize: 11, color: "#64748b", margin: [0, 16, 0, 0] },
      tableHeader: { bold: true, color: "#0f172a", fontSize: 9 },
    },
  };

  const pdfBuffer = await pdfMake.createPdf(documentDefinition).getBuffer();
  const filename =
    language === "ar"
      ? `\u0645\u0644\u062e\u0635-\u0633\u0627\u0639\u0627\u062a-\u0627\u0644\u0623\u0633\u0628\u0648\u0639-${summary.weekStart}.pdf`
      : `weekly-hours-summary-${summary.weekStart}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": getDispositionFilename(filename),
      "Cache-Control": "no-store",
    },
  });
}
