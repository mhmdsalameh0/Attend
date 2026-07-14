# Employee Attendance

Next.js employee attendance app for four employees, built with App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, bcrypt PIN hashing, and Gmail notifications.

## Requirements

- Node.js 20.9 or newer
- PostgreSQL, or Docker Desktop for the included local PostgreSQL container
- npm

## Environment

Create `.env` from `.env.example` and configure:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/employee_attendance?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/employee_attendance?schema=public"
ADMIN_PASSWORD="change-this-admin-password"
SESSION_SECRET="replace-with-a-long-random-secret"
GMAIL_USER="your-gmail-address@gmail.com"
GMAIL_APP_PASSWORD="your-gmail-app-password"
NOTIFICATION_EMAIL="manager@example.com"
NEXT_PUBLIC_APP_NAME="Employee Attendance"
```

Never commit `.env`.

## Database Setup

Start PostgreSQL yourself, or use Docker Desktop:

```bash
docker compose up -d
```

Use the pooled Neon connection string for `DATABASE_URL` and the direct Neon connection string for `DIRECT_URL`.

Then run:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

Seeded employees:

- Employee 1 - PIN `1111`
- Employee 2 - PIN `2222`
- Employee 3 - PIN `3333`
- Employee 4 - PIN `4444`

PINs are hashed with bcrypt before storage.

## Common Database Error

If you see `ECONNREFUSED` or a Prisma error on `employee.findMany`, PostgreSQL is not running on `localhost:5432` or `DATABASE_URL` points to the wrong place.

Fix it by starting PostgreSQL first, then run:

```bash
npm run prisma:migrate
npm run db:seed
npm run dev
```

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

Admin login is available at `/admin/login`.

## Checks

```bash
npm run lint
npm run build
```
