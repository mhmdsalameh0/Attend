import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { deriveAttendanceFields } from "@/lib/attendance";
import { attendanceEditSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const parsed = attendanceEditSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400 });
  }

  const { id } = await context.params;
  const existing = await prisma.attendance.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "سجل الحضور غير موجود." }, { status: 404 });
  }

  const checkIn = parsed.data.checkIn ? new Date(parsed.data.checkIn) : existing.checkIn;
  const checkOut = parsed.data.checkOut === undefined
    ? existing.checkOut
    : parsed.data.checkOut
      ? new Date(parsed.data.checkOut)
      : null;

  if (checkOut && checkOut < checkIn) {
    return NextResponse.json({ error: "لا يمكن أن يكون وقت الخروج قبل وقت الدخول." }, { status: 400 });
  }

  const derived = deriveAttendanceFields(checkIn, checkOut);
  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      workDate: parsed.data.workDate ?? existing.workDate,
      checkIn,
      checkOut,
      note: parsed.data.note,
      ...derived,
    },
  });

  return NextResponse.json({ message: "تم تحديث سجل الحضور.", record: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.attendance.delete({ where: { id } });

  return NextResponse.json({ message: "تم حذف سجل الحضور." });
}
