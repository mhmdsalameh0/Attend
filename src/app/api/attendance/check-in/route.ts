import { NextResponse } from "next/server";
import { attendanceActionSchema } from "@/lib/validation";
import { checkIn } from "@/lib/attendance";

export async function POST(request: Request) {
  const parsed = attendanceActionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400 });
  }

  const result = await checkIn(parsed.data.employeeId, parsed.data.pin);

  return NextResponse.json(
    result.ok ? { message: result.message } : { error: result.message },
    { status: result.ok ? 200 : 400 },
  );
}
