import { describe, expect, it } from "vitest";
import type { Booking } from "@/shared/api/types";
import {
  isSettled,
  isWithinPolicy,
  paidAmount,
  penaltyFor,
  pendingAmount,
  refundFor,
} from "@/shared/lib/booking";

const baseBooking = {
  id: 1,
  userId: 1,
  tripId: 1,
  bookingDate: "2026-10-01T12:00:00",
  status: "Pending",
  numberOfSeats: 2,
  seatNumber: 10,
  totalAmount: "1000.00",
  discountCode: null,
  discountAmount: "0.00",
  specialNeedsNote: null,
  checkedIn: false,
  checkedInAt: null,
  qrToken: null,
  cancelledAt: null,
  cancelledByUserId: null,
  payments: [
    { id: 1, bookingId: 1, amount: "400.00", paymentDate: "2026-10-01T12:00:00", method: "Cash", status: "Completed", transactionReference: null },
    { id: 2, bookingId: 1, amount: "100.00", paymentDate: "2026-10-01T12:00:00", method: "Cash", status: "Pending", transactionReference: null },
  ],
} as unknown as Booking;

describe("política de reembolso", () => {
  it("aplica 30% de multa fuera de política", () => {
    expect(penaltyFor("400.00", false)).toBe("120.00");
    expect(refundFor("400.00", false)).toBe("280.00");
  });

  it("reembolsa todo dentro de política", () => {
    expect(penaltyFor("400.00", true)).toBe("0.00");
    expect(refundFor("400.00", true)).toBe("400.00");
  });

  it("considera siempre dentro de política si el límite es nulo", () => {
    expect(isWithinPolicy("2026-11-01T08:00:00", new Date("2026-10-31T12:00:00"), null)).toBe(true);
  });

  it("compara días completos contra el límite", () => {
    expect(isWithinPolicy("2026-11-05T08:00:00", new Date("2026-11-01T23:00:00"), 3)).toBe(true);
    expect(isWithinPolicy("2026-11-03T08:00:00", new Date("2026-11-01T23:00:00"), 3)).toBe(false);
  });
});

describe("saldos de reserva", () => {
  it("suma solo pagos completados", () => {
    expect(paidAmount(baseBooking)).toBe("400.00");
    expect(pendingAmount(baseBooking)).toBe("600.00");
    expect(isSettled(baseBooking)).toBe(false);
  });

  it("marca liquidada cuando los pagos cubren el total", () => {
    const settled = { ...baseBooking, totalAmount: "400.00" } as Booking;
    expect(isSettled(settled)).toBe(true);
    expect(pendingAmount(settled)).toBe("0.00");
  });
});
