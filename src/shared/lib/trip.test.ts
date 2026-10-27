import { describe, expect, it } from "vitest";
import type { Trip, TripOption } from "@/shared/api/types";
import { bookableCapacity, displayPrice } from "@/shared/lib/trip";

const trip = {
  id: 1,
  title: "Test",
  destination: "Puebla",
  description: null,
  startDate: "2026-11-01T08:00:00",
  endDate: "2026-11-01T18:00:00",
  price: "100.00",
  childPrice: null,
  capacity: 50,
  availableSeats: 50,
  transportType: "Camion",
  imageUrl: null,
  isActive: true,
  checkInOpen: false,
  departureCompleted: false,
  finalized: false,
  cancellationDaysLimit: 3,
  bookingDeadline: null,
  category: null,
  hasOptions: true,
  includesHotel: false,
  hotelName: null,
  hotelCapacity: null,
  hasTwoFloors: false,
  floor1Capacity: null,
  floor2Capacity: null,
  options: [],
} as unknown as Trip;

describe("cupo y precios de viaje", () => {
  it("usa el mínimo entre transporte y hotel", () => {
    expect(bookableCapacity({ ...trip, includesHotel: true, hotelCapacity: 20 })).toBe(20);
    expect(bookableCapacity({ ...trip, includesHotel: true, hotelCapacity: 60 })).toBe(50);
    expect(bookableCapacity({ ...trip, includesHotel: false, hotelCapacity: 20 })).toBe(50);
  });

  it("muestra el menor precio de las opciones activas", () => {
    const options = [
      { id: 1, tripId: 1, name: "General", description: null, priceAdult: "150.00", priceChild: null, capacity: 50, availableSeats: 50, benefits: null, isActive: true, order: 1, isBase: true },
      { id: 2, tripId: 1, name: "VIP", description: null, priceAdult: "250.00", priceChild: null, capacity: 50, availableSeats: 50, benefits: null, isActive: true, order: 2, isBase: false },
    ] as unknown as TripOption[];
    expect(displayPrice({ ...trip, options })).toBe("150.00");
    expect(displayPrice({ ...trip, options: [{ ...options[1], isActive: false }] })).toBe("100.00");
  });
});
