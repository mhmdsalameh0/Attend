import { NextResponse } from "next/server";
import { getPublicAttendanceSnapshot } from "@/lib/attendance";

export async function GET() {
  try {
    const employees = await getPublicAttendanceSnapshot();
    return NextResponse.json({ employees });
  } catch {
    return NextResponse.json(
      { error: "تعذّر تحميل بيانات الحضور. تأكد من اتصال قاعدة البيانات." },
      { status: 500 },
    );
  }
}
