import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { normalizePostgresUrl } from "../scripts/database-url.mjs";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/employee_attendance?schema=public";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: normalizePostgresUrl(connectionString) }),
});

const employees = [
  { oldName: "Employee 1", name: "Mohammad Ibrahim Kassem", pin: "1111" },
  { oldName: "Employee 2", name: "Majed Hassan Khaled", pin: "2222" },
  { oldName: "Employee 3", name: "Abed Mohammad Asfour", pin: "3333" },
  { oldName: "Employee 4", name: "Mostafa Asfour", pin: "4444" },
];

for (const employee of employees) {
  const existing = await prisma.employee.findFirst({
    where: {
      OR: [{ name: employee.name }, { name: employee.oldName }],
    },
  });
  const pinHash = await bcrypt.hash(employee.pin, 12);

  if (existing) {
    await prisma.employee.update({
      where: { id: existing.id },
      data: {
        name: employee.name,
        pinHash,
        active: true,
      },
    });
  } else {
    await prisma.employee.create({
      data: {
        name: employee.name,
        pinHash,
        active: true,
      },
    });
  }
}

await prisma.$disconnect();

console.log("Seeded 4 employees.");
