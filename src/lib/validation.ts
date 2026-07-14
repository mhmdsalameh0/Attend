import { z } from "zod";

export const pinSchema = z.string().regex(/^\d{4}$/, "يجب أن يتكون الرقم السري من 4 أرقام.");

export const attendanceActionSchema = z.object({
  employeeId: z.string().min(1, "اختر الموظف."),
  pin: pinSchema,
});

export const loginSchema = z.object({
  password: z.string().min(1, "كلمة المرور مطلوبة."),
});

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "اسم الموظف مطلوب."),
  pin: pinSchema.optional(),
  active: z.boolean().optional(),
});

export const attendanceEditSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ العمل غير صالح.").optional(),
  checkIn: z.string().datetime("وقت الدخول غير صالح.").optional(),
  checkOut: z.string().datetime("وقت الخروج غير صالح.").nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
