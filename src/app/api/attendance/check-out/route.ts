import { NextResponse } from "next/server";
import { attendanceActionSchema } from "@/lib/validation";
import { checkOut } from "@/lib/attendance";

export async function POST(request: Request) {
  const parsed = attendanceActionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data." }, { status: 400 });
  }

  const result = await checkOut(parsed.data.employeeId, parsed.data.pin, parsed.data.language ?? "en");

  return NextResponse.json(
    result.ok ? { message: result.message } : { error: result.message },
    { status: result.ok ? 200 : 400 },
  );
}
