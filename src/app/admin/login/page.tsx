import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui/Card";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-700">لوحة الإدارة</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-600">
            أدخل كلمة المرور لإدارة الحضور والموظفين.
          </p>
        </div>
        <LoginForm />
        <Link className="mt-5 block text-center text-sm text-slate-500 hover:text-slate-950" href="/">
          العودة إلى صفحة الحضور
        </Link>
      </Card>
    </main>
  );
}
