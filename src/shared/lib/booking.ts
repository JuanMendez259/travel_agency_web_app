import type { Booking, Payment } from "@/shared/api/types";
import { addMoney, subtractMoney, toDecimal } from "@/shared/lib/money";
import { toAgencyTime } from "@/shared/lib/dates";

export const PENALTY_RATE = 0.3;

export function completedPayments(booking: Booking | null | undefined): Payment[] {
  return (booking?.payments ?? []).filter((payment) => payment.status === "Completed");
}

export function paidAmount(booking: Booking | null | undefined): string {
  return addMoney(...completedPayments(booking).map((payment) => payment.amount)).toFixed(2);
}

export function pendingAmount(booking: Booking | null | undefined): string {
  if (!booking) return "0.00";
  return subtractMoney(booking.totalAmount, paidAmount(booking)).toFixed(2);
}

export function isSettled(booking: Booking | null | undefined): boolean {
  return toDecimal(pendingAmount(booking)).lte(0);
}

export function isWithinPolicy(
  startDate: string | Date,
  today: Date,
  limit: number | null | undefined,
): boolean {
  if (limit === null || limit === undefined) return true;
  const start = toAgencyTime(startDate);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((startDay.getTime() - todayDay.getTime()) / 86_400_000);
  return days >= limit;
}

export function penaltyFor(paid: string | number, within: boolean): string {
  if (within) return "0.00";
  return toDecimal(paid).times(PENALTY_RATE).toDecimalPlaces(2).toFixed(2);
}

export function refundFor(paid: string | number, within: boolean): string {
  const penalty = toDecimal(penaltyFor(paid, within));
  return toDecimal(paid).minus(penalty).toFixed(2);
}

export function refundedPaymentsTotal(booking: Booking | null | undefined): string {
  return addMoney(
    ...(booking?.payments ?? [])
      .filter((payment) => payment.status === "Refunded")
      .map((payment) =>
        payment.refundedAmount != null && toDecimal(payment.refundedAmount).gt(0)
          ? payment.refundedAmount
          : payment.amount,
      ),
  ).toFixed(2);
}
