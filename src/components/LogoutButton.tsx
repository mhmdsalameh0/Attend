"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [language, setLanguage] = useState<"en" | "ar">("en");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("attendance-language");
    if (savedLanguage === "en" || savedLanguage === "ar") {
      queueMicrotask(() => setLanguage(savedLanguage));
    }
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button onClick={logout} variant="ghost">
      <LogOut className="size-4" />
      {language === "ar" ? "تسجيل الخروج" : "Logout"}
    </Button>
  );
}
