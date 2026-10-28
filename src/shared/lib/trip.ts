import type { TransportType, Trip, TripOption } from "@/shared/api/types";
import { toDecimal } from "@/shared/lib/money";
import { isDateInPast } from "@/shared/lib/dates";

export function bookableCapacity(trip: Trip): number {
  if (trip.bookableCapacity != null) return trip.bookableCapacity;
  if (trip.includesHotel && trip.hotelCapacity != null) {
    return Math.min(trip.capacity, Math.max(0, trip.hotelCapacity));
  }
  return trip.capacity;
}

export function activeOptions(trip: Trip | null | undefined): TripOption[] {
  return (trip?.options ?? [])
    .filter((option) => option.isActive)
    .sort((a, b) => a.order - b.order || a.id - b.id);
}

export function displayPrice(trip: Trip): string | number {
  if (trip.fromPrice != null) return trip.fromPrice;
  const options = activeOptions(trip);
  if (trip.hasOptions && options.length) {
    return options
      .reduce((min, option) => {
        const price = toDecimal(option.priceAdult);
        return price.lt(min) ? price : min;
      }, toDecimal(options[0].priceAdult))
      .toFixed(2);
  }
  return trip.price;
}

export function transportLabel(type: TransportType): string {
  return type === "Camioneta" ? "Camioneta Van VIP" : "Autobús Panorámico";
}

export function transportShortLabel(type: TransportType): string {
  return type === "Camioneta" ? "Van VIP" : "Autobús";
}

export function bookingDeadline(trip: Trip): string | null {
  return trip.bookingDeadline ?? trip.startDate;
}

export function isBookingClosed(trip: Trip): boolean {
  const deadline = bookingDeadline(trip);
  return deadline ? isDateInPast(deadline) : false;
}

export function isCancellationAvailable(trip: Trip | null | undefined): boolean {
  if (!trip) return false;
  return (
    !trip.departureCompleted && !trip.finalized && !isDateInPast(trip.startDate)
  );
}

export function isTripCancelled(
  trip: Pick<Trip, "cancelledAt" | "isCancelled">,
): boolean {
  return Boolean(trip.cancelledAt || trip.isCancelled);
}

export function tripStatusLabel(trip: Trip): string {
  if (trip.departureCompleted) return "Salida realizada";
  if (trip.finalized) return "Finalizado";
  if (!trip.isActive) return "Pausado";
  if (trip.checkInOpen) return "Check-in abierto";
  return "Reservando";
}

export function soldSeats(trip: Trip): number {
  const bookings = trip.bookings ?? [];
  if (bookings.length) {
    return bookings
      .filter((booking) => booking.status !== "Cancelled")
      .reduce((sum, booking) => sum + booking.numberOfSeats, 0);
  }
  return Math.max(0, bookableCapacity(trip) - trip.availableSeats);
}

export function optionLabel(option: TripOption): string {
  return option.name || "General";
}

export function optionChildPrice(option: TripOption): string | number {
  return option.priceChild ?? option.priceAdult;
}
