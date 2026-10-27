import { format, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const AGENCY_TIMEZONE = "America/Mexico_City";

export function parseApiDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const hasZone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  return parseISO(hasZone ? value : `${value}Z`);
}

export function toAgencyTime(value: string | Date): Date {
  return toZonedTime(parseApiDate(value), AGENCY_TIMEZONE);
}

export function formatTripCardDate(value: string | Date): string {
  return format(toAgencyTime(value), "dd MMM, HH:mm", { locale: es });
}

export function formatTripDetailDate(value: string | Date): string {
  return format(toAgencyTime(value), "EEE d MMM • HH:mm", { locale: es });
}

export function formatBookingDate(value: string | Date): string {
  return format(toAgencyTime(value), "EEEE dd/MM/yyyy HH:mm", { locale: es });
}

export function formatShortDate(value: string | Date): string {
  return format(toAgencyTime(value), "dd MMM yyyy", { locale: es });
}

export function formatDayMonth(value: string | Date): string {
  return format(toAgencyTime(value), "dd MMM", { locale: es });
}

export function formatDateLong(value: string | Date): string {
  return format(toAgencyTime(value), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatTime(value: string | Date): string {
  return format(toAgencyTime(value), "HH:mm", { locale: es });
}

export function formatDateTime(value: string | Date): string {
  return format(toAgencyTime(value), "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatNoticeDate(value: string | Date): string {
  const local = toAgencyTime(value);
  if (isToday(local)) return format(local, "HH:mm");
  return format(local, "dd/MM/yyyy HH:mm");
}

export function noticeDayKey(value: string | Date): string {
  return format(toAgencyTime(value), "yyyy-MM-dd");
}

export function noticeDayLabel(value: string | Date): string {
  const local = toAgencyTime(value);
  if (isToday(local)) return "Hoy";
  return format(local, "EEEE d 'de' MMMM", { locale: es });
}

export function todayInAgency(): Date {
  const now = toZonedTime(new Date(), AGENCY_TIMEZONE);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isDateInPast(value: string | Date): boolean {
  return toAgencyTime(value).getTime() < todayInAgency().getTime();
}

export function daysBetweenAgency(start: string | Date, end: string | Date): number {
  const a = new Date(toAgencyTime(start).getFullYear(), toAgencyTime(start).getMonth(), toAgencyTime(start).getDate());
  const b = new Date(toAgencyTime(end).getFullYear(), toAgencyTime(end).getMonth(), toAgencyTime(end).getDate());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function toDateTimeLocalValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  return format(toAgencyTime(value), "yyyy-MM-dd'T'HH:mm");
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return "";
  return fromZonedTime(value, AGENCY_TIMEZONE).toISOString();
}

export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  return format(toAgencyTime(value), "yyyy-MM-dd");
}

export function fromDateInputValue(value: string): string {
  if (!value) return "";
  return fromZonedTime(`${value}T00:00:00`, AGENCY_TIMEZONE).toISOString();
}
