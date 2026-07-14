"use client";

import { useEffect, useState } from "react";

function getTime() {
  return new Intl.DateTimeFormat("ar-LB", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Beirut",
  }).format(new Date());
}

type LiveBeirutClockProps = {
  initialTime: string;
};

export function LiveBeirutClock({ initialTime }: LiveBeirutClockProps) {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    const id = window.setInterval(() => setTime(getTime()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
      <p className="text-xs font-medium text-emerald-700">الوقت الآن</p>
      <p className="mt-1 text-lg font-semibold">{time}</p>
    </div>
  );
}
