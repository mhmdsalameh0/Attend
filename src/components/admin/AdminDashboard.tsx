"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Download, Languages, Pencil, Plus, Trash2 } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/Button";

type Language = "en" | "ar";

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

const copy = {
  en: {
    eyebrow: "Admin dashboard",
    title: "Attendance management",
    employeesCount: "Employees",
    presentNow: "Present now",
    lateToday: "Late today",
    finishedToday: "Finished today",
    date: "Date",
    month: "Month",
    employee: "Employee",
    allEmployees: "All employees",
    viewDate: "View date",
    viewMonth: "View month",
    exportCsv: "CSV",
    table: ["Employee", "Date", "Check-in", "Check-out", "Total hours", "Late minutes", "Status", "Notes", "Actions"],
    noRecords: "No matching attendance records.",
    onTime: "On time",
    late: "Late",
    addEmployee: "Add employee",
    name: "Name",
    pin: "PIN",
    add: "Add",
    manageEmployees: "Employee management",
    active: "Active",
    disabled: "Disabled",
    edit: "Edit",
    enable: "Enable",
    disable: "Disable",
    changePin: "Change PIN",
    editRecord: "Edit attendance record",
    checkInTime: "Check-in time",
    checkOutTime: "Check-out time",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    deleteConfirm: "Delete attendance record for",
    promptName: "Employee name",
    promptPin: "New PIN for",
    loadRecordsError: "Could not load attendance records.",
    loadEmployeesError: "Could not load employees.",
    unexpected: "Something went wrong.",
    updateRecordError: "Could not update the record.",
    deleteRecordError: "Could not delete the record.",
    saveEmployeeError: "Could not save employee.",
    toggleEmployeeError: "Could not change employee status.",
    changePinError: "Could not change employee PIN.",
    updated: "Record updated.",
    deleted: "Record deleted.",
    employeeSaved: "Employee saved.",
    pinChanged: "PIN changed.",
  },
  ar: {
    eyebrow: "لوحة الإدارة",
    title: "إدارة الحضور",
    employeesCount: "عدد الموظفين",
    presentNow: "الحاضرون الآن",
    lateToday: "المتأخرون اليوم",
    finishedToday: "من أنهوا الدوام",
    date: "التاريخ",
    month: "الشهر",
    employee: "الموظف",
    allEmployees: "كل الموظفين",
    viewDate: "عرض التاريخ",
    viewMonth: "عرض الشهر",
    exportCsv: "CSV",
    table: ["الموظف", "التاريخ", "الدخول", "الخروج", "إجمالي الساعات", "دقائق التأخير", "الحالة", "الملاحظات", "الإجراءات"],
    noRecords: "لا توجد سجلات مطابقة.",
    onTime: "في الوقت",
    late: "متأخر",
    addEmployee: "إضافة موظف",
    name: "الاسم",
    pin: "الرقم السري",
    add: "إضافة",
    manageEmployees: "إدارة الموظفين",
    active: "فعال",
    disabled: "معطل",
    edit: "تعديل",
    enable: "تفعيل",
    disable: "تعطيل",
    changePin: "تغيير PIN",
    editRecord: "تعديل سجل الحضور",
    checkInTime: "وقت الدخول",
    checkOutTime: "وقت الخروج",
    notes: "الملاحظات",
    save: "حفظ",
    cancel: "إلغاء",
    deleteConfirm: "هل تريد حذف سجل",
    promptName: "اسم الموظف",
    promptPin: "PIN جديد لـ",
    loadRecordsError: "تعذّر تحميل سجلات الحضور.",
    loadEmployeesError: "تعذّر تحميل الموظفين.",
    unexpected: "حدث خطأ غير متوقع.",
    updateRecordError: "تعذّر تحديث السجل.",
    deleteRecordError: "تعذّر حذف السجل.",
    saveEmployeeError: "تعذّر حفظ الموظف.",
    toggleEmployeeError: "تعذّر تغيير حالة الموظف.",
    changePinError: "تعذّر تغيير الرقم السري.",
    updated: "تم تحديث السجل.",
    deleted: "تم حذف السجل.",
    employeeSaved: "تم حفظ الموظف.",
    pinChanged: "تم تغيير الرقم السري.",
  },
};

function formatDateTimeForInput(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

function formatMinutes(minutes: number | null) {
  if (minutes == null) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${String(mins).padStart(2, "0")}`;
}

function formatDisplayTime(value: string | null, language: Language) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Beirut",
  }).format(new Date(value));
}

export function AdminDashboard({ initialEmployees, initialRecords, today }: AdminDashboardProps) {
  const [language, setLanguage] = useState<Language>("en");
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
  const t = copy[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("attendance-language");
    if (savedLanguage === "en" || savedLanguage === "ar") {
      queueMicrotask(() => setLanguage(savedLanguage));
    }
  }, []);

  function setSavedLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("attendance-language", nextLanguage);
  }

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
    if (employeeId) params.set("employeeId", employeeId);
    if (mode === "month") params.set("month", month);
    else if (date) params.set("date", date);

    const response = await fetch(`/api/admin/attendance?${params.toString()}`);
    const result = (await response.json()) as { records?: AttendanceRecord[]; error?: string };
    if (!response.ok || !result.records) throw new Error(result.error ?? t.loadRecordsError);
    setRecords(result.records);
  }

  async function loadEmployees() {
    const response = await fetch("/api/admin/employees");
    const result = (await response.json()) as { employees?: Employee[]; error?: string };
    if (!response.ok || !result.employees) throw new Error(result.error ?? t.loadEmployeesError);
    setEmployees(result.employees);
  }

  function run(action: () => Promise<void>) {
    setNotice("");
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : t.unexpected);
      }
    });
  }

  function saveRecord() {
    if (!editingRecord) return;
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
      if (!response.ok) throw new Error(result.error ?? t.updateRecordError);
      setNotice(result.message ?? t.updated);
      setEditingRecord(null);
      await loadRecords();
    });
  }

  function deleteRecord(record: AttendanceRecord) {
    if (!window.confirm(`${t.deleteConfirm} ${record.employee.name}?`)) return;
    run(async () => {
      const response = await fetch(`/api/admin/attendance/${record.id}`, { method: "DELETE" });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? t.deleteRecordError);
      setNotice(result.message ?? t.deleted);
      await loadRecords();
    });
  }

  function saveEmployee(target?: Employee) {
    run(async () => {
      const url = target ? `/api/admin/employees/${target.id}` : "/api/admin/employees";
      const response = await fetch(url, {
        method: target ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: employeeName || target?.name, pin: employeePin || undefined }),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? t.saveEmployeeError);
      setNotice(result.message ?? t.employeeSaved);
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
        throw new Error(result.error ?? t.toggleEmployeeError);
      }
      await loadEmployees();
    });
  }

  function changeEmployeePin(employee: Employee) {
    const pin = window.prompt(`${t.promptPin} ${employee.name}`);
    if (!pin) return;
    run(async () => {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? t.changePinError);
      setNotice(result.message ?? t.pinChanged);
    });
  }

  const exportHref = `/api/admin/export?${new URLSearchParams({
    ...(employeeId ? { employeeId } : {}),
    ...(date ? { date } : {}),
  }).toString()}`;

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className={`space-y-6 ${language === "ar" ? "text-right" : "text-left"}`}>
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{t.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setSavedLanguage("en")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${language === "en" ? "bg-slate-950 text-white" : "text-slate-700"}`}>English</button>
            <button type="button" onClick={() => setSavedLanguage("ar")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${language === "ar" ? "bg-slate-950 text-white" : "text-slate-700"}`}><Languages className="size-4" />العربية</button>
          </div>
          <LogoutButton />
        </div>
      </header>

      {notice ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          [t.employeesCount, summary.employees],
          [t.presentNow, summary.present],
          [t.lateToday, summary.late],
          [t.finishedToday, summary.finished],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
          <label className="text-sm">{t.date}<input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="text-sm">{t.month}<input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <label className="text-sm">{t.employee}<select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">{t.allEmployees}</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <Button variant="secondary" disabled={isPending} onClick={() => run(() => loadRecords("date"))}>{t.viewDate}</Button>
          <Button variant="secondary" disabled={isPending} onClick={() => run(() => loadRecords("month"))}>{t.viewMonth}</Button>
          <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white" href={exportHref}><Download className="size-4" />{t.exportCsv}</a>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr>{t.table.map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-semibold">{record.employee.name}</td>
                  <td className="px-4 py-3">{record.workDate}</td>
                  <td className="px-4 py-3">{formatDisplayTime(record.checkIn, language)}</td>
                  <td className="px-4 py-3">{formatDisplayTime(record.checkOut, language)}</td>
                  <td className="px-4 py-3">{formatMinutes(record.totalMinutes)}</td>
                  <td className="px-4 py-3">{record.lateMinutes}</td>
                  <td className="px-4 py-3">{record.status === "LATE" ? t.late : t.onTime}</td>
                  <td className="px-4 py-3">{record.note ?? "-"}</td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" onClick={() => setEditingRecord(record)} aria-label={t.edit}><Pencil className="size-4" /></button><button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => deleteRecord(record)} aria-label={t.deleteRecordError}><Trash2 className="size-4" /></button></div></td>
                </tr>
              ))}
              {records.length === 0 ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={9}>{t.noRecords}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{t.addEmployee}</h2>
          <label className="mt-4 block text-sm">{t.name}<input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} /></label>
          <label className="mt-3 block text-sm">{t.pin}<input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" value={employeePin} onChange={(event) => setEmployeePin(event.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" /></label>
          <Button className="mt-4 w-full" disabled={isPending || !employeeName || employeePin.length !== 4} onClick={() => saveEmployee()}><Plus className="size-4" />{t.add}</Button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{t.manageEmployees}</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {employees.map((employee) => (
              <div key={employee.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div><p className="font-semibold">{employee.name}</p><p className="text-sm text-slate-500">{employee.active ? t.active : t.disabled}</p></div>
                <Button variant="secondary" disabled={isPending} onClick={() => { const name = window.prompt(t.promptName, employee.name); if (name) { setEmployeeName(name); setEmployeePin(""); saveEmployee({ ...employee, name }); } }}>{t.edit}</Button>
                <Button variant="secondary" disabled={isPending} onClick={() => toggleEmployee(employee)}>{employee.active ? t.disable : t.enable}</Button>
                <Button variant="secondary" disabled={isPending} onClick={() => changeEmployeePin(employee)}>{t.changePin}</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editingRecord ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold">{t.editRecord}</h2>
            <label className="mt-4 block text-sm">{t.checkInTime}<input id="edit-check-in" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="datetime-local" defaultValue={formatDateTimeForInput(editingRecord.checkIn)} /></label>
            <label className="mt-3 block text-sm">{t.checkOutTime}<input id="edit-check-out" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" type="datetime-local" defaultValue={formatDateTimeForInput(editingRecord.checkOut)} /></label>
            <label className="mt-3 block text-sm">{t.notes}<textarea id="edit-note" className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" defaultValue={editingRecord.note ?? ""} /></label>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Button disabled={isPending} onClick={saveRecord}>{t.save}</Button><Button variant="secondary" onClick={() => setEditingRecord(null)}>{t.cancel}</Button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
