import { NextResponse } from "next/server";
import { getPublicAttendanceSnapshot } from "@/lib/attendance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  try {
    const employees = await getPublicAttendanceSnapshot();
    return NextResponse.json({ employees }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      {
        error:
          "\u062a\u0639\u0630\u0651\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0636\u0648\u0631. \u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u062a\u0635\u0627\u0644 \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
