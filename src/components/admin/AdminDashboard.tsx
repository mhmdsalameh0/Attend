"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Employee = {
  id: string;
  name: string;
  active: boolean;
};

type AttendanceRecord = {
  id: string;
  employeeId: string;
  workDate: string;
  checkIn: string;
  checkOut: string | null;
  totalMinutes: number | null;
  lateMinutes: number;
  status: "ON_TIME" | "LATE";
  note: string | null;
  employee: Employee;
};

type AdminDashboardProps = {
  initialEmployees: Employee[];
  initialRecords: AttendanceRecord[];
  today: string;
};

function formatDateTimeForInput(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

function formatMinutes(minutes: number | null) {
  if (minutes == null) {
    return "-";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

function formatDisplayTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar-LB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Beirut",
  }).format(new Date(value));
}

export function AdminDashboard({
  initialEmployees,
  initialRecords,
  today,
}: AdminDashboardProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [records, setRecords] = useState(initialRecords);
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [employeeId, setEmployeeId] = useState("");
  const [notice, setNotice] = useState("");
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeePin, setEmployeePin] = useState("");
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const todayRecords = records.filter((record) => record.workDate === today);

    return {
      employees: employees.length,
      present: todayRecords.filter((record) => record.checkIn && !record.checkOut).length,
      late: todayRecords.filter((record) => record.lateMinutes > 0).length,
      finished: todayRecords.filter((record) => record.checkOut).length,
    };
  }, [employees.length, records, today]);

  async function loadRecords(mode: "date" | "month" = "date") {
    const params = new URLSearchParams();

    if (employeeId) {
      params.set("employeeId", employeeId);
    }

    if (mode === "month") {
      params.set("month", month);
    } else if (date) {
      params.set("date", date);
    }

    const response = await fetch(`/api/admin/attendance?${params.toString()}`);
    const result = (await response.json()) as { records?: AttendanceRecord[]; error?: string };

    if (!response.ok || !result.records) {
      throw new Error(result.error ?? "تعذّر تحميل السجلات.");
    }

    setRecords(result.records);
  }

  async function loadEmployees() {
    const response = await fetch("/api/admin/employees");
    const result = (await response.json()) as { employees?: Employee[]; error?: string };

    if (!response.ok || !result.employees) {
      throw new Error(result.error ?? "تعذّر تحميل الموظفين.");
    }

    setEmployees(result.employees);
  }

  function run(action: () => Promise<void>) {
    setNotice("");
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
      }
    });
  }

  function saveRecord() {
    if (!editingRecord) {
      return;
    }

    run(async () => {
      const checkInInput = document.getElementById("edit-check-in") as HTMLInputElement;
      const checkOutInput = document.getElementById("edit-check-out") as HTMLInputElement;
      const noteInput = document.getElementById("edit-note") as HTMLTextAreaElement;
      const response = await fetch(`/api/admin/attendance/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: new Date(checkInInput.value).toISOString(),
          checkOut: checkOutInput.value ? new Date(checkOutInput.value).toISOString() : null,
          note: noteInput.value || null,
        }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "تعذّر تحديث السجل.");
      }

      setNotice(result.message ?? "تم التحديث.");
      setEditingRecord(null);
      await loadRecords();
    });
  }

  function deleteRecord(record: AttendanceRecord) {
    if (!window.confirm(`هل تريد حذف سجل ${record.employee.name}؟`)) {
      return;
    }

    run(async () => {
      const response = await fetch(`/api/admin/attendance/${record.id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "تعذّر حذف السجل.");
      }

      setNotice(result.message ?? "تم الحذف.");
      await loadRecords();
    });
  }

  function saveEmployee(target?: Employee) {
    run(async () => {
      const url = target ? `/api/admin/employees/${target.id}` : "/api/admin/employees";
      const response = await fetch(url, {
        method: target ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: employeeName || target?.name,
          pin: employeePin || undefined,
        }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "تعذّر حفظ الموظف.");
      }

      setNotice(result.message ?? "تم حفظ الموظف.");
      setEmployeeName("");
      setEmployeePin("");
      await loadEmployees();
    });
  }

  function toggleEmployee(employee: Employee) {
    run(async () => {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !employee.active }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "تعذّر تغيير حالة الموظف.");
      }

      await loadEmployees();
    });
  }

  function changeEmployeePin(employee: Employee) {
    const pin = window.prompt(`PIN جديد لـ ${employee.name}`);

    if (!pin) {
      return;
    }

    run(async () => {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "تعذّر تغيير الرقم السري.");
      }

      setNotice(result.message ?? "تم تغيير الرقم السري.");
    });
  }

  const exportHref = `/api/admin/export?${new URLSearchParams({
    ...(employeeId ? { employeeId } : {}),
    ...(date ? { date } : {}),
  }).toString()}`;

  return (
    <div className="space-y-6" dir="rtl">
      {notice ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["عدد الموظفين", summary.employees],
          ["الحاضرون الآن", summary.present],
          ["المتأخرون اليوم", summary.late],
          ["من أنهوا الدوام", summary.finished],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
          <label className="text-sm">
            التاريخ
            <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="text-sm">
            الشهر
            <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <label className="text-sm">
            الموظف
            <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">كل الموظفين</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </label>
          <Button variant="secondary" disabled={isPending} onClick={() => run(() => loadRecords("date"))}>اليوم</Button>
          <Button variant="secondary" disabled={isPending} onClick={() => run(() => loadRecords("month"))}>الشهر</Button>
          <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white" href={exportHref}>
            <Download className="size-4" />
            CSV
          </a>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Employee", "Date", "Check-in", "Check-out", "Total hours", "Late minutes", "Status", "Notes", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-semibold">{record.employee.name}</td>
                  <td className="px-4 py-3">{record.workDate}</td>
                  <td className="px-4 py-3">{formatDisplayTime(record.checkIn)}</td>
                  <td className="px-4 py-3">{formatDisplayTime(record.checkOut)}</td>
                  <td className="px-4 py-3">{formatMinutes(record.totalMinutes)}</td>
                  <td className="px-4 py-3">{record.lateMinutes}</td>
                  <td className="px-4 py-3">{record.status === "LATE" ? "متأخر" : "في الوقت"}</td>
                  <td className="px-4 py-3">{record.note ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" onClick={() => setEditingRecord(record)} aria-label="تعديل السجل">
                        <Pencil className="size-4" />
                      </button>
                      <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => deleteRecord(record)} aria-label="حذف السجل">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>لا توجد سجلات مطابقة.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">إضافة موظف</h2>
          <label className="mt-4 block text-sm">
            الاسم
            <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm">
            PIN
            <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={employeePin} onChange={(event) => setEmployeePin(event.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" />
          </label>
          <Button className="mt-4 w-full" disabled={isPending || !employeeName || employeePin.length !== 4} onClick={() => saveEmployee()}>
            <Plus className="size-4" />
            إضافة
          </Button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">إدارة الموظفين</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {employees.map((employee) => (
              <div key={employee.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{employee.name}</p>
                  <p className="text-sm text-slate-500">{employee.active ? "فعال" : "معطل"}</p>
                </div>
                <Button variant="secondary" disabled={isPending} onClick={() => {
                  const name = window.prompt("اسم الموظف", employee.name);
                  if (name) {
                    setEmployeeName(name);
                    setEmployeePin("");
                    saveEmployee({ ...employee, name });
                  }
                }}>تعديل</Button>
                <Button variant="secondary" disabled={isPending} onClick={() => toggleEmployee(employee)}>
                  {employee.active ? "تعطيل" : "تفعيل"}
                </Button>
                <Button variant="secondary" disabled={isPending} onClick={() => changeEmployeePin(employee)}>
                  تغيير PIN
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editingRecord ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold">تعديل سجل الحضور</h2>
            <label className="mt-4 block text-sm">
              وقت الدخول
              <input id="edit-check-in" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="datetime-local" defaultValue={formatDateTimeForInput(editingRecord.checkIn)} />
            </label>
            <label className="mt-3 block text-sm">
              وقت الخروج
              <input id="edit-check-out" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="datetime-local" defaultValue={formatDateTimeForInput(editingRecord.checkOut)} />
            </label>
            <label className="mt-3 block text-sm">
              الملاحظات
              <textarea id="edit-note" className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" defaultValue={editingRecord.note ?? ""} />
            </label>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button disabled={isPending} onClick={saveRecord}>حفظ</Button>
              <Button variant="secondary" onClick={() => setEditingRecord(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
