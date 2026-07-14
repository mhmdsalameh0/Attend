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
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const parsed = employeeSchema.partial().safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "\u0628\u064a\u0627\u0646\u0627\u062a \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629." },
      { status: 400 },
    );
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

  return NextResponse.json({ message: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0648\u0638\u0641.", employee });
}

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const parsed = pinSchema.safeParse((await request.json()).pin);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "\u0631\u0642\u0645 \u0633\u0631\u064a \u063a\u064a\u0631 \u0635\u0627\u0644\u062d." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  await prisma.employee.update({
    where: { id },
    data: { pinHash: await bcrypt.hash(parsed.data, 12) },
  });

  return NextResponse.json({ message: "\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0633\u0631\u064a." });
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const { id } = await context.params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f." }, { status: 404 });
  }

  const [deletedAttendance] = await prisma.$transaction([
    prisma.attendance.deleteMany({ where: { employeeId: id } }),
    prisma.employee.delete({ where: { id } }),
  ]);

  return NextResponse.json({
    message: "\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0648\u0638\u0641 \u0646\u0647\u0627\u0626\u064a\u064b\u0627.",
    deletedAttendanceRecords: deletedAttendance.count,
  });
}
