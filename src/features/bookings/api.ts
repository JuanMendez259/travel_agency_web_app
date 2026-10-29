import { apiRequest } from "@/shared/api/client";
import type {
  Booking,
  CancelBookingResult,
  CancelTicketResult,
  CheckinTokenResult,
  CreateBookingRequest,
  CreatePassengersRequest,
  Payment,
  PaymentMethod,
} from "@/shared/api/types";

export function listUserBookings(userId: number, status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return apiRequest<Booking[]>(`/api/users/${userId}/bookings${query}`);
}

export function listAllBookings(status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return apiRequest<Booking[]>(`/api/bookings${query}`);
}

export function listTripBookings(tripId: number, status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  return apiRequest<Booking[]>(`/api/trips/${tripId}/bookings${query}`);
}

export function getBooking(bookingId: number) {
  return apiRequest<Booking>(`/api/bookings/${bookingId}`);
}

export function createBooking(payload: CreateBookingRequest) {
  return apiRequest<Booking>("/api/bookings", { method: "POST", body: payload });
}

export function addPassengers(bookingId: number, payload: CreatePassengersRequest) {
  return apiRequest<Booking>(`/api/bookings/${bookingId}/passengers`, {
    method: "POST",
    body: payload,
  });
}

export function payWithWallet(bookingId: number, amount: number) {
  return apiRequest<Booking>(`/api/bookings/${bookingId}/pay-with-wallet`, {
    method: "POST",
    body: { amount },
  });
}

export function registerPayment(
  bookingId: number,
  payload: { amount: number; method: PaymentMethod; transactionReference?: string | null },
) {
  return apiRequest<Payment>(`/api/bookings/${bookingId}/payments`, {
    method: "POST",
    body: {
      amount: payload.amount,
      method: payload.method,
      status: "Completed",
      transactionReference: payload.transactionReference ?? null,
      paymentDate: new Date().toISOString(),
    },
  });
}

export function updateBookingStatus(bookingId: number, status: string) {
  return apiRequest<Booking>(`/api/bookings/${bookingId}/status`, {
    method: "PUT",
    body: { status },
  });
}

export function cancelBooking(bookingId: number, reason: string) {
  return apiRequest<CancelBookingResult>(`/api/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

export function cancelTicket(
  bookingId: number,
  payload: { passengerId: number; bookingItemId?: number | null; reason: string },
) {
  return apiRequest<CancelTicketResult>(`/api/bookings/${bookingId}/cancel-ticket`, {
    method: "POST",
    body: payload,
  });
}

export function cancelBookingItem(
  bookingId: number,
  payload: { bookingItemId: number; reason: string },
) {
  return apiRequest<CancelTicketResult>(`/api/bookings/${bookingId}/cancel-item`, {
    method: "POST",
    body: payload,
  });
}

export function checkinBooking(bookingId: number, checkedIn: boolean) {
  return apiRequest<Booking>(`/api/bookings/${bookingId}/checkin`, {
    method: "PUT",
    body: { checkedIn },
  });
}

export function checkinPassenger(passengerId: number, checkedIn: boolean) {
  return apiRequest<unknown>(`/api/passengers/${passengerId}/checkin`, {
    method: "PUT",
    body: { checkedIn },
  });
}

export function checkinByToken(qrToken: string, tripId: number) {
  return apiRequest<CheckinTokenResult>("/api/checkin/token", {
    method: "PUT",
    body: { qrToken, tripId },
  });
}
