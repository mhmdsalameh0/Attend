import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { employeeSchema, pinSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const parsed = employeeSchema.partial().safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." }, { status: 400 });
  }

  const { id } = await context.params;
  const data: { name?: string; active?: boolean; pinHash?: string } = {};

  if (parsed.data.name) {
    data.name = parsed.data.name;
  }

  if (typeof parsed.data.active === "boolean") {
    data.active = parsed.data.active;
  }

  if (parsed.data.pin) {
    data.pinHash = await bcrypt.hash(parsed.data.pin, 12);
  }

  const employee = await prisma.employee.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ message: "تم تحديث الموظف.", employee });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const parsed = pinSchema.safeParse((await request.json()).pin);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "رقم سري غير صالح." }, { status: 400 });
  }

  const { id } = await context.params;
  await prisma.employee.update({
    where: { id },
    data: { pinHash: await bcrypt.hash(parsed.data, 12) },
  });

  return NextResponse.json({ message: "تم تغيير الرقم السري." });
}
