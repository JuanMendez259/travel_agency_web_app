import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  Ticket,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { listUserBookings } from "@/features/bookings/api";
import type { Booking, BookingStatus } from "@/shared/api/types";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { BookingStatusBadge } from "@/shared/components/ui/StatusBadge";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { CoverImage, PageLoader } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { paidAmount, pendingAmount } from "@/shared/lib/booking";
import { formatMxn, toDecimal } from "@/shared/lib/money";
import { formatTripDetailDate, parseApiDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

const filters: Array<{ key: "all" | BookingStatus; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "Pending", label: "Pendientes" },
  { key: "Confirmed", label: "Confirmadas" },
  { key: "Cancelled", label: "Canceladas" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function expiresSoon(booking: Booking): boolean {
  if (booking.status !== "Pending") return false;
  const trip = booking.trip;
  if (!trip) return false;
  const deadline = parseApiDate(trip.bookingDeadline ?? trip.startDate);
  const hours = (deadline.getTime() - Date.now()) / 3_600_000;
  return hours > 0 && hours <= 24;
}

export function MyBookingsPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [search, setSearch] = useState("");
  useDocumentTitle("Mis viajes");

  const bookingsQuery = useQuery({
    queryKey: ["bookings", session?.userId],
    queryFn: () => listUserBookings(session!.userId),
    enabled: Boolean(session),
  });

  const bookings = bookingsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return bookings.filter((booking) => {
      if (filter !== "all" && booking.status !== filter) return false;
      if (!term) return true;
      const haystack = normalize(
        `${booking.trip?.title ?? ""} ${booking.trip?.destination ?? ""}`,
      );
      return haystack.includes(term);
    });
  }, [bookings, filter, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tus reservaciones"
        title="Mis viajes"
        subtitle="Pagos, códigos QR, acompañantes y cancelaciones en un solo lugar."
        action={
          <Link to="/explore" className={buttonClasses({ variant: "secondary", size: "md" })}>
            <Ticket className="size-4" />
            Reservar otro viaje
          </Link>
        }
      />

      <div className="rounded-card bg-white p-4 shadow-layer-1">
        <label className="flex items-center gap-2 rounded-[12px] border-[1.5px] border-input-border bg-white px-3">
          <Search className="size-4 shrink-0 text-outline" />
          <span className="sr-only">Buscar en mis reservas</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por viaje o destino…"
            className="h-11 min-w-0 flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => {
            const count =
              item.key === "all"
                ? bookings.length
                : bookings.filter((booking) => booking.status === item.key).length;
            return (
              <Chip
                key={item.key}
                selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                aria-pressed={filter === item.key}
                className={cn(
                  filter === item.key && "border-primary-container bg-primary-container text-white",
                )}
              >
                {item.label}
                <span className={cn("ml-1.5 text-[10px] opacity-80")}>{count}</span>
              </Chip>
            );
          })}
        </div>
      </div>

      {bookingsQuery.isError ? (
        <ErrorState
          message="No pudimos cargar tus reservas."
          onRetry={() => void bookingsQuery.refetch()}
        />
      ) : bookingsQuery.isLoading ? (
        <PageLoader label="Cargando tus reservas…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={bookings.length === 0 ? "Aún no tienes reservas" : "Sin resultados"}
          description={
            bookings.length === 0
              ? "Tu próxima aventura empieza con un clic. Explora las salidas disponibles."
              : "Prueba con otro estado o limpia la búsqueda."
          }
          action={
            bookings.length === 0 ? (
              <Link to="/explore" className={buttonClasses({ variant: "primary" })}>
                Explorar viajes
              </Link>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const trip = booking.trip;
            const paid = paidAmount(booking);
            const pending = pendingAmount(booking);
            const settled = toDecimal(pending).lte(0);
            const saleSeats = booking.numberOfSeats;
            const soon = expiresSoon(booking);
            const cancelledByAgency =
              booking.status === "Cancelled" &&
              booking.cancelledByUserId != null &&
              booking.cancelledByUserId !== booking.userId;

            return (
              <article
                key={booking.id}
                className="overflow-hidden rounded-card bg-white shadow-layer-1 transition hover:shadow-layer-2"
              >
                <div className="flex flex-col sm:flex-row">
                  <Link
                    to={`/bookings/${booking.id}`}
                    className="relative block shrink-0 sm:w-56"
                  >
                    <CoverImage
                      src={trip?.imageUrl}
                      alt={trip?.title ?? "Viaje"}
                      ratio="aspect-[16/9] sm:aspect-auto sm:h-full"
                      className="sm:h-full"
                    />
                    <span className="absolute top-2.5 left-2.5">
                      <BookingStatusBadge status={booking.status} />
                    </span>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                          <MapPin className="size-3.5 text-secondary" />
                          {trip?.destination ?? "Destino por confirmar"}
                        </p>
                        <Link to={`/bookings/${booking.id}`}>
                          <h2 className="mt-0.5 text-headline-sm text-on-surface hover:text-primary-container">
                            {trip?.title ?? `Reserva #${booking.id}`}
                          </h2>
                        </Link>
                      </div>
                      <div className="text-right">
                        <p className="text-price-display text-primary-container">
                          {formatMxn(booking.totalAmount)}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          {settled ? "Pagado 100%" : `Anticipo ${formatMxn(paid)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-label-md text-on-surface-variant">
                      {trip ? (
                        <span className="inline-flex items-center gap-1.5 first-letter:uppercase">
                          <CalendarDays className="size-3.5" />
                          {formatTripDetailDate(trip.startDate)}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {saleSeats} asiento{saleSeats === 1 ? "" : "s"}
                        {booking.seatNumber ? ` · #${booking.seatNumber}` : ""}
                      </span>
                    </div>

                    {soon ? (
                      <p className="inline-flex items-center gap-1.5 rounded-lg bg-pending px-2.5 py-1.5 text-label-md text-[#78350F]">
                        <AlertTriangle className="size-3.5" />
                        Expira pronto: liquida antes de la fecha límite
                      </p>
                    ) : null}

                    {booking.status === "Cancelled" ? (
                      <p className="inline-flex items-center gap-1.5 text-body-sm text-error">
                        <AlertTriangle className="size-3.5" />
                        {cancelledByAgency
                          ? toDecimal(booking.refundTotal ?? 0).gt(0)
                            ? "Cancelado por la agencia · 100% acreditado a tu monedero"
                            : "Cancelado por la agencia"
                          : "Cancelado por el usuario"}
                        {toDecimal(booking.refundTotal ?? 0).gt(0)
                          ? ` · Saldo a favor ${formatMxn(booking.refundTotal ?? 0)}`
                          : ""}
                      </p>
                    ) : null}

                    {booking.status !== "Cancelled" && !settled ? (
                      <p className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                        <Clock3 className="size-3.5" />
                        Pagado {formatMxn(paid)} de {formatMxn(booking.totalAmount)} · Saldo{" "}
                        {formatMxn(pending)}
                      </p>
                    ) : null}

                    {booking.status === "Confirmed" ? (
                      <p className="inline-flex items-center gap-1.5 text-body-sm text-secondary">
                        <CheckCircle2 className="size-3.5" />
                        Reserva confirmada y liquidada
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      <Link
                        to={`/bookings/${booking.id}`}
                        className={buttonClasses({ variant: "primary", size: "sm" })}
                      >
                        Ver detalles
                        <ArrowRight className="size-3.5" />
                      </Link>
                      {booking.status === "Pending" ? (
                        <Link
                          to={`/bookings/${booking.id}`}
                          className={buttonClasses({ variant: "secondary", size: "sm" })}
                        >
                          Completar pago
                        </Link>
                      ) : null}
                      {booking.status !== "Cancelled" && booking.passengers?.length ? (
                        <Link
                          to={`/bookings/${booking.id}/qr`}
                          className={buttonClasses({ variant: "outline", size: "sm" })}
                        >
                          <Ticket className="size-3.5" />
                          QR acompañantes
                        </Link>
                      ) : null}
                      {booking.status === "Cancelled" &&
                      toDecimal(booking.refundTotal ?? 0).gt(0) ? (
                        <Link
                          to="/profile#billetera"
                          className={buttonClasses({ variant: "secondary", size: "sm" })}
                        >
                          Ver saldo y solicitar reembolso
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-body-sm text-on-surface-variant">
        <MapPin className="size-3.5 text-secondary" />
        Viajero responsable con el entorno y las comunidades locales.
      </p>
    </div>
  );
}
