import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "attendance_admin_session";
let hasLoggedAdminPasswordState = false;

function getSecret() {
  return process.env.SESSION_SECRET || "development-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function createSessionValue() {
  const payload = JSON.stringify({
    role: "admin",
    createdAt: Date.now(),
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function isValidSessionValue(value?: string) {
  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload);

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const submittedPassword = password.trim();

  if (!hasLoggedAdminPasswordState) {
    console.info("Admin login configuration", {
      hasAdminPassword: Boolean(configuredPassword),
    });
    hasLoggedAdminPasswordState = true;
  }

  if (!configuredPassword) {
    return false;
  }

  if (
    configuredPassword.startsWith("$2a$") ||
    configuredPassword.startsWith("$2b$") ||
    configuredPassword.startsWith("$2y$")
  ) {
    return bcrypt.compare(submittedPassword, configuredPassword);
  }

  return submittedPassword === configuredPassword;
}

export async function createAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return isValidSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
}
