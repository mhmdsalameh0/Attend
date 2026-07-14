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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <LoginForm />
      </Card>
    </main>
  );
}
