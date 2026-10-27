import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  DoorClosed,
  Flag,
  QrCode,
  RotateCcw,
  ScanLine,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  checkinBooking,
  checkinPassenger,
} from "@/features/bookings/api";
import { listManageTrips, updateDeparture } from "@/features/trips/api";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard, StatCard } from "@/shared/components/ui/Section";
import { BookingStatusBadge } from "@/shared/components/ui/StatusBadge";
import { Switch } from "@/shared/components/ui/Form";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime, formatTripDetailDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

export function StaffCheckinPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  useDocumentTitle("Check-in y salida");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
    void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    void queryClient.invalidateQueries({ queryKey: ["booking"] });
  };

  const departureMutation = useMutation({
    mutationFn: (payload: { checkInOpen?: boolean; departureCompleted?: boolean }) =>
      updateDeparture(tripId, payload),
    onSuccess: () => {
      invalidate();
      showToast("Operación actualizada.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const bookingMutation = useMutation({
    mutationFn: (vars: { bookingId: number; checkedIn: boolean }) =>
      checkinBooking(vars.bookingId, vars.checkedIn),
    onSuccess: () => {
      invalidate();
      showToast("Check-in del titular actualizado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const passengerMutation = useMutation({
    mutationFn: (vars: { passengerId: number; checkedIn: boolean }) =>
      checkinPassenger(vars.passengerId, vars.checkedIn),
    onSuccess: () => {
      invalidate();
      showToast("Check-in del pasajero actualizado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  if (!isAdmin) {
    return (
      <EmptyState
        title="Acceso restringido"
        description="El check-in está reservado al administrador en la API actual."
        action={<Link to={`/staff/trips/${tripId}`} className={buttonClasses({ variant: "secondary" })}>Volver al viaje</Link>}
      />
    );
  }
  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }
  if (tripsQuery.isLoading) return <PageLoader label="Cargando check-in…" />;
  if (tripsQuery.isError || !trip) {
    return (
      <ErrorState
        message={tripsQuery.error instanceof Error ? tripsQuery.error.message : "No se pudo cargar el viaje."}
        onRetry={() => void tripsQuery.refetch()}
      />
    );
  }

  const bookings = (trip.bookings ?? []).filter((booking) => booking.status !== "Cancelled");
  const cancelledBookings = (trip.bookings ?? []).filter((booking) => booking.status === "Cancelled");
  const totalPeople = bookings.reduce((sum, booking) => sum + 1 + (booking.passengers?.length ?? 0), 0);
  const boardedPeople = bookings.reduce((sum, booking) => {
    const people = 1 + (booking.passengers?.length ?? 0);
    if (booking.checkedIn) return sum + people;
    return sum + (booking.passengers?.filter((passenger) => passenger.checkedIn).length ?? 0);
  }, 0);
  const totalSeats = bookings.reduce((sum, booking) => sum + booking.numberOfSeats, 0);
  const boardedSeats = bookings.reduce((sum, booking) => {
    if (booking.checkedIn) return sum + booking.numberOfSeats;
    return sum + (booking.passengers?.filter((passenger) => passenger.checkedIn).length ?? 0);
  }, 0);
  const pct = totalPeople ? Math.round((boardedPeople / totalPeople) * 100) : 0;
  const boardingEnabled = !trip.departureCompleted && trip.checkInOpen;

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/staff/trips/${tripId}`}
        backLabel="Volver al viaje"
        eyebrow="Operación"
        title="Check-in y salida"
        subtitle={`${trip.title} · ${formatTripDetailDate(trip.startDate)}`}
        action={
          <Link to={`/staff/trips/${tripId}/scan`} className={buttonClasses({ variant: "primary", size: "md" })}>
            <ScanLine className="size-4" />
            Escanear QR
          </Link>
        }
      />

      <div
        className={cn(
          "rounded-card border p-4 shadow-layer-1 sm:p-5",
          trip.departureCompleted
            ? "border-error/20 bg-error-container"
            : trip.checkInOpen
              ? "border-secondary/20 bg-confirmed"
              : "border-amber/30 bg-pending/60",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
              Estado del abordaje
            </p>
            <p className="mt-0.5 text-headline-sm text-on-surface">
              {trip.departureCompleted
                ? "Salida completada · Check-in cerrado"
                : trip.checkInOpen
                  ? "Check-in abierto"
                  : "Check-in cerrado"}
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Salida: {formatDateTime(trip.startDate)} · {boardedSeats} de {totalSeats} asientos abordados
            </p>
          </div>
          <div className="text-right">
            <p className="text-price-display text-primary-container">{pct}%</p>
            <p className="text-label-sm text-on-surface-variant">
              {boardedPeople} de {totalPeople} personas
            </p>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {trip.departureCompleted ? (
            <Button
              variant="secondary"
              size="md"
              loading={departureMutation.isPending}
              onClick={() => departureMutation.mutate({ departureCompleted: false })}
            >
              <RotateCcw className="size-4" />
              Reabrir salida
            </Button>
          ) : (
            <>
              <Button
                variant={trip.checkInOpen ? "outline" : "primary"}
                size="md"
                loading={departureMutation.isPending}
                onClick={() => departureMutation.mutate({ checkInOpen: !trip.checkInOpen })}
              >
                {trip.checkInOpen ? <DoorClosed className="size-4" /> : <DoorOpen className="size-4" />}
                {trip.checkInOpen ? "Cerrar check-in" : "Abrir check-in"}
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={departureMutation.isPending}
                onClick={() => departureMutation.mutate({ departureCompleted: true })}
              >
                <Flag className="size-4" />
                Marcar salida
              </Button>
            </>
          )}
        </div>
        {trip.departureCompleted ? (
          <p className="mt-2 text-body-sm text-on-error-container">
            La salida ya se realizó. Al reabrirla, el check-in permanecerá cerrado hasta que lo abras
            de nuevo.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <StatCard label="Personas" value={totalPeople} icon={<Users className="size-4" />} />
        <StatCard label="Abordaron" value={boardedPeople} tone="emerald" icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Asientos" value={totalSeats} tone="slate" icon={<Ticket className="size-4" />} />
        <StatCard label="Reservas" value={bookings.length} tone="primary" icon={<ClipboardCheck className="size-4" />} />
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="Este viaje no tiene reservas para controlar"
          description="Cuando existan reservas activas aparecerán aquí con sus pasajeros."
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const people = 1 + (booking.passengers?.length ?? 0);
            const allBoarded = booking.checkedIn;
            const boarded = allBoarded
              ? people
              : booking.passengers?.filter((passenger) => passenger.checkedIn).length ?? 0;
            return (
              <section key={booking.id} className="rounded-card bg-white p-4 shadow-layer-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-headline-sm text-on-surface">
                      {booking.user?.name ?? `Cliente ${booking.userId}`}
                      <span className="ml-2 text-label-md font-normal text-on-surface-variant">
                        #{booking.id}
                      </span>
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {booking.numberOfSeats} asiento(s) · {boarded}/{people} abordaron
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookingStatusBadge status={booking.status} />
                    <Link
                      to={`/staff/bookings/${booking.id}/qr`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      <QrCode className="size-3.5" />
                      QR
                    </Link>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface-container-low px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-full bg-primary-container text-white">
                        <User className="size-4" />
                      </span>
                      <div>
                        <p className="text-body-md text-on-surface">Titular · {booking.user?.name ?? "—"}</p>
                        <p className="text-body-sm text-on-surface-variant">
                          Asiento {booking.seatNumber ?? "—"}
                          {booking.checkedInAt ? ` · ${formatDateTime(booking.checkedInAt)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-label-md", booking.checkedIn ? "text-secondary" : "text-outline")}>
                        {booking.checkedIn ? "Abordó" : "No abordó"}
                      </span>
                      <Switch
                        checked={booking.checkedIn}
                        disabled={!boardingEnabled || bookingMutation.isPending}
                        onChange={(value) => bookingMutation.mutate({ bookingId: booking.id, checkedIn: value })}
                        label="Check-in del titular"
                        compact
                      />
                    </div>
                  </div>

                  {(booking.passengers ?? []).map((passenger) => (
                    <div
                      key={passenger.id}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-surface-container-high px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-full bg-mint text-label-md text-primary-container">
                          {passenger.name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                        <div>
                          <p className="text-body-md text-on-surface">
                            {passenger.name ?? "Acompañante"}
                            <span className="ml-1.5 text-label-sm text-on-surface-variant">
                              {passenger.isChild ? "Niño" : "Adulto"}
                            </span>
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                            Asiento {passenger.seatNumber ?? "—"}
                            {passenger.checkedInAt ? ` · ${formatDateTime(passenger.checkedInAt)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-label-md", allBoarded || passenger.checkedIn ? "text-secondary" : "text-outline")}>
                          {allBoarded || passenger.checkedIn ? "Abordó" : "No abordó"}
                        </span>
                        <Switch
                          checked={allBoarded || passenger.checkedIn}
                          disabled={!boardingEnabled || allBoarded || passengerMutation.isPending}
                          onChange={(value) =>
                            passengerMutation.mutate({ passengerId: passenger.id, checkedIn: value })
                          }
                          label={`Check-in de ${passenger.name ?? "pasajero"}`}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {cancelledBookings.length ? (
        <SectionCard title={`Reservas canceladas (${cancelledBookings.length})`}>
          <div className="space-y-1.5">
            {cancelledBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-2 text-body-sm text-on-surface-variant">
                <span>
                  #{booking.id} · {booking.user?.name ?? `Cliente ${booking.userId}`}
                </span>
                <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm text-on-error-container">
                  Cancelada
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {!boardingEnabled && !trip.departureCompleted ? (
        <p className="flex items-center justify-center gap-2 text-center text-body-sm text-[#78350F]">
          <AlertTriangle className="size-4" />
          Abre el check-in para habilitar los switches de abordaje.
        </p>
      ) : null}
    </div>
  );
}
