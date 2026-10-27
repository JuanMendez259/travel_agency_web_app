import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import type { BookingStatus, PaymentStatus, PayoutStatus } from "@/shared/api/types";

type Tone = "confirmed" | "pending" | "cancelled" | "mint" | "neutral" | "emerald";

const tones: Record<Tone, string> = {
  confirmed: "bg-confirmed text-on-secondary-container",
  pending: "bg-pending text-[#78350F]",
  cancelled: "bg-error-container text-on-error-container",
  mint: "bg-mint text-primary-container",
  neutral: "bg-surface-container text-on-surface-variant",
  emerald: "bg-secondary text-white",
};

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  if (status === "Confirmed") {
    return <StatusPill tone="confirmed">Confirmado</StatusPill>;
  }
  if (status === "Cancelled") {
    return <StatusPill tone="cancelled">Cancelado</StatusPill>;
  }
  return <StatusPill tone="pending">Pago pendiente</StatusPill>;
}

export function bookingStatusLabel(status: BookingStatus) {
  if (status === "Confirmed") return "Confirmado";
  if (status === "Cancelled") return "Cancelado";
  return "Pendiente";
}

const paymentLabels: Record<PaymentStatus, string> = {
  Completed: "Completado",
  Pending: "Pendiente",
  Refunded: "Reembolsado",
  Failed: "Fallido",
};

export function paymentStatusLabel(status: PaymentStatus) {
  return paymentLabels[status] ?? status;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone: Tone =
    status === "Completed"
      ? "confirmed"
      : status === "Pending"
        ? "pending"
        : status === "Refunded"
          ? "neutral"
          : "cancelled";
  return <StatusPill tone={tone}>{paymentLabels[status] ?? status}</StatusPill>;
}

const payoutLabels: Record<PayoutStatus, string> = {
  Pending: "Pendiente",
  Paid: "Pagado",
  Rejected: "Rechazado",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const tone: Tone =
    status === "Paid" ? "confirmed" : status === "Rejected" ? "cancelled" : "pending";
  return <StatusPill tone={tone}>{payoutLabels[status] ?? status}</StatusPill>;
}
