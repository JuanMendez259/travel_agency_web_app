import type { Trip } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/dates";

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(value: string): string {
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

export function buildTripIcs(trip: Trip): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Proxima Parada Tours//Vuelos y escapadas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:trip-${trip.id}@proximaparadatours.mx`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(trip.startDate)}`,
    `DTEND:${toIcsDate(trip.endDate)}`,
    `SUMMARY:${escapeIcs(trip.title)}`,
    `LOCATION:${escapeIcs(trip.destination)}`,
    `DESCRIPTION:${escapeIcs(
      `${trip.description ? trip.description.slice(0, 600) : "Viaje con Proxima Parada Tours"}\nSalida: ${formatDateTime(trip.startDate)}`,
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadTripIcs(trip: Trip): void {
  const blob = new Blob([buildTripIcs(trip)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `proxima-parada-${trip.id}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarHref(trip: Trip): string {
  const start = new Date(trip.startDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(trip.endDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: trip.title,
    dates: `${start}/${end}`,
    details: `Viaje reservado con Proxima Parada Tours. Salida: ${formatDateTime(trip.startDate)}`,
    location: trip.destination,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
