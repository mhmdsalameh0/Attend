import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "كلمة المرور مطلوبة." }, { status: 400 });
  }

  const isValid = await verifyAdminPassword(parsed.data.password);

  if (!isValid) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401 });
  }

  await createAdminSession();

  return NextResponse.json({ ok: true });
}
