import { PublicAttendance } from "@/components/public/PublicAttendance";
import { SetupNotice } from "@/components/SetupNotice";
import { getPublicAttendanceSnapshot } from "@/lib/attendance";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Home() {
  let employees: Awaited<ReturnType<typeof getPublicAttendanceSnapshot>> = [];
  let error = "";
  const now = new Date();
  const initialDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Beirut",
  }).format(now);
  const initialTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Beirut",
  }).format(now);

  try {
    employees = await getPublicAttendanceSnapshot();
  } catch {
    error = "Database connection failed.";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {error ? (
          <SetupNotice />
        ) : (
          <PublicAttendance
            initialEmployees={employees}
            initialDate={initialDate}
            initialTime={initialTime}
          />
        )}
      </div>
    </main>
  );
}
