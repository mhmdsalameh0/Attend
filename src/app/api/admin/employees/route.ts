import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";
import { employeeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ employees }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d." }, { status: 401 });
  }

  const parsed = employeeSchema.required({ pin: true }).safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "\u0628\u064a\u0627\u0646\u0627\u062a \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629." },
      { status: 400 },
    );
  }

  const pinHash = await bcrypt.hash(parsed.data.pin, 12);
  const employee = await prisma.employee.create({
    data: {
      name: parsed.data.name,
      pinHash,
      active: parsed.data.active ?? true,
    },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  revalidatePath("/");

  return NextResponse.json(
    { message: "\u062a\u0645\u062a \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0638\u0641.", employee },
    { headers: noStoreHeaders },
  );
}
