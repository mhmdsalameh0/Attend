"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Languages, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Language = "en" | "ar";

const copy = {
  en: {
    eyebrow: "Admin dashboard",
    title: "Sign in",
    description: "Enter the admin password to manage attendance and employees.",
    password: "Admin password",
    submit: "Sign in",
    loading: "Signing in...",
    error: "Unable to sign in.",
    back: "Back to attendance",
  },
  ar: {
    eyebrow: "لوحة الإدارة",
    title: "تسجيل الدخول",
    description: "أدخل كلمة المرور لإدارة الحضور والموظفين.",
    password: "كلمة مرور المدير",
    submit: "تسجيل الدخول",
    loading: "جارٍ تسجيل الدخول...",
    error: "تعذّر تسجيل الدخول.",
    back: "العودة إلى صفحة الحضور",
  },
};

export function LoginForm() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("en");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? t.error);
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className={language === "ar" ? "text-right" : "text-left"}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{t.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{t.description}</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setSavedLanguage("en")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${language === "en" ? "bg-slate-950 text-white" : "text-slate-600"}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setSavedLanguage("ar")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${language === "ar" ? "bg-slate-950 text-white" : "text-slate-600"}`}
          >
            <Languages className="mr-1 inline size-3" />
            العربية
          </button>
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t.password}</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-base outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button className="w-full" disabled={isPending}>
          <Lock className="size-4" />
          {isPending ? t.loading : t.submit}
        </Button>
      </form>

      <Link className="mt-5 block text-center text-sm text-slate-500 hover:text-slate-950" href="/">
        {t.back}
      </Link>
    </div>
  );
}
