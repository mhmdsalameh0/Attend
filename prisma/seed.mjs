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
  { name: "Employee 1", pin: "1111" },
  { name: "Employee 2", pin: "2222" },
  { name: "Employee 3", pin: "3333" },
  { name: "Employee 4", pin: "4444" },
];

for (const employee of employees) {
  const existing = await prisma.employee.findFirst({
    where: { name: employee.name },
  });
  const pinHash = await bcrypt.hash(employee.pin, 12);

  if (existing) {
    await prisma.employee.update({
      where: { id: existing.id },
      data: {
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

console.log("Seeded 4 placeholder employees.");
