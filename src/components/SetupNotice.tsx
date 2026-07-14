import { Database } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function SetupNotice() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <Database className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Database setup needed</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create `.env`, set `DATABASE_URL`, then run `npm run prisma:migrate`
            and `npm run db:seed`.
          </p>
        </div>
      </div>
    </Card>
  );
}
