import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, QrCode as QrIcon, Ticket, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getBooking } from "@/features/bookings/api";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { PageLoader } from "@/shared/components/ui/Media";
import { QrCode } from "@/shared/components/ui/QrCode";
import { PageHeader } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime, formatTripDetailDate } from "@/shared/lib/dates";
import { formatMxn } from "@/shared/lib/money";

export function PassengerQrPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  const booking = bookingQuery.data;
  useDocumentTitle("QR de acompañantes");

  if (!Number.isFinite(bookingId)) {
    return <EmptyState title="Reserva no encontrada" description="El enlace no es válido." />;
  }
  if (bookingQuery.isLoading) return <PageLoader label="Cargando códigos QR…" />;
  if (bookingQuery.isError || !booking) {
    return (
      <ErrorState
        message={errorMessage(bookingQuery.error) || "No encontramos esta reserva."}
        onRetry={() => void bookingQuery.refetch()}
      />
    );
  }

  const passengers = booking.passengers ?? [];
  const trip = booking.trip;
  const cancelled = booking.status === "Cancelled";

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/bookings/${booking.id}`}
        backLabel="Volver a mi reserva"
        eyebrow={`Reserva #${booking.id}`}
        title="QR de acompañantes"
        subtitle={
          trip
            ? `${trip.title} · ${formatTripDetailDate(trip.startDate)}`
            : "Códigos de abordaje de tus acompañantes"
        }
      />

      {cancelled ? (
        <div className="rounded-card border border-error/20 bg-error-container p-5 text-on-error-container">
          <p className="flex items-center gap-2 text-title-md">
            <XCircle className="size-5" />
            Esta reserva está cancelada
          </p>
          <p className="mt-1 text-body-md">
            Los códigos QR de los acompañantes ya no son válidos para el check-in. Si cancelaste por
            error, escríbenos por WhatsApp.
          </p>
        </div>
      ) : passengers.length === 0 ? (
        <EmptyState
          title="Esta reserva no tiene acompañantes adicionales"
          description="Cuando registres acompañantes, aquí verás su código QR personal para el abordaje."
          action={
            <Link
              to={`/bookings/${booking.id}/passengers/add`}
              className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary-container px-4 text-label-md text-white"
            >
              Agregar acompañantes
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-white p-3 shadow-layer-1">
            <p className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant">
              <QrIcon className="size-4 text-secondary" />
              Cada pasajero debe mostrar su propio código. No compartas tu QR.
            </p>
            <span className="rounded-full bg-mint px-2.5 py-1 text-label-md text-primary-container">
              {passengers.length} acompañante{passengers.length === 1 ? "" : "s"}
            </span>
          </div>

          {passengers.map((passenger) => (
            <article key={passenger.id} className="rounded-card bg-white p-4 shadow-layer-1 sm:p-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <QrCode
                  value={passenger.qrToken}
                  size={200}
                  label={passenger.name ?? "Acompañante"}
                />
                <div className="w-full min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-headline-sm text-on-surface">
                      {passenger.name ?? "Acompañante"}
                    </h2>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-md text-on-surface-variant">
                      {passenger.isChild ? "Niño" : "Adulto"}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-body-md text-on-surface-variant">
                    <p className="inline-flex items-center gap-1.5">
                      <Ticket className="size-4 text-secondary" />
                      Asiento {passenger.seatNumber ?? "por asignar"}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      {passenger.checkedIn ? (
                        <>
                          <CheckCircle2 className="size-4 text-secondary" />
                          Abordó{" "}
                          {passenger.checkedInAt
                            ? `a las ${formatDateTime(passenger.checkedInAt)}`
                            : ""}
                        </>
                      ) : (
                        <>
                          <XCircle className="size-4 text-outline" />
                          Aún no ha abordado
                        </>
                      )}
                    </p>
                  </div>
                  <div className="mt-3 rounded-[12px] bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                    Preséntalo en el check-in de la salida. El staff escaneará el código o lo
                    verificará manualmente.
                  </div>
                </div>
              </div>
            </article>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-white p-3 shadow-layer-1">
            <p className="text-body-sm text-on-surface-variant">
              Total de la reserva: {formatMxn(booking.totalAmount)}
            </p>
            <Link to={`/bookings/${booking.id}`}>
              <Button variant="secondary" size="sm">
                <ArrowLeft className="size-4" />
                Volver a los detalles
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
