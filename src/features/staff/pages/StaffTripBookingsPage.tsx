import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listTripBookings } from "@/features/bookings/api";
import { listManageTrips } from "@/features/trips/api";
import type { BookingStatus } from "@/shared/api/types";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { BookingStatusBadge } from "@/shared/components/ui/StatusBadge";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { paidAmount, pendingAmount } from "@/shared/lib/booking";
import { formatMxn, toDecimal } from "@/shared/lib/money";
import { formatBookingDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

const filters: Array<{ key: "all" | BookingStatus; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "Pending", label: "Pendientes" },
  { key: "Confirmed", label: "Confirmadas" },
  { key: "Cancelled", label: "Canceladas" },
];

export function StaffTripBookingsPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [search, setSearch] = useState("");
  useDocumentTitle("Reservas del viaje");

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  const bookingsQuery = useQuery({
    queryKey: ["tripBookings", tripId, status],
    queryFn: () => listTripBookings(tripId, status),
    enabled: Number.isFinite(tripId),
  });

  const bookings = bookingsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter((booking) => {
      const passengers = booking.passengers?.map((passenger) => passenger.name).join(" ") ?? "";
      return `${booking.user?.name ?? ""} ${booking.user?.email ?? ""} ${passengers}`
        .toLowerCase()
        .includes(term);
    });
  }, [bookings, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/staff/trips/${tripId}`}
        backLabel="Volver al viaje"
        eyebrow="Reservas y pagos"
        title={trip?.title ?? "Reservas del viaje"}
        subtitle={trip ? `${trip.destination} · ${bookings.length} reservas en el filtro actual` : undefined}
        action={
          <>
            <Link to={`/staff/trips/${tripId}/checkin`} className={buttonClasses({ variant: "secondary", size: "md" })}>
              Check-in
            </Link>
            <Link to="/staff/bookings" className={buttonClasses({ variant: "outline", size: "md" })}>
              Todas las reservas
            </Link>
          </>
        }
      />

      <div className="rounded-card bg-white p-4 shadow-layer-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-[12px] border-[1.5px] border-input-border px-3">
            <Search className="size-4 text-outline" />
            <span className="sr-only">Buscar reservas</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cliente o pasajero…"
              className="h-11 min-w-0 flex-1 bg-transparent text-body-md outline-none placeholder:text-outline"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <Chip
                key={filter.key}
                selected={status === filter.key}
                onClick={() => setStatus(filter.key)}
                className={cn(status === filter.key && "border-primary-container bg-primary-container text-white")}
              >
                {filter.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {bookingsQuery.isError ? (
        <ErrorState
          message={bookingsQuery.error instanceof Error ? bookingsQuery.error.message : "No se pudieron cargar las reservas."}
          onRetry={() => void bookingsQuery.refetch()}
        />
      ) : bookingsQuery.isLoading ? (
        <PageLoader label="Cargando reservas…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin reservas"
          description="No hay reservas que coincidan con el filtro o la búsqueda."
          action={
            <Button variant="secondary" onClick={() => { setStatus("all"); setSearch(""); }}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const paid = paidAmount(booking);
            const pending = pendingAmount(booking);
            const settled = toDecimal(pending).lte(0);
            return (
              <article key={booking.id} className="rounded-card bg-white p-4 shadow-layer-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant">
                      <User className="size-3.5" />
                      {booking.user?.name ?? `Cliente ${booking.userId}`}
                    </p>
                    <p className="mt-0.5 text-headline-sm text-on-surface">
                      Reserva #{booking.id} · {booking.numberOfSeats} asiento(s)
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {booking.user?.email ?? ""} · {formatBookingDate(booking.bookingDate)}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
                  <span>Total {formatMxn(booking.totalAmount)}</span>
                  <span>Pagado {formatMxn(paid)}</span>
                  <span className={settled ? "text-secondary" : "text-[#78350F]"}>
                    {settled ? "Liquidado" : `Saldo ${formatMxn(pending)}`}
                  </span>
                  {booking.seatNumber ? <span>Titular #{booking.seatNumber}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/staff/bookings/${booking.id}`}
                    className={buttonClasses({ variant: "primary", size: "sm" })}
                  >
                    Gestionar pagos
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    to={`/staff/bookings/${booking.id}/qr`}
                    className={buttonClasses({ variant: "outline", size: "sm" })}
                  >
                    Ver QR
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
