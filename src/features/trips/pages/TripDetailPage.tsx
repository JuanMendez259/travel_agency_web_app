import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bus,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { saveCheckoutDraft, type CheckoutDraft } from "@/features/bookings/checkoutDraft";
import { useFavorites, useToggleFavorite } from "@/features/favorites/hooks";
import { getTrip, requestCapacity } from "@/features/trips/api";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Counter } from "@/shared/components/ui/Counter";
import { TextArea } from "@/shared/components/ui/Form";
import { PageLoader, RichText } from "@/shared/components/ui/Media";
import { SectionCard } from "@/shared/components/ui/Section";
import { Switch } from "@/shared/components/ui/Form";
import { useToast } from "@/shared/components/ui/Toast";
import { TripImageCarousel } from "@/shared/components/trips/TripImageCarousel";
import { AGENCY } from "@/shared/lib/agency";
import {
  formatDateLong,
  formatDateTime,
  formatShortDate,
  formatTripDetailDate,
} from "@/shared/lib/dates";
import { downloadTripIcs, googleCalendarHref } from "@/shared/lib/ics";
import { addMoney, formatMxn, multiplyMoney } from "@/shared/lib/money";
import {
  activeOptions,
  bookableCapacity,
  displayPrice,
  isBookingClosed,
  isCancellationAvailable,
  transportLabel,
} from "@/shared/lib/trip";
import { cn } from "@/shared/lib/cn";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export function TripDetailPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { session } = useAuth();

  const tripQuery = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: Number.isFinite(tripId),
  });
  const favoritesQuery = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const trip = tripQuery.data;

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [optionSelection, setOptionSelection] = useState<
    Record<number, { adults: number; children: number }>
  >({});
  const [needsEnabled, setNeedsEnabled] = useState(false);
  const [needsNote, setNeedsNote] = useState("");
  const [capacitySeats, setCapacitySeats] = useState(2);
  const [capacityMessage, setCapacityMessage] = useState("");
  const initializedFor = useRef<number | null>(null);

  useDocumentTitle(trip?.title);

  const options = activeOptions(trip);
  const useOptions = Boolean(trip?.hasOptions && options.length);
  const favoriteIds = new Set((favoritesQuery.data ?? []).map((item) => item.id));
  const favorite = favoriteIds.has(tripId);

  useEffect(() => {
    if (!trip || initializedFor.current === trip.id) return;
    initializedFor.current = trip.id;
    if (trip.hasOptions && activeOptions(trip).length) {
      const first = activeOptions(trip)[0];
      setOptionSelection({ [first.id]: { adults: 1, children: 0 } });
    }
  }, [trip]);

  const optionLines = useMemo(
    () =>
      options
        .map((option) => ({
          tripOptionId: option.id,
          adults: optionSelection[option.id]?.adults ?? 0,
          children: optionSelection[option.id]?.children ?? 0,
        }))
        .filter((line) => line.adults + line.children > 0),
    [options, optionSelection],
  );

  const optionSeats = optionLines.reduce((sum, line) => sum + line.adults + line.children, 0);
  const totalSeats = useOptions ? optionSeats : adults + children;
  const available = trip?.availableSeats ?? 0;
  const capacity = trip ? bookableCapacity(trip) : 0;
  const sold = Math.max(0, capacity - available);
  const closed = trip ? isBookingClosed(trip) : false;

  const baseTotal = useMemo(() => {
    if (!trip) return "0.00";
    if (useOptions) {
      return addMoney(
        ...optionLines.map((line) => {
          const option = options.find((item) => item.id === line.tripOptionId);
          if (!option) return 0;
          const childPrice = option.priceChild ?? option.priceAdult;
          return addMoney(
            multiplyMoney(option.priceAdult, line.adults),
            multiplyMoney(childPrice, line.children),
          );
        }),
      ).toFixed(2);
    }
    return addMoney(
      multiplyMoney(trip.price, adults),
      multiplyMoney(trip.childPrice ?? trip.price, children),
    ).toFixed(2);
  }, [trip, useOptions, optionLines, options, adults, children]);

  const capacityMutation = useMutation({
    mutationFn: (vars: { tripId: number; seats: number; message: string | null }) =>
      requestCapacity(vars.tripId, vars.seats, vars.message),
    onSuccess: () => {
      showToast("Recibimos tu solicitud. Te avisaremos en cuanto se habilite cupo.", "success");
      setCapacityMessage("");
      setCapacitySeats(2);
    },
    onError: (error) =>
      showToast(error instanceof Error ? error.message : "No se pudo enviar la solicitud.", "error"),
  });

  if (!Number.isFinite(tripId)) {
    return (
      <EmptyState
        title="Viaje no encontrado"
        description="El enlace no es válido."
        action={<Link to="/explore" className={buttonClasses({ variant: "secondary" })}>Volver a explorar</Link>}
      />
    );
  }

  if (tripQuery.isLoading) return <PageLoader label="Cargando tu próxima parada…" />;
  if (tripQuery.isError || !trip) {
    return (
      <ErrorState
        message={
          tripQuery.error instanceof Error ? tripQuery.error.message : "No encontramos este viaje."
        }
        onRetry={() => void tripQuery.refetch()}
      />
    );
  }

  const days = Math.max(
    1,
    Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000),
  );
  const canBook = trip.isActive && !closed && available > 0;
  const maxSeats = available;
  const remainingForAdults = Math.max(0, maxSeats - children);
  const remainingForChildren = Math.max(0, maxSeats - adults);

  const handleReserve = () => {
    if (!canBook) return;
    if (totalSeats < 1) {
      showToast("Selecciona al menos un boleto para continuar.", "error");
      return;
    }
    if (totalSeats > available) {
      showToast("No hay suficientes asientos disponibles.", "error");
      return;
    }
    if (needsEnabled && !needsNote.trim()) {
      showToast("Cuéntanos qué necesitas para poder ayudarte.", "error");
      return;
    }

    const draft: CheckoutDraft = {
      tripId: trip.id,
      useOptions,
      options: useOptions ? optionLines : [],
      adults: useOptions ? 0 : adults,
      children: useOptions ? 0 : children,
      totalSeats,
      specialNeedsNote: needsEnabled ? needsNote.trim() : null,
    };
    saveCheckoutDraft(draft);
    navigate(`/trips/${trip.id}/book`, { state: draft });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: trip.title,
          text: `${trip.title} · ${trip.destination} con Proxima Parada Tours`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      showToast("Enlace copiado al portapapeles.", "success");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        showToast("No se pudo compartir automáticamente. Copia el enlace del navegador.", "error");
      }
    }
  };

  const updateOption = (
    optionId: number,
    field: "adults" | "children",
    nextValue: number,
  ) => {
    setOptionSelection((current) => {
      const line = current[optionId] ?? { adults: 0, children: 0 };
      return { ...current, [optionId]: { ...line, [field]: Math.max(0, nextValue) } };
    });
  };

  const whatsappHref = `https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(
    `Hola, tengo una pregunta sobre el viaje "${trip.title}" (${formatShortDate(trip.startDate)}).`,
  )}`;

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft className="size-4" />
        Explorar viajes
      </Link>

      <div className="relative overflow-hidden rounded-[24px] bg-surface-container-high">
        <TripImageCarousel
          images={trip.images}
          fallbackUrl={trip.imageUrl}
          alt={trip.title}
          ratio="aspect-[16/10] sm:aspect-[21/9]"
          priority
          overlay={
            <>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate/80 via-slate/10 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-label-md text-primary-container shadow-layer-2 backdrop-blur"
                >
                  <ArrowLeft className="size-4" />
                  Volver
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    aria-label="Compartir viaje"
                    className="grid size-11 place-items-center rounded-[12px] bg-white/90 text-primary-container shadow-layer-2 backdrop-blur transition active:scale-95"
                  >
                    <Share2 className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
                    aria-pressed={favorite}
                    onClick={() =>
                      toggleFavorite.mutate(
                        { tripId: trip.id, favorite },
                        {
                          onError: () => showToast("No se pudo actualizar favoritos.", "error"),
                          onSuccess: () =>
                            showToast(
                              favorite ? "Viaje quitado de favoritos." : "Viaje guardado en favoritos.",
                              "success",
                            ),
                        },
                      )
                    }
                    className="grid size-11 place-items-center rounded-[12px] bg-white/90 text-primary-container shadow-layer-2 backdrop-blur transition active:scale-95"
                  >
                    <Heart className={cn("size-5", favorite && "fill-emerald text-emerald")} />
                  </button>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/90 text-primary-container">
                    <Bus className="size-3.5" />
                    {transportLabel(trip.transportType)}
                  </Badge>
                  {trip.category ? (
                    <Badge className="bg-secondary text-white">{trip.category}</Badge>
                  ) : null}
                  {!trip.isActive ? <Badge tone="cancelled">Viaje pausado</Badge> : null}
                  {trip.finalized ? <Badge tone="neutral">Finalizado</Badge> : null}
                </div>
                <h1 className="mt-2 max-w-3xl text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[38px]">
                  {trip.title}
                </h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-body-md text-white/90">
                  <MapPin className="size-4" />
                  {trip.destination}
                </p>
              </div>
            </>
          }
        />
      </div>

      {closed ? (
        <div className="flex items-start gap-3 rounded-[16px] border border-pending bg-pending/60 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-[#78350F]" />
          <div>
            <p className="text-title-md text-[#78350F]">Las reservas para este viaje están cerradas</p>
            <p className="text-body-sm text-[#78350F]/80">
              Cerró el {formatDateLong(trip.bookingDeadline ?? trip.startDate)}. Escríbenos por
              WhatsApp si necesitas ayuda.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] bg-white p-4 shadow-layer-1">
              <p className="text-label-md text-on-surface-variant">Salida</p>
              <p className="mt-1 text-title-md first-letter:uppercase text-on-surface">
                {formatTripDetailDate(trip.startDate)}
              </p>
            </div>
            <div className="rounded-[16px] bg-white p-4 shadow-layer-1">
              <p className="text-label-md text-on-surface-variant">Regreso</p>
              <p className="mt-1 text-title-md first-letter:uppercase text-on-surface">
                {formatTripDetailDate(trip.endDate)}
              </p>
            </div>
            <div className="rounded-[16px] bg-white p-4 shadow-layer-1">
              <p className="text-label-md text-on-surface-variant">Duración</p>
              <p className="mt-1 text-title-md text-on-surface">
                {days} {days === 1 ? "día" : "días"} · {transportLabel(trip.transportType)}
              </p>
            </div>
          </div>

          <SectionCard title="Acerca de este viaje" icon={<Sparkles className="size-5" />}>
            <RichText text={trip.description} />
            {!trip.description ? (
              <p className="text-body-md text-on-surface-variant">
                Una experiencia curada por Proxima Parada Tours. Escríbenos si quieres más
                detalles del itinerario.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                <MessageCircle className="size-4" />
                Preguntar por WhatsApp
              </a>
              <Link to={`/trips/${trip.id}/map`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                <MapPin className="size-4" />
                Mapa e itinerario
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            title="Horarios e itinerario"
            subtitle="Todo lo que necesitas para planear tu salida"
            icon={<CalendarDays className="size-5" />}
            action={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadTripIcs(trip)}>
                  <CalendarPlus className="size-4" />
                  <span className="hidden sm:inline">Calendario</span>
                </Button>
              </div>
            }
          >
            <div className="space-y-0">
              <TimelineRow
                icon={<Clock3 className="size-4" />}
                title="Salida"
                value={formatDateTime(trip.startDate)}
                tone="start"
              />
              <TimelineRow
                icon={<MapPin className="size-4" />}
                title="Destino"
                value={trip.destination}
              />
              <TimelineRow
                icon={<Clock3 className="size-4" />}
                title="Regreso estimado"
                value={formatDateTime(trip.endDate)}
              />
              <TimelineRow
                icon={<Ticket className="size-4" />}
                title="Cierre de reservas"
                value={formatDateLong(trip.bookingDeadline ?? trip.startDate)}
                tone="end"
              />
            </div>
            {(trip.pointsOfInterest ?? []).length ? (
              <div className="mt-4 rounded-[14px] bg-surface-container-low p-4">
                <p className="text-label-md text-on-surface-variant">Paradas del itinerario</p>
                <ol className="mt-2 space-y-2">
                  {(trip.pointsOfInterest ?? []).slice(0, 5).map((poi, index) => (
                    <li key={poi.id} className="flex items-start gap-2.5 text-body-md text-on-surface">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span>
                        <strong className="font-semibold">{poi.name ?? `Parada ${index + 1}`}</strong>
                        {poi.description ? (
                          <span className="block text-body-sm text-on-surface-variant">
                            {poi.description}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  to={`/trips/${trip.id}/map`}
                  className="mt-3 inline-flex items-center gap-1 text-label-md text-secondary hover:underline"
                >
                  Ver mapa completo
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={googleCalendarHref(trip)}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                <CalendarPlus className="size-4" />
                Google Calendar
              </a>
            </div>
          </SectionCard>

          <SectionCard
            title={useOptions ? "Opciones de viaje" : "Selección de asientos"}
            subtitle={
              useOptions
                ? "Elige cuántos boletos de cada opción quieres reservar"
                : "Elige cuántos adultos y niños viajan"
            }
            icon={<Users className="size-5" />}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between text-label-md text-on-surface-variant">
                <span>
                  {available} de {capacity} asientos disponibles
                </span>
                <span>{sold} confirmados</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-secondary"
                  style={{ width: `${capacity ? Math.min(100, (available / capacity) * 100) : 0}%` }}
                />
              </div>
              {available > 0 && available <= 3 ? (
                <p className="mt-1.5 text-label-md text-amber">
                  ¡Últimos {available} lugares disponibles!
                </p>
              ) : null}
            </div>

            {!trip.isActive ? (
              <div className="rounded-[14px] bg-error-container p-4 text-body-md text-on-error-container">
                Este viaje está pausado y no acepta nuevas reservas. Tu reserva existente sigue
                vigente.
              </div>
            ) : closed ? (
              <div className="rounded-[14px] bg-pending p-4 text-body-md text-[#78350F]">
                Las reservas cerraron. Escríbenos para revisar opciones.
              </div>
            ) : available <= 0 ? (
              <div className="rounded-[14px] bg-surface-container-low p-4">
                <p className="text-title-md text-on-surface">Sin cupo por ahora</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Déjanos tus datos y te avisamos si se libera o amplía el cupo.
                </p>
                <div className="mt-3 space-y-3">
                  <label className="block text-label-md text-on-surface-variant">
                    Asientos que necesitas
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={capacitySeats}
                      onChange={(event) => setCapacitySeats(Math.max(1, Number(event.target.value) || 1))}
                      className="mt-1 h-11 w-full rounded-lg border-[1.5px] border-input-border bg-white px-3 text-body-md outline-none focus:border-emerald"
                    />
                  </label>
                  <TextArea
                    label="Mensaje (opcional)"
                    value={capacityMessage}
                    maxLength={1000}
                    onChange={(event) => setCapacityMessage(event.target.value)}
                    placeholder="Cuéntanos cuántos viajan y si hay fechas flexibles."
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    loading={capacityMutation.isPending}
                    onClick={() =>
                      capacityMutation.mutate({
                        tripId: trip.id,
                        seats: capacitySeats,
                        message: capacityMessage.trim() || null,
                      })
                    }
                  >
                    Solicitar más cupo
                  </Button>
                </div>
              </div>
            ) : useOptions ? (
              <div className="space-y-3">
                {options.map((option) => {
                  const line = optionSelection[option.id] ?? { adults: 0, children: 0 };
                  const lineSeats = line.adults + line.children;
                  const remaining = Math.max(0, available - (optionSeats - lineSeats));
                  const benefitLines = (option.benefits ?? "")
                    .split("\n")
                    .map((lineText) => lineText.replace(/\*\*/g, "").trim())
                    .filter(Boolean)
                    .slice(0, 3);
                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "rounded-[16px] border-[1.5px] p-4 transition",
                        lineSeats > 0
                          ? "border-emerald bg-mint/30"
                          : "border-input-border bg-white",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-title-md text-on-surface">{option.name}</p>
                            {option.isBase ? <Badge>Base</Badge> : null}
                          </div>
                          {option.description ? (
                            <p className="mt-0.5 text-body-sm text-on-surface-variant">
                              {option.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-price-display text-primary-container">
                            {formatMxn(option.priceAdult)}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">adulto</p>
                        </div>
                      </div>
                      {benefitLines.length ? (
                        <ul className="mt-2 space-y-1">
                          {benefitLines.map((benefit) => (
                            <li key={benefit} className="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
                              <Check className="mt-0.5 size-3.5 shrink-0 text-secondary" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Counter
                          label="Adultos"
                          hint="Mayor de 12 años"
                          price={formatMxn(option.priceAdult)}
                          value={line.adults}
                          max={Math.max(0, remaining - line.children)}
                          onChange={(next) => updateOption(option.id, "adults", next)}
                        />
                        <Counter
                          label="Niños"
                          hint={option.priceChild != null ? "De 0 a 11 años" : "Tarifa de adulto"}
                          price={formatMxn(option.priceChild ?? option.priceAdult)}
                          value={line.children}
                          max={Math.max(0, remaining - line.adults)}
                          onChange={(next) => updateOption(option.id, "children", next)}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-label-md text-on-surface-variant">
                  {optionSeats} asiento{optionSeats === 1 ? "" : "s"} seleccionado
                  {optionSeats === 1 ? "" : "s"} · {available} disponibles
                </p>
                {optionSeats === 0 ? (
                  <p className="rounded-lg bg-pending px-3 py-2 text-body-sm text-[#78350F]">
                    Agrega al menos un boleto para continuar.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <Counter
                  label="Adultos"
                  hint="Mayor de 12 años"
                  price={formatMxn(trip.price)}
                  value={adults}
                  min={1}
                  max={remainingForAdults}
                  onChange={setAdults}
                />
                <div className="h-px bg-surface-container-high" />
                <Counter
                  label="Niños"
                  hint={trip.childPrice != null ? "De 0 a 11 años" : "Tarifa de adulto"}
                  price={formatMxn(trip.childPrice ?? trip.price)}
                  value={children}
                  max={remainingForChildren}
                  onChange={setChildren}
                />
                <p className="text-label-md text-on-surface-variant">
                  {totalSeats} asiento{totalSeats === 1 ? "" : "s"} seleccionado
                  {totalSeats === 1 ? "" : "s"} · {available} disponibles
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="¿Tienes necesidades especiales?"
            subtitle="Nos ayuda a preparar tu viaje con anticipación"
            icon={<ShieldCheck className="size-5" />}
          >
            <Switch
              checked={needsEnabled}
              onChange={setNeedsEnabled}
              label="Sí, necesito apoyo especial"
              description="Silla de ruedas, alergias, movilidad reducida o cualquier detalle importante."
            />
            {needsEnabled ? (
              <div className="mt-3">
                <TextArea
                  label="Cuéntanos qué necesitas"
                  value={needsNote}
                  maxLength={500}
                  onChange={(event) => setNeedsNote(event.target.value)}
                  placeholder="Ej. Viajo con silla de ruedas plegable y necesito espacio extra."
                  hint={`${needsNote.length}/500 caracteres`}
                />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Políticas de reserva y cancelación" icon={<Info className="size-5" />}>
            <ul className="space-y-2 text-body-md text-on-surface-variant">
              <li className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-secondary" />
                <span>
                  Tu lugar se confirma al completar el pago. Puedes apartar y liquidar antes de la
                  salida.
                </span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-secondary" />
                <span>
                  {trip.cancellationDaysLimit == null
                    ? "Cancelación flexible: reembolso del 100% de lo abonado."
                    : `Cancelación con reembolso del 100% hasta ${trip.cancellationDaysLimit} días antes de la salida; después se retiene el 30% de lo abonado.`}
                </span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-secondary" />
                <span>
                  Una vez iniciada la salida o finalizado el viaje no es posible cancelar.
                </span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-secondary" />
                <span>Cada pasajero recibe su propio código QR para el check-in.</span>
              </li>
            </ul>
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          {canBook ? (
            <div className="rounded-card border border-white bg-white p-5 shadow-layer-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-label-md text-on-surface-variant">Desde</p>
                  <p className="text-headline-lg text-primary-container">
                    {formatMxn(displayPrice(trip))}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">por persona</p>
                </div>
                <Badge tone={available <= 3 ? "pending" : "confirmed"}>
                  {available} lugares
                </Badge>
              </div>

              <div className="mt-4 space-y-2 rounded-[14px] bg-surface-container-low p-3 text-body-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Asientos seleccionados</span>
                  <span className="font-semibold text-on-surface">{totalSeats}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Disponibles</span>
                  <span className="font-semibold text-on-surface">{available}</span>
                </div>
                {trip.bookingDeadline ? (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Cierran reservas</span>
                    <span className="font-semibold text-on-surface">
                      {formatShortDate(trip.bookingDeadline)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-surface-container-high pt-3">
                <span className="text-label-md text-on-surface-variant">Total estimado</span>
                <span className="text-price-display text-primary-container">
                  {formatMxn(baseTotal)}
                </span>
              </div>

              <div className="mt-3 hidden md:block">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleReserve}
                  disabled={totalSeats === 0}
                >
                  <Ticket className="size-4" />
                  Reservar asientos
                </Button>
              </div>
              <p className="mt-2 hidden text-center text-body-sm text-on-surface-variant md:block">
                Elige tus asientos y pasajeros en el siguiente paso.
              </p>
            </div>
          ) : (
            <div className="rounded-card bg-white p-5 shadow-layer-1">
              <p className="text-headline-sm text-on-surface">
                {closed ? "Reservas cerradas" : "Sin cupo por ahora"}
              </p>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {closed
                  ? "Este viaje ya no acepta nuevas reservas."
                  : "Puedes solicitar más cupo y te avisamos si se abre."}
              </p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonClasses({ variant: "secondary", size: "md" }), "mt-3 w-full")}
              >
                <MessageCircle className="size-4" />
                Escribir a la agencia
              </a>
            </div>
          )}

          <div className="rounded-card bg-primary-container p-5 text-white shadow-layer-1">
            <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.1em] text-mint">
              <Sparkles className="size-3.5" />
              Viaje con confianza
            </p>
            <h3 className="mt-1 text-headline-sm">Operación local, trato cercano</h3>
            <p className="mt-1 text-body-sm text-mint/80">
              Guías certificados, seguro de viaje y atención directa antes, durante y después
              de tu salida.
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClasses({ variant: "secondary", size: "sm" }), "mt-3")}
            >
              <MessageCircle className="size-4" />
              Hablar con un asesor
            </a>
          </div>

          {isCancellationAvailable(trip) ? (
            <p className="px-1 text-body-sm text-on-surface-variant">
              Cancelación sujeta a la política del viaje. El reembolso se abona a tu saldo.
            </p>
          ) : null}
        </aside>
      </div>

      {canBook ? (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-surface-container-high bg-white/95 px-4 py-2.5 shadow-layer-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-body-sm text-on-surface-variant">
                {totalSeats} asiento{totalSeats === 1 ? "" : "s"}
              </p>
              <p className="text-price-display text-primary-container">{formatMxn(baseTotal)}</p>
            </div>
            <Button size="md" onClick={handleReserve} disabled={totalSeats === 0}>
              Reservar
            </Button>
          </div>
        </div>
      ) : null}

      {session ? null : (
        <p className="text-center text-body-sm text-on-surface-variant">
          Inicia sesión para completar tu reserva.
        </p>
      )}
    </div>
  );
}

function TimelineRow({
  icon,
  title,
  value,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  tone?: "start" | "end";
}) {
  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-0.5 grid size-8 place-items-center rounded-full",
            tone === "start"
              ? "bg-secondary text-white"
              : tone === "end"
                ? "bg-primary-container text-white"
                : "bg-mint text-primary-container",
          )}
        >
          {icon}
        </span>
        <span className="mt-1 w-px flex-1 bg-surface-container-high last:hidden" aria-hidden="true" />
      </div>
      <div className="pb-1">
        <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">{title}</p>
        <p className="text-title-md first-letter:uppercase text-on-surface">{value}</p>
      </div>
    </div>
  );
}
