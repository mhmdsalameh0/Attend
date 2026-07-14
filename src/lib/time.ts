import { differenceInMinutes, set } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const BUSINESS_TIMEZONE = "Asia/Beirut";
export const COMPANY_START_HOUR = 8;
export const COMPANY_START_MINUTE = 30;

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
  return `${time} ${hour < 12 ? "صباحًا" : "مساءً"}`;
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

export function calculateLateMinutes(checkIn: Date) {
  return Math.max(0, differenceInMinutes(checkIn, getCompanyStart(checkIn)));
}

export function calculateTotalMinutes(checkIn: Date, checkOut: Date) {
  return Math.max(0, differenceInMinutes(checkOut, checkIn));
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} دقيقة`;
  }

  if (remainingMinutes === 0) {
    return `${hours} ساعة`;
  }

  return `${hours} ساعة و ${remainingMinutes} دقيقة`;
}
