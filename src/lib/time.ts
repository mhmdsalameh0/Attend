import { differenceInMinutes, set } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const BUSINESS_TIMEZONE = "Asia/Beirut";
export const COMPANY_START_HOUR = 8;
export const COMPANY_START_MINUTE = 30;
export const COMPANY_END_HOUR = 18;
export const COMPANY_END_MINUTE = 0;

export type SupportedLanguage = "en" | "ar";

export function getBusinessDate(date = new Date()) {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

export function formatBusinessDateTime(date: Date) {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "MMMM d, yyyy h:mm a");
}

export function formatBusinessTime(date: Date) {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "h:mm a");
}

export function formatArabicBusinessTime(date: Date) {
  const hour = Number(formatInTimeZone(date, BUSINESS_TIMEZONE, "H"));
  const time = formatInTimeZone(date, BUSINESS_TIMEZONE, "h:mm");
  return `${time} ${hour < 12 ? "\u0635\u0628\u0627\u062d\u064b\u0627" : "\u0645\u0633\u0627\u0621\u064b"}`;
}

export function formatArabicBusinessDate(date = new Date()) {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy/MM/dd");
}

export function getBeirutDate(date = new Date()) {
  return toZonedTime(date, BUSINESS_TIMEZONE);
}

export function getCompanyStart(date = new Date()) {
  const beirutDate = getBeirutDate(date);
  const startInBeirut = set(beirutDate, {
    hours: COMPANY_START_HOUR,
    minutes: COMPANY_START_MINUTE,
    seconds: 0,
    milliseconds: 0,
  });

  return fromZonedTime(startInBeirut, BUSINESS_TIMEZONE);
}

export function getCompanyEnd(date = new Date()) {
  const beirutDate = getBeirutDate(date);
  const endInBeirut = set(beirutDate, {
    hours: COMPANY_END_HOUR,
    minutes: COMPANY_END_MINUTE,
    seconds: 0,
    milliseconds: 0,
  });

  return fromZonedTime(endInBeirut, BUSINESS_TIMEZONE);
}

export function calculateLateMinutes(checkIn: Date) {
  return Math.max(0, differenceInMinutes(checkIn, getCompanyStart(checkIn)));
}

export function calculateTotalMinutes(checkIn: Date, checkOut: Date) {
  return Math.max(0, differenceInMinutes(checkOut, checkIn));
}

export function calculateMissingMinutes(checkOut: Date) {
  return Math.max(0, differenceInMinutes(getCompanyEnd(checkOut), checkOut));
}

export function calculateOvertimeMinutes(checkOut: Date) {
  return Math.max(0, differenceInMinutes(checkOut, getCompanyEnd(checkOut)));
}

export function formatDuration(minutes: number, language: SupportedLanguage = "ar") {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (language === "en") {
    const hourUnit = hours === 1 ? "hr" : "hrs";
    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours} ${hourUnit}`;
    return `${hours} ${hourUnit} ${remainingMinutes} min`;
  }

  if (hours === 0) {
    return `${remainingMinutes} \u062f\u0642\u064a\u0642\u0629`;
  }

  if (remainingMinutes === 0) {
    if (hours === 1) return "\u0633\u0627\u0639\u0629";
    if (hours === 2) return "\u0633\u0627\u0639\u062a\u0627\u0646";
    return `${hours} \u0633\u0627\u0639\u0627\u062a`;
  }

  const hourText =
    hours === 1
      ? "\u0633\u0627\u0639\u0629"
      : hours === 2
        ? "\u0633\u0627\u0639\u062a\u0627\u0646"
        : `${hours} \u0633\u0627\u0639\u0627\u062a`;
  return `${hourText} \u0648${remainingMinutes} \u062f\u0642\u064a\u0642\u0629`;
}

export function getScheduleLabel(language: SupportedLanguage) {
  return language === "ar"
    ? "8:30 \u0635\u0628\u0627\u062d\u064b\u0627 \u0625\u0644\u0649 6:00 \u0645\u0633\u0627\u0621\u064b"
    : "8:30 AM to 6:00 PM";
}
