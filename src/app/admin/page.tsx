import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LogoutButton } from "@/components/LogoutButton";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBusinessDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const today = getBusinessDate();
  const [employees, records] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, active: true },
    }),
    prisma.attendance.findMany({
      where: { workDate: today },
      include: { employee: { select: { id: true, name: true, active: true } } },
      orderBy: [{ workDate: "desc" }, { checkIn: "desc" }],
      take: 300,
    }),
  ]);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">لوحة الإدارة</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">إدارة الحضور</h1>
          </div>
          <LogoutButton />
        </header>
        <AdminDashboard
          today={today}
          initialEmployees={employees}
          initialRecords={records.map((record) => ({
            ...record,
            checkIn: record.checkIn.toISOString(),
            checkOut: record.checkOut?.toISOString() ?? null,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
