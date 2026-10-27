import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listAllBookings } from "@/features/bookings/api";
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
import { formatTripDetailDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

const filters: Array<{ key: "all" | BookingStatus; label: string }> = [
  { key: "Pending", label: "Pendientes" },
  { key: "Confirmed", label: "Confirmadas" },
  { key: "Cancelled", label: "Canceladas" },
  { key: "all", label: "Todas" },
];

export function StaffBookingsPage() {
  const [status, setStatus] = useState<"all" | BookingStatus>("Pending");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  useDocumentTitle("Reservas · Staff");

  const bookingsQuery = useQuery({
    queryKey: ["allBookings", status],
    queryFn: () => listAllBookings(status),
  });

  const bookings = bookingsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (fromDate && booking.trip) {
        const start = new Date(booking.trip.startDate);
        if (start < new Date(`${fromDate}T00:00:00`)) return false;
      }
      if (!term) return true;
      const haystack = `${booking.trip?.title ?? ""} ${booking.user?.name ?? ""} ${booking.user?.email ?? ""} ${
        booking.passengers?.map((passenger) => passenger.name).join(" ") ?? ""
      }`;
      return haystack.toLowerCase().includes(term);
    });
  }, [bookings, search, fromDate]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operación"
        title="Reservas"
        subtitle="Pagos, estados y saldos de todas las salidas."
        action={
          <Link to="/staff/trips" className={buttonClasses({ variant: "outline", size: "md" })}>
            Ir a viajes
          </Link>
        }
      />

      <div className="rounded-card bg-white p-4 shadow-layer-1">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-[12px] border-[1.5px] border-input-border px-3">
              <Search className="size-4 text-outline" />
              <span className="sr-only">Buscar reservas</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por viaje, cliente o pasajero…"
                className="h-11 min-w-0 flex-1 bg-transparent text-body-md outline-none placeholder:text-outline"
              />
            </label>
            <label className="flex items-center gap-2 rounded-[12px] border-[1.5px] border-input-border px-3">
              <CalendarDays className="size-4 text-outline" />
              <span className="text-label-sm text-on-surface-variant">Salida desde</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-11 bg-transparent text-body-md outline-none"
              />
              {fromDate ? (
                <button type="button" onClick={() => setFromDate("")} className="text-label-sm text-secondary">
                  Limpiar
                </button>
              ) : null}
            </label>
          </div>
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
          description="No hay reservas con este estado o filtros."
          action={
            <Button variant="secondary" onClick={() => { setStatus("Pending"); setSearch(""); setFromDate(""); }}>
              Restablecer
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
                    <p className="text-label-md text-on-surface-variant">
                      {booking.trip?.destination ?? "Destino"} · {booking.user?.name ?? `Cliente ${booking.userId}`}
                    </p>
                    <p className="text-headline-sm text-on-surface">
                      {booking.trip?.title ?? `Reserva #${booking.id}`}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {booking.trip ? formatTripDetailDate(booking.trip.startDate) : ""} ·{" "}
                      {booking.numberOfSeats} asiento(s) · Reserva #{booking.id}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
                  <span className="text-on-surface-variant">Total {formatMxn(booking.totalAmount)}</span>
                  <span className="text-on-surface-variant">Pagado {formatMxn(paid)}</span>
                  <span className={settled ? "text-secondary" : "font-semibold text-[#78350F]"}>
                    {settled ? "Liquidado" : `Saldo ${formatMxn(pending)}`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link to={`/staff/bookings/${booking.id}`} className={buttonClasses({ variant: "primary", size: "sm" })}>
                    Ver detalle
                    <ArrowRight className="size-3.5" />
                  </Link>
                  {booking.trip ? (
                    <Link
                      to={`/staff/trips/${booking.trip.id}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      Ver viaje
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
