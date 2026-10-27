import type { BookingOptionInput } from "@/shared/api/types";

export type CheckoutDraft = {
  tripId: number;
  useOptions: boolean;
  options: BookingOptionInput[];
  adults: number;
  children: number;
  totalSeats: number;
  specialNeedsNote: string | null;
};

function key(tripId: number) {
  return `ppt.checkout.${tripId}`;
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  sessionStorage.setItem(key(draft.tripId), JSON.stringify(draft));
}

export function readCheckoutDraft(tripId: number): CheckoutDraft | null {
  const raw = sessionStorage.getItem(key(tripId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (parsed.tripId !== tripId) return null;
    return parsed;
  } catch {
    sessionStorage.removeItem(key(tripId));
    return null;
  }
}

export function clearCheckoutDraft(tripId: number): void {
  sessionStorage.removeItem(key(tripId));
}
