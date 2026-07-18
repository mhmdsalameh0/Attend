import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getBusinessDate } from "@/lib/time";
import { getWeeklySummary } from "@/lib/weekly-summary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart") ?? getBusinessDate();
  const employeeId = searchParams.get("employeeId");
  const summary = await getWeeklySummary(weekStart, employeeId);

  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
