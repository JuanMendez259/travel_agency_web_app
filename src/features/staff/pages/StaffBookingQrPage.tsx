import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, QrCode as QrIcon, ScanLine, Ticket, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  checkinBooking,
  checkinPassenger,
  getBooking,
} from "@/features/bookings/api";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { QrCode } from "@/shared/components/ui/QrCode";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime } from "@/shared/lib/dates";
import { formatMxn } from "@/shared/lib/money";

export function StaffBookingQrPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selection, setSelection] = useState("holder");

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  const booking = bookingQuery.data;
  useDocumentTitle("QR de abordaje");

  const mutation = useMutation({
    mutationFn: async (checkedIn: boolean) => {
      if (!booking) return;
      if (selection === "holder") return checkinBooking(booking.id, checkedIn);
      return checkinPassenger(Number(selection), checkedIn);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
      showToast("Check-in actualizado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  if (!Number.isFinite(bookingId)) {
    return <EmptyState title="Reserva no encontrada" description="El enlace no es válido." />;
  }
  if (bookingQuery.isLoading) return <PageLoader label="Cargando código QR…" />;
  if (bookingQuery.isError || !booking) {
    return (
      <ErrorState
        message={errorMessage(bookingQuery.error) || "No encontramos esta reserva."}
        onRetry={() => void bookingQuery.refetch()}
      />
    );
  }

  const cancelled = booking.status === "Cancelled";
  const departureDone = Boolean(booking.trip?.departureCompleted);
  const passengers = booking.passengers ?? [];
  const selectedPassenger = passengers.find((passenger) => String(passenger.id) === selection);
  const isHolder = selection === "holder";
  const qrToken = isHolder ? booking.qrToken : selectedPassenger?.qrToken;
  const checkedIn = isHolder ? booking.checkedIn : Boolean(selectedPassenger?.checkedIn);
  const checkedInAt = isHolder ? booking.checkedInAt : selectedPassenger?.checkedInAt;
  const name = isHolder ? booking.user?.name ?? "Titular" : selectedPassenger?.name ?? "Acompañante";
  const seatNumber = isHolder ? booking.seatNumber : selectedPassenger?.seatNumber;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        backTo={`/staff/bookings/${booking.id}`}
        backLabel="Volver a la reserva"
        eyebrow={`Reserva #${booking.id}`}
        title="QR de abordaje"
        subtitle={booking.trip ? `${booking.trip.title} · ${formatMxn(booking.totalAmount)}` : undefined}
        action={
          booking.trip ? (
            <Link
              to={`/staff/trips/${booking.trip.id}/scan`}
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              <ScanLine className="size-4" />
              Escanear QR
            </Link>
          ) : null
        }
      />

      {cancelled ? (
        <div className="rounded-card bg-error-container p-4 text-on-error-container">
          <p className="flex items-center gap-2 text-title-md">
            <XCircle className="size-5" />
            Reserva cancelada
          </p>
          <p className="mt-1 text-body-sm">
            El QR de esta reserva ya no es válido para el check-in.
          </p>
        </div>
      ) : null}

      <SectionCard
        title="Selecciona el boleto"
        icon={<Ticket className="size-5" />}
      >
        <Select
          label="Boleto"
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
        >
          <option value="holder">
            Titular · {booking.user?.name ?? "—"}
            {booking.seatNumber ? ` · Asiento ${booking.seatNumber}` : ""}
            {booking.checkedIn ? " · Abordó" : ""}
          </option>
          {passengers.map((passenger) => (
            <option key={passenger.id} value={passenger.id}>
              {passenger.name ?? "Acompañante"}
              {passenger.seatNumber ? ` · Asiento ${passenger.seatNumber}` : ""}
              {passenger.checkedIn ? " · Abordó" : ""}
            </option>
          ))}
        </Select>
      </SectionCard>

      <div className="rounded-card bg-white p-5 text-center shadow-layer-1">
        <div className="flex justify-center">
          <QrCode value={qrToken} size={260} label={name} />
        </div>
        <h2 className="mt-3 text-headline-sm text-on-surface">{name}</h2>
        <p className="text-body-md text-on-surface-variant">
          {booking.trip?.title ?? "Viaje"} · Reserva #{booking.id}
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-label-md text-on-surface-variant">
          <QrIcon className="size-3.5" />
          Asiento {seatNumber ?? "por asignar"}
        </p>

        <div className="mt-3 rounded-[12px] bg-surface-container-low p-3 text-body-sm">
          {checkedIn ? (
            <p className="inline-flex items-center gap-1.5 text-secondary">
              <CheckCircle2 className="size-4" />
              Abordó {checkedInAt ? `el ${formatDateTime(checkedInAt)}` : ""}
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-outline">
              <XCircle className="size-4" />
              Aún no ha abordado
            </p>
          )}
        </div>

        {!cancelled ? (
          <Button
            className="mt-4 w-full"
            variant={checkedIn ? "outline" : "primary"}
            loading={mutation.isPending}
            disabled={departureDone}
            onClick={() => mutation.mutate(!checkedIn)}
          >
            {checkedIn ? "Quitar abordaje" : "Marcar como abordado"}
          </Button>
        ) : null}
        {departureDone ? (
          <p className="mt-2 text-body-sm text-[#78350F]">
            La salida ya fue completada; el check-in está cerrado.
          </p>
        ) : null}
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Esta acción no valida si el check-in está abierto. Úsala para corregir abordajes.
        </p>
      </div>
    </div>
  );
}
