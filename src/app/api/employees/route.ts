import { NextResponse } from "next/server";
import { getActiveEmployees } from "@/lib/attendance";

export async function GET() {
  const employees = await getActiveEmployees();

  return NextResponse.json({ employees });
}
