"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Clock3, Languages, LogIn, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type StatusKey = "not_started" | "present" | "finished" | "late";
type Language = "en" | "ar";

type EmployeeStatus = {
  id: string;
  name: string;
  status: StatusKey;
  checkIn: string | null;
  checkOut: string | null;
  totalMinutes: number | null;
  lateMinutes: number;
  missingMinutes: number;
  overtimeMinutes: number;
};

type PublicAttendanceProps = {
  initialEmployees: EmployeeStatus[];
  initialError?: string;
  initialDate: string;
  initialTime: string;
};

const text = {
  en: {
    appName: "Employee Attendance System",
    subtitle: "Choose your name and record check-in or check-out",
    date: "Date",
    now: "Current time",
    employees: "Employees",
    pin: "4-digit PIN",
    checkIn: "Check in",
    checkOut: "Check out",
    saving: "Saving...",
    close: "Close",
    noRecord: "No record today",
    in: "Check-in",
    out: "Check-out",
    total: "Total",
    schedule: "Official shift",
    lateLabel: "Late",
    missingTime: "Missing time",
    overtime: "Overtime",
    empty: "No active employees. Add employees from the admin dashboard or run the seed script.",
    unexpected: "Something went wrong.",
    refreshError: "Could not refresh attendance data.",
    switch: "العربية",
    statuses: {
      not_started: "Not checked in",
      present: "Present now",
      finished: "Finished shift",
      late: "Late",
    },
  },
  ar: {
    appName: "\u0646\u0638\u0627\u0645 \u062d\u0636\u0648\u0631 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
    subtitle: "\u0627\u062e\u062a\u0631 \u0627\u0633\u0645\u0643 \u0648\u0633\u062c\u0651\u0644 \u0648\u0642\u062a \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0648 \u0627\u0644\u062e\u0631\u0648\u062c",
    date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
    now: "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0622\u0646",
    employees: "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646",
    pin: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0633\u0631\u064a \u0645\u0646 4 \u0623\u0631\u0642\u0627\u0645",
    checkIn: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
    checkOut: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
    saving: "\u062c\u0627\u0631\u064d \u0627\u0644\u062d\u0641\u0638...",
    close: "\u0625\u063a\u0644\u0627\u0642",
    noRecord: "\u0644\u0627 \u064a\u0648\u062c\u062f \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u064a\u0648\u0645",
    in: "\u0627\u0644\u062f\u062e\u0648\u0644",
    out: "\u0627\u0644\u062e\u0631\u0648\u062c",
    total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    schedule: "\u0627\u0644\u062f\u0648\u0627\u0645 \u0627\u0644\u0631\u0633\u0645\u064a",
    lateLabel: "\u0627\u0644\u062a\u0623\u062e\u064a\u0631",
    missingTime: "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0646\u0627\u0642\u0635",
    overtime: "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u064a",
    empty: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0648\u0638\u0641\u0648\u0646 \u0641\u0639\u0627\u0644\u0648\u0646. \u0623\u0636\u0641 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646 \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0623\u0648 \u0634\u063a\u0651\u0644 \u0627\u0644\u0628\u0630\u0631.",
    unexpected: "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639.",
    refreshError: "\u062a\u0639\u0630\u0651\u0631 \u062a\u062d\u062f\u064a\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0636\u0648\u0631.",
    switch: "English",
    statuses: {
      not_started: "\u0644\u0645 \u064a\u0633\u062c\u0651\u0644 \u0628\u0639\u062f",
      present: "\u062d\u0627\u0636\u0631 \u0627\u0644\u0622\u0646",
      finished: "\u0623\u0646\u0647\u0649 \u0627\u0644\u062f\u0648\u0627\u0645",
      late: "\u0645\u062a\u0623\u062e\u0631",
    },
  },
};

const statusStyles: Record<StatusKey, string> = {
  not_started: "bg-slate-100 text-slate-600",
  present: "bg-emerald-50 text-emerald-700",
  finished: "bg-blue-50 text-blue-700",
  late: "bg-amber-50 text-amber-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function formatDuration(minutes: number | null, language: Language) {
  if (minutes == null) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (language === "ar") {
    if (hours === 0) return `${mins} \u062f\u0642\u064a\u0642\u0629`;
    const hourText =
      hours === 1 ? "\u0633\u0627\u0639\u0629" : hours === 2 ? "\u0633\u0627\u0639\u062a\u0627\u0646" : `${hours} \u0633\u0627\u0639\u0627\u062a`;
    return mins === 0 ? hourText : `${hourText} \u0648${mins} \u062f\u0642\u064a\u0642\u0629`;
  }

  const hourUnit = hours === 1 ? "hr" : "hrs";
  if (hours === 0) return `${mins} min`;
  return mins === 0 ? `${hours} ${hourUnit}` : `${hours} ${hourUnit} ${mins} min`;
}

function getScheduleLabel(language: Language) {
  return language === "ar"
    ? "8:30 \u0635\u0628\u0627\u062d\u064b\u0627 \u0625\u0644\u0649 6:00 \u0645\u0633\u0627\u0621\u064b"
    : "8:30 AM to 6:00 PM";
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

function getBeirutTime() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Beirut",
  }).format(new Date());
}

export function PublicAttendance({
  initialEmployees,
  initialError,
  initialDate,
  initialTime,
}: PublicAttendanceProps) {
  const [language, setLanguage] = useState<Language>("en");
  const [time, setTime] = useState(initialTime);
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStatus | null>(null);
  const [pin, setPin] = useState("");
  const [notice, setNotice] = useState(initialError ?? "");
  const [noticeType, setNoticeType] = useState<"success" | "error">(initialError ? "error" : "success");
  const [isPending, startTransition] = useTransition();
  const copy = text[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("attendance-language");
    if (savedLanguage === "en" || savedLanguage === "ar") {
      queueMicrotask(() => setLanguage(savedLanguage));
    }
    const id = window.setInterval(() => setTime(getBeirutTime()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function setSavedLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("attendance-language", nextLanguage);
  }

  const selectedSummary = useMemo(() => {
    if (!selectedEmployee) return "";
    if (selectedEmployee.checkOut) return `${copy.out}: ${formatDisplayTime(selectedEmployee.checkOut, language)}`;
    if (selectedEmployee.checkIn) return `${copy.in}: ${formatDisplayTime(selectedEmployee.checkIn, language)}`;
    return copy.noRecord as string;
  }, [copy.in, copy.noRecord, copy.out, language, selectedEmployee]);

  const refreshAttendance = useCallback(async () => {
    const response = await fetch("/api/attendance/status", { cache: "no-store" });
    const result = (await response.json()) as { employees?: EmployeeStatus[]; error?: string };

    if (!response.ok || !result.employees) {
      throw new Error(result.error ?? (copy.refreshError as string));
    }

    setEmployees(result.employees);
    setSelectedEmployee((current) =>
      current ? result.employees?.find((employee) => employee.id === current.id) ?? null : current,
    );
  }, [copy.refreshError]);

  useEffect(() => {
    queueMicrotask(() => {
      refreshAttendance().catch(() => {
        // The interval refresh will try again shortly.
      });
    });

    const id = window.setInterval(() => {
      refreshAttendance().catch(() => {
        // Keep the public screen quiet if a background refresh briefly fails.
      });
    }, 15_000);

    return () => window.clearInterval(id);
  }, [refreshAttendance]);

  useEffect(() => {
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("attendance-refresh") : null;

    if (channel) {
      channel.onmessage = () => {
        refreshAttendance().catch(() => {
          // The interval refresh will try again shortly.
        });
      };
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== "attendance-refresh") return;
      refreshAttendance().catch(() => {
        // The interval refresh will try again shortly.
      });
    }

    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshAttendance]);

  function submit(action: "check-in" | "check-out") {
    if (!selectedEmployee || pin.length !== 4 || isPending) return;

    setNotice("");
    startTransition(async () => {
      const response = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployee.id, pin, language }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      setNoticeType(response.ok ? "success" : "error");
      setNotice(result.message ?? result.error ?? (copy.unexpected as string));

      if (response.ok) {
        setPin("");
        await refreshAttendance();
      }
    });
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className={language === "ar" ? "text-right" : "text-left"}>
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">{copy.subtitle as string}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {copy.appName as string}
            </h1>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setSavedLanguage("en")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
                language === "en" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Languages className="size-4" />
              English
            </button>
            <button
              type="button"
              onClick={() => setSavedLanguage("ar")}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
                language === "ar" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Languages className="size-4" />
              العربية
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{copy.date}</p>
            <p className="mt-1 text-lg font-semibold">{initialDate}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
            <p className="text-xs font-medium text-emerald-700">{copy.now}</p>
            <p className="mt-1 text-lg font-semibold">{time}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-950">
            <p className="text-xs font-medium text-blue-700">{copy.schedule}</p>
            <p className="mt-1 text-lg font-semibold">{getScheduleLabel(language)}</p>
          </div>
        </div>
      </header>

      {notice ? (
        <div
          className={`mb-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-sm ${
            noticeType === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{notice}</p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={copy.employees as string}>
        {employees.map((employee) => (
          <button
            key={employee.id}
            type="button"
            onClick={() => {
              setSelectedEmployee(employee);
              setPin("");
              setNotice("");
            }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                {initials(employee.name)}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[employee.status]}`}>
                {copy.statuses[employee.status]}
              </span>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-950">{employee.name}</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <p>{copy.in as string}: {formatDisplayTime(employee.checkIn, language)}</p>
              <p>{copy.out as string}: {formatDisplayTime(employee.checkOut, language)}</p>
              {employee.lateMinutes > 0 ? (
                <p>{copy.lateLabel as string}: {formatDuration(employee.lateMinutes, language)}</p>
              ) : null}
              {employee.totalMinutes == null ? null : (
                <p>{copy.total as string}: {formatDuration(employee.totalMinutes, language)}</p>
              )}
              {employee.missingMinutes > 0 ? (
                <p>{copy.missingTime as string}: {formatDuration(employee.missingMinutes, language)}</p>
              ) : null}
              {employee.overtimeMinutes > 0 ? (
                <p>{copy.overtime as string}: {formatDuration(employee.overtimeMinutes, language)}</p>
              ) : null}
            </div>
          </button>
        ))}
      </section>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {copy.empty as string}
        </div>
      ) : null}

      {selectedEmployee ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="attendance-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <button type="button" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setSelectedEmployee(null)} aria-label={copy.close as string}>
                <X className="size-5" />
              </button>
              <div>
                <p className="text-sm text-slate-500">{copy.statuses[selectedEmployee.status]}</p>
                <h2 id="attendance-modal-title" className="mt-1 text-2xl font-semibold">
                  {selectedEmployee.name}
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  {selectedSummary}
                  <Clock3 className="size-4" />
                </p>
              </div>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-700">{copy.pin as string}</span>
              <input
                className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-2xl tracking-[0.55em] outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={copy.pin as string}
              />
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button className="h-13 bg-emerald-600 hover:bg-emerald-700" disabled={isPending || pin.length !== 4} onClick={() => submit("check-in")}>
                <LogIn className="size-5" />
                {isPending ? (copy.saving as string) : (copy.checkIn as string)}
              </Button>
              <Button className="h-13 bg-red-600 hover:bg-red-700" disabled={isPending || pin.length !== 4} onClick={() => submit("check-out")}>
                <LogOut className="size-5" />
                {isPending ? (copy.saving as string) : (copy.checkOut as string)}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
