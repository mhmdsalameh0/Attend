"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

type EmployeeOption = {
  id: string;
  name: string;
};

type AttendanceFormProps = {
  employees: EmployeeOption[];
};

type AttendanceAction = "check-in" | "check-out";

export function AttendanceForm({ employees }: AttendanceFormProps) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(action: AttendanceAction) {
    setMessage("");
    setIsError(false);

    startTransition(async () => {
      const response = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId, pin }),
      });

      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };

      setIsError(!response.ok);
      setMessage(result.message ?? result.error ?? "حدث خطأ غير متوقع.");

      if (response.ok) {
        setPin("");
      }
    });
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">الموظف</span>
        <select
          className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          disabled={employees.length === 0}
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">الرقم السري</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-center text-lg tracking-[0.4em] outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="0000"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button disabled={isPending || !employeeId || pin.length !== 4} onClick={() => submit("check-in")}>
          <LogIn className="size-4" />
          دخول
        </Button>
        <Button
          disabled={isPending || !employeeId || pin.length !== 4}
          onClick={() => submit("check-out")}
          variant="secondary"
        >
          <LogOut className="size-4" />
          خروج
        </Button>
      </div>

      {message ? (
        <div
          className={`flex items-start gap-2 rounded-md px-3 py-3 text-sm ${
            isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{message}</p>
        </div>
      ) : null}
    </div>
  );
}
