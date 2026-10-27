import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Bus,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileClock,
  Hotel,
  Info,
  MapPinned,
  MessageCircle,
  Pause,
  Pencil,
  Play,
  QrCode,
  Star,
  Ticket,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  deletePoi,
  deleteTrip,
  finalizeTrip,
  getTransport,
  listManageTrips,
  listTripRatings,
  publishTransport,
  setTripActive,
} from "@/features/trips/api";
import type { Booking } from "@/shared/api/types";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { CoverImage, PageLoader, RichText } from "@/shared/components/ui/Media";
import { ConfirmDialog, Modal } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard, StatCard } from "@/shared/components/ui/Section";
import { BookingStatusBadge } from "@/shared/components/ui/StatusBadge";
import { StarRating } from "@/shared/components/ui/StarRating";
import { TextArea, TextField } from "@/shared/components/ui/Form";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatMxn } from "@/shared/lib/money";
import { formatTripDetailDate } from "@/shared/lib/dates";
import { bookableCapacity, soldSeats, transportLabel } from "@/shared/lib/trip";
import { formatPhone, telHref, whatsappHref } from "@/shared/lib/phone";

export function StaffTripDetailPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [plate, setPlate] = useState("");
  const [transportFile, setTransportFile] = useState<File | null>(null);

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  const bookings = trip?.bookings ?? [];
  const deleteBlockers: string[] = [];
  if (bookings.some((booking) => booking.status === "Cancelled" || Number(booking.refundTotal ?? 0) > 0)) {
    deleteBlockers.push(
      "Este viaje tiene reservas canceladas o reembolsos registrados. La API actual no elimina esos registros por integridad financiera, por lo que el viaje no se puede borrar todavía.",
    );
  }
  const pointsOfInterest = trip?.pointsOfInterest ?? [];
  useDocumentTitle(trip ? trip.title : "Detalle del viaje");

  const ratingsQuery = useQuery({
    queryKey: ["ratings", tripId],
    queryFn: () => listTripRatings(tripId),
    enabled: Number.isFinite(tripId) && Boolean(trip),
  });
  const transportQuery = useQuery({
    queryKey: ["transport", tripId],
    queryFn: () => getTransport(tripId),
    enabled: Number.isFinite(tripId) && Boolean(trip),
    retry: false,
  });

  const transport =
    transportQuery.data && typeof transportQuery.data === "object" ? transportQuery.data : null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
    void queryClient.invalidateQueries({ queryKey: ["trips"] });
    void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
  };

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeTrip(tripId, !trip?.finalized),
    onSuccess: () => {
      invalidate();
      setFinalizeOpen(false);
      showToast(trip?.finalized ? "Viaje reabierto." : "Viaje finalizado.", "success");
    },
    onError: (error) => showToast(error instanceof Error ? error.message : "No se pudo finalizar.", "error"),
  });

  const pauseMutation = useMutation({
    mutationFn: () => setTripActive(tripId, !trip?.isActive),
    onSuccess: () => {
      invalidate();
      setPauseOpen(false);
      showToast(trip?.isActive ? "Viaje pausado." : "Viaje reactivado.", "success");
    },
    onError: (error) => showToast(error instanceof Error ? error.message : "No se pudo actualizar.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (deleteBlockers.length) {
        throw new Error(deleteBlockers[0]);
      }
      // La API no elimina los POIs antes del viaje (FK Restrict). Los quitamos
      // primero desde su endpoint para que el borrado funcione en viajes con ruta.
      for (const poi of pointsOfInterest) {
        await deletePoi(tripId, poi.id);
      }
      return deleteTrip(tripId, deleteMessage.trim() || undefined);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      showToast("Viaje eliminado.", "success");
      navigate("/staff/trips", { replace: true });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el viaje.";
      setDeleteError(message);
      showToast(message, "error");
    },
  });

  const transportMutation = useMutation({
    mutationFn: () => publishTransport(tripId, plate.trim() || undefined, transportFile ?? undefined),
    onSuccess: () => {
      setTransportFile(null);
      void queryClient.invalidateQueries({ queryKey: ["transport", tripId] });
      showToast("Información de la unidad publicada.", "success");
    },
    onError: (error) => showToast(error instanceof Error ? error.message : "No se pudo publicar.", "error"),
  });

  const capacityRequests = (trip?.capacityRequests ?? []).filter((request) => !request.isResolved);
  const ratings = ratingsQuery.data ?? [];
  const averageRating = useMemo(
    () => (ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0),
    [ratings],
  );

  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }
  if (tripsQuery.isLoading) return <PageLoader label="Cargando viaje…" />;
  if (tripsQuery.isError) {
    return (
      <ErrorState
        message={tripsQuery.error instanceof Error ? tripsQuery.error.message : "No se pudo cargar."}
        onRetry={() => void tripsQuery.refetch()}
      />
    );
  }
  if (!trip) {
    return (
      <EmptyState
        title="Viaje no encontrado"
        description="Puede que se haya eliminado."
        action={
          <Link to="/staff/trips" className={buttonClasses({ variant: "secondary" })}>
            Volver a mis viajes
          </Link>
        }
      />
    );
  }

  const capacity = bookableCapacity(trip);
  const sold = soldSeats(trip);
  const now = Date.now();
  const withinDates =
    now >= new Date(trip.startDate).getTime() && now <= new Date(trip.endDate).getTime();

  const canContact = (booking: Booking) =>
    !trip.finalized &&
    booking.status !== "Cancelled" &&
    !booking.checkedIn &&
    withinDates &&
    Boolean(booking.user?.phone);

  return (
    <div className="space-y-5">
      <PageHeader
        backTo="/staff/trips"
        backLabel="Mis viajes"
        eyebrow={isAdmin ? "Administración" : "Operación"}
        title={trip.title}
        subtitle={`${trip.destination} · ${formatTripDetailDate(trip.startDate)}`}
        action={
          <>
            {isAdmin ? (
              <Link to={`/staff/trips/${trip.id}/edit`} className={buttonClasses({ variant: "primary", size: "md" })}>
                <Pencil className="size-4" />
                Editar
              </Link>
            ) : null}
            <Button variant="outline" size="md" onClick={() => setFinalizeOpen(true)}>
              <CheckCircle2 className="size-4" />
              {trip.finalized ? "Reabrir viaje" : "Finalizar"}
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-card bg-white shadow-layer-1">
        <div className="relative">
          <CoverImage src={trip.imageUrl} alt={trip.title} ratio="aspect-[16/7] sm:aspect-[21/7]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate/75 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-4 text-white">
            <div>
              <div className="flex flex-wrap gap-1.5">
                {!trip.isActive ? <Badge tone="cancelled">PAUSADO</Badge> : null}
                {trip.finalized ? <Badge tone="neutral">Finalizado</Badge> : null}
                {trip.departureCompleted ? <Badge tone="pending">Salida realizada</Badge> : null}
                <Badge>{transportLabel(trip.transportType)}</Badge>
              </div>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-body-sm text-white/90">
                <MapPinned className="size-4" />
                {trip.destination}
              </p>
            </div>
            <p className="text-body-sm text-white/90">
              {formatMxn(trip.price)} · {capacity} asientos
            </p>
          </div>
        </div>
        <div className="grid gap-2 p-3 sm:grid-cols-4">
          <StatCard label="Vendidos" value={sold} icon={<Ticket className="size-4" />} />
          <StatCard label="Disponibles" value={trip.availableSeats} tone="emerald" icon={<Users className="size-4" />} />
          <StatCard label="Capacidad" value={capacity} tone="slate" icon={<Bus className="size-4" />} />
          <StatCard
            label="Ocupación"
            value={`${capacity ? Math.round((sold / capacity) * 100) : 0}%`}
            tone="amber"
            icon={<BarChart3 className="size-4" />}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <SectionCard title="Descripción y logística" icon={<Info className="size-5" />}>
            <RichText text={trip.description} />
            {!trip.description ? (
              <p className="text-body-md text-on-surface-variant">Sin descripción registrada.</p>
            ) : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <InfoLine icon={<CalendarDays className="size-4" />} label="Inicio" value={formatTripDetailDate(trip.startDate)} />
              <InfoLine icon={<Clock3 className="size-4" />} label="Fin" value={formatTripDetailDate(trip.endDate)} />
              <InfoLine
                icon={<Ticket className="size-4" />}
                label="Cierre de reservas"
                value={trip.bookingDeadline ? formatTripDetailDate(trip.bookingDeadline) : "Sin límite (inicio del viaje)"}
              />
              <InfoLine
                icon={<Info className="size-4" />}
                label="Política de cancelación"
                value={
                  trip.cancellationDaysLimit == null
                    ? "Flexible (siempre dentro de política)"
                    : `${trip.cancellationDaysLimit} días antes`
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Hotel y opciones"
            subtitle="El cupo efectivo nunca supera la capacidad del hotel"
            icon={<Hotel className="size-5" />}
            action={
              isAdmin ? (
                <Link to={`/staff/trips/${trip.id}/options`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                  Administrar opciones
                </Link>
              ) : null
            }
          >
            {trip.includesHotel ? (
              <p className="text-body-md text-on-surface-variant">
                Hotel <strong className="text-on-surface">{trip.hotelName ?? "sin nombre"}</strong> · cupo{" "}
                {trip.hotelCapacity ?? "—"} · capacidad efectiva {capacity}
              </p>
            ) : (
              <p className="text-body-md text-on-surface-variant">Este viaje no incluye hotel.</p>
            )}
            <div className="mt-3 space-y-2">
              {(trip.options ?? []).map((option) => (
                <div
                  key={option.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2"
                >
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-body-md text-on-surface">
                      {option.name}
                      {option.isBase ? <Badge>Base</Badge> : null}
                      {!option.isActive ? <Badge tone="cancelled">Inactiva</Badge> : null}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      Adulto {formatMxn(option.priceAdult)}
                      {option.priceChild != null ? ` · Niño ${formatMxn(option.priceChild)}` : " · Niño tarifa adulto"}
                    </p>
                  </div>
                  <span className="text-label-md text-on-surface-variant">
                    {option.availableSeats} disponibles
                  </span>
                </div>
              ))}
              {(trip.options ?? []).length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Sin opciones registradas.</p>
              ) : null}
            </div>
          </SectionCard>

          {capacityRequests.length ? (
            <SectionCard title="Solicitudes de cupo" subtitle={`${capacityRequests.length} sin resolver`} icon={<Users className="size-5" />}>
              <div className="space-y-2">
                {capacityRequests.map((request) => (
                  <div key={request.id} className="rounded-[12px] bg-surface-container-low p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-md text-on-surface">
                        {request.user?.name ?? `Usuario ${request.userId}`} pidió {request.requestedSeats} asiento(s)
                      </p>
                      <span className="text-body-sm text-on-surface-variant">
                        {request.createdAt ? formatTripDetailDate(request.createdAt) : ""}
                      </span>
                    </div>
                    {request.message ? (
                      <p className="mt-1 text-body-sm text-on-surface-variant">{request.message}</p>
                    ) : null}
                    {request.user?.phone ? (
                      <a
                        href={whatsappHref(request.user.phone) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-label-md text-secondary"
                      >
                        <MessageCircle className="size-3.5" />
                        {formatPhone(request.user.phone)}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Pasajeros y reservas"
            subtitle={`${bookings.length} reserva(s) registrada(s)`}
            icon={<Users className="size-5" />}
            action={
              isAdmin ? (
                <Link to={`/staff/trips/${trip.id}/bookings`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                  Gestionar pagos
                </Link>
              ) : null
            }
          >
            {bookings.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Aún no hay reservas para este viaje.</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-[12px] border border-surface-container-high p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-body-md text-on-surface">
                          {booking.user?.name ?? `Cliente ${booking.userId}`} ·{" "}
                          {booking.numberOfSeats} asiento(s)
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          {booking.user?.email ?? ""}
                          {booking.seatNumber ? ` · Titular #${booking.seatNumber}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookingStatusBadge status={booking.status} />
                        <span className="text-label-md text-on-surface">{formatMxn(booking.totalAmount)}</span>
                      </div>
                    </div>
                    {booking.passengers?.length ? (
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Acompañantes: {booking.passengers.map((passenger) => passenger.name).filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {canContact(booking) ? (
                        <>
                          <a
                            href={whatsappHref(booking.user?.phone, `Hola ${booking.user?.name ?? ""}, te escribimos por tu viaje "${trip.title}".`) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonClasses({ variant: "secondary", size: "sm" })}
                          >
                            <MessageCircle className="size-3.5" />
                            WhatsApp
                          </a>
                          <a
                            href={telHref(booking.user?.phone) ?? "#"}
                            className={buttonClasses({ variant: "outline", size: "sm" })}
                          >
                            Llamar
                          </a>
                        </>
                      ) : (
                        <span className="text-label-sm text-outline">Contacto no disponible</span>
                      )}
                      {isAdmin ? (
                        <Link
                          to={`/staff/bookings/${booking.id}`}
                          className={buttonClasses({ variant: "ghost", size: "sm" })}
                        >
                          Ver reserva
                          <ArrowRight className="size-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Información de la unidad"
            subtitle="Foto y placas del transporte"
            icon={<Bus className="size-5" />}
          >
            {transport?.imageUrl ? (
              <img src={transport.imageUrl} alt="Unidad" className="mb-2 aspect-[16/9] w-full rounded-[12px] object-cover" />
            ) : (
              <p className="text-body-sm text-on-surface-variant">Sin foto de la unidad.</p>
            )}
            <p className="mt-1 text-body-md text-on-surface">
              Placas: <strong>{transport?.plate ?? "Por confirmar"}</strong>
            </p>
            {isAdmin ? (
              <div className="mt-3 space-y-2 rounded-[12px] bg-surface-container-low p-3">
                <TextField
                  label="Placas"
                  value={plate}
                  onChange={(event) => setPlate(event.target.value)}
                  placeholder={transport?.plate ?? "JAL-1234"}
                />
                <label className="block text-label-md text-on-surface-variant">
                  Foto de la unidad
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setTransportFile(event.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-body-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:text-label-md file:text-primary-container"
                  />
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={transportMutation.isPending}
                  disabled={!plate.trim() && !transportFile}
                  onClick={() => transportMutation.mutate()}
                >
                  Publicar unidad
                </Button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Opiniones de clientes" subtitle={`${ratings.length} opinión(es)`} icon={<Star className="size-5" />}>
            {ratings.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Aún no hay opiniones registradas.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StarRating value={Math.round(averageRating)} />
                  <span className="text-body-md text-on-surface">{averageRating.toFixed(1)} / 5</span>
                </div>
                {ratings.map((rating) => (
                  <div key={rating.id} className="rounded-[12px] bg-surface-container-low p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-md text-on-surface">{rating.userName ?? "Cliente"}</p>
                      <StarRating value={rating.rating} size="sm" />
                    </div>
                    {rating.comment ? (
                      <p className="mt-1 text-body-sm text-on-surface-variant">{rating.comment}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <SectionCard title="Operación" icon={<ClipboardList className="size-5" />}>
            <div className="space-y-2">
              {isAdmin ? (
                <Link to={`/staff/trips/${trip.id}/bookings`} className={buttonClasses({ variant: "primary", size: "md", className: "w-full" })}>
                  <Wallet className="size-4" />
                  Reservas y pagos
                </Link>
              ) : null}
              {isAdmin ? (
                <Link to={`/staff/trips/${trip.id}/map`} className={buttonClasses({ variant: "secondary", size: "md", className: "w-full" })}>
                  <MapPinned className="size-4" />
                  Mapa e itinerario
                </Link>
              ) : null}
              {isAdmin ? (
                <Link to={`/staff/trips/${trip.id}/checkin`} className={buttonClasses({ variant: "secondary", size: "md", className: "w-full" })}>
                  <QrCode className="size-4" />
                  Check-in / Salida
                </Link>
              ) : null}
              <Link
                to={`/staff/audit?entity=Trip&id=${trip.id}`}
                className={buttonClasses({ variant: "outline", size: "md", className: "w-full" })}
              >
                <FileClock className="size-4" />
                Historial de cambios
              </Link>
              <Button
                variant={trip.finalized ? "outline" : "secondary"}
                size="md"
                className="w-full"
                onClick={() => setFinalizeOpen(true)}
              >
                <CheckCircle2 className="size-4" />
                {trip.finalized ? "Reabrir viaje" : "Finalizar viaje"}
              </Button>
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Finalizar libera la unidad y habilita las calificaciones. No cierra el check-in.
            </p>
          </SectionCard>

          {isAdmin ? (
            <SectionCard title="Administración" icon={<Pencil className="size-5" />}>
              <div className="space-y-2">
                <Link to={`/staff/trips/${trip.id}/edit`} className={buttonClasses({ variant: "secondary", size: "md", className: "w-full" })}>
                  <Pencil className="size-4" />
                  Editar viaje
                </Link>
                <Button variant="outline" size="md" className="w-full" onClick={() => setPauseOpen(true)}>
                  {trip.isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {trip.isActive ? "Pausar viaje" : "Reactivar viaje"}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteMessage("");
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="size-4" />
                  Eliminar viaje
                </Button>
              </div>
            </SectionCard>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        title={trip.finalized ? "Reabrir viaje" : "Finalizar viaje"}
        description={
          trip.finalized
            ? "El viaje volverá a estar activo para operación y calificaciones."
            : "Se eliminará la información de la unidad y se notificará a los clientes para que califiquen. El check-in no se cierra automáticamente."
        }
        confirmLabel={trip.finalized ? "Reabrir" : "Finalizar"}
        loading={finalizeMutation.isPending}
        onConfirm={() => finalizeMutation.mutate()}
      />

      <ConfirmDialog
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title={trip.isActive ? "Pausar viaje" : "Reactivar viaje"}
        description={
          trip.isActive
            ? "No aceptará reservas nuevas. Las reservas existentes siguen vigentes y se notificará a los clientes."
            : "Volverá a estar visible y aceptará reservas nuevas."
        }
        tone={trip.isActive ? "danger" : "primary"}
        loading={pauseMutation.isPending}
        onConfirm={() => pauseMutation.mutate()}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar viaje"
        description="Esta acción no se puede deshacer y cancelará las reservas pendientes o confirmadas."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteMutation.isPending}
              disabled={deleteBlockers.length > 0}
              onClick={() => {
                setDeleteError(null);
                deleteMutation.mutate();
              }}
            >
              Eliminar definitivamente
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-body-md text-on-surface-variant">
            Se notificará a los clientes con reservas pendientes o confirmadas.
          </p>
          <TextArea
            label="Mensaje para los clientes (opcional)"
            value={deleteMessage}
            maxLength={500}
            onChange={(event) => setDeleteMessage(event.target.value)}
            placeholder={`Tu reserva para "${trip.title}" fue cancelada porque el viaje fue eliminado.`}
          />
          {pointsOfInterest.length ? (
            <p className="rounded-lg bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant">
              Se eliminarán también {pointsOfInterest.length} punto(s) de interés del itinerario.
            </p>
          ) : null}
          {bookings.some((booking) => booking.status !== "Cancelled") ? (
            <p className="rounded-lg bg-pending p-2.5 text-body-sm text-[#78350F]">
              Este viaje tiene {bookings.filter((booking) => booking.status !== "Cancelled").length} reserva(s)
              activa(s). Se perderá su historial operativo.
            </p>
          ) : null}
          {deleteBlockers.length ? (
            <div role="alert" className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">
              <p className="font-semibold">No se puede eliminar este viaje</p>
              <p className="mt-1">{deleteBlockers[0]}</p>
              <p className="mt-1">Puedes pausarlo para ocultarlo del catálogo sin perder el historial.</p>
            </div>
          ) : null}
          {deleteError ? (
            <div role="alert" className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">
              {deleteError}
            </div>
          ) : null}
        </div>
      </Modal>

      <p className="text-center text-body-sm text-on-surface-variant">
        {trip.cancellationDaysLimit == null
          ? "Política flexible: reembolso del 100%."
          : `Cancelación dentro de política hasta ${trip.cancellationDaysLimit} días antes de la salida.`}
      </p>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-surface-container-low p-2.5">
      <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-wide text-on-surface-variant">
        <span className="text-secondary">{icon}</span>
        {label}
      </p>
      <p className="mt-0.5 text-body-md first-letter:uppercase text-on-surface">{value}</p>
    </div>
  );
}
