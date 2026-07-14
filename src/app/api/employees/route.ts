import { NextResponse } from "next/server";
import { getActiveEmployees } from "@/lib/attendance";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  const employees = await getActiveEmployees();

  return NextResponse.json({ employees }, { headers: noStoreHeaders });
}
