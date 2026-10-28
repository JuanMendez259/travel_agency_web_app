import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  MapPin,
  MessageCircle,
  QrCode as QrIcon,
  Receipt,
  Star,
  Ticket,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  cancelBooking,
  cancelTicket,
  getBooking,
  payWithWallet,
} from "@/features/bookings/api";
import { getMyRating, getTransport } from "@/features/trips/api";
import { getWallet } from "@/features/profile/api";
import { errorMessage } from "@/shared/api/client";
import type { PaymentMethod } from "@/shared/api/types";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Select, TextArea } from "@/shared/components/ui/Form";
import { CoverImage, PageLoader, RichText } from "@/shared/components/ui/Media";
import { Modal } from "@/shared/components/ui/Modal";
import { QrCode } from "@/shared/components/ui/QrCode";
import { SectionCard } from "@/shared/components/ui/Section";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/shared/components/ui/StatusBadge";
import { StarRating } from "@/shared/components/ui/StarRating";
import { useToast } from "@/shared/components/ui/Toast";
import { AGENCY } from "@/shared/lib/agency";
import { formatBookingDate, formatDateTime, formatShortDate } from "@/shared/lib/dates";
import {
  isWithinPolicy,
  paidAmount,
  penaltyFor,
  pendingAmount,
  refundFor,
} from "@/shared/lib/booking";
import { formatMxn, minMoney, toDecimal } from "@/shared/lib/money";
import { isCancellationAvailable, transportLabel } from "@/shared/lib/trip";
import { cn } from "@/shared/lib/cn";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

const methodLabels: Record<PaymentMethod, string> = {
  CreditCard: "Tarjeta de crédito",
  DebitCard: "Tarjeta de débito",
  BankTransfer: "Transferencia bancaria",
  Cash: "Efectivo",
  PayPal: "PayPal",
  MercadoPago: "Mercado Pago",
  Wallet: "Saldo a favor",
};

export function BookingDetailPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const { session } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const createdToast = useRef(false);

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  const booking = bookingQuery.data;
  const trip = booking?.trip ?? null;

  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const transportQuery = useQuery({
    queryKey: ["transport", trip?.id],
    queryFn: () => getTransport(trip!.id),
    enabled: Boolean(trip?.id),
    retry: false,
  });
  const ratingQuery = useQuery({
    queryKey: ["myRating", trip?.id],
    queryFn: () => getMyRating(trip!.id),
    enabled: Boolean(trip?.finalized && trip?.id),
  });

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketPassengerId, setTicketPassengerId] = useState("");
  const [ticketItemId, setTicketItemId] = useState("");
  const [ticketReason, setTicketReason] = useState("");
  const [ticketError, setTicketError] = useState<string | null>(null);

  useDocumentTitle(booking ? `Reserva #${booking.id}` : "Mi reserva");

  useEffect(() => {
    if (params.get("created") === "1" && !createdToast.current) {
      createdToast.current = true;
      showToast("¡Reserva creada! Tu asiento quedó apartado.", "success");
      setParams({}, { replace: true });
    }
  }, [params, setParams, showToast]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    if (trip?.id) {
      void queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
      void queryClient.invalidateQueries({ queryKey: ["seats", trip.id] });
    }
  };

  const payMutation = useMutation({
    mutationFn: (amount: number) => payWithWallet(bookingId, amount),
    onSuccess: () => {
      setPayOpen(false);
      setPayError(null);
      invalidate();
      showToast("Pago con saldo registrado.", "success");
    },
    onError: (error) => {
      const message = errorMessage(error);
      setPayError(message);
      showToast(message, "error");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelBooking(bookingId, reason),
    onSuccess: (result) => {
      setCancelOpen(false);
      setCancelReason("");
      invalidate();
      showToast(
        Number(result.refundAmount) > 0
          ? `Reserva cancelada. Reembolso a saldo: ${formatMxn(result.refundAmount)}.`
          : "Reserva cancelada. No se generó saldo a favor.",
        "success",
      );
    },
    onError: (error) => {
      const message = errorMessage(error);
      setCancelError(message);
      showToast(message, "error");
    },
  });

  const ticketMutation = useMutation({
    mutationFn: (vars: { passengerId: number; itemId?: number; reason: string }) =>
      cancelTicket(bookingId, {
        passengerId: vars.passengerId,
        bookingItemId: vars.itemId ?? null,
        reason: vars.reason,
      }),
    onSuccess: (result) => {
      setTicketOpen(false);
      setTicketReason("");
      invalidate();
      showToast(
        `Boleto cancelado. Se acreditaron ${formatMxn(result.refundAmount)} a tu saldo.`,
        "success",
      );
    },
    onError: (error) => {
      const message = errorMessage(error);
      setTicketError(message);
      showToast(message, "error");
    },
  });

  if (!Number.isFinite(bookingId)) {
    return <EmptyState title="Reserva no encontrada" description="El enlace no es válido." />;
  }
  if (bookingQuery.isLoading) return <PageLoader label="Cargando tu reserva…" />;
  if (bookingQuery.isError || !booking) {
    return (
      <ErrorState
        message={errorMessage(bookingQuery.error) || "No encontramos esta reserva."}
        onRetry={() => void bookingQuery.refetch()}
      />
    );
  }

  const paid = paidAmount(booking);
  const pending = pendingAmount(booking);
  const settled = toDecimal(pending).lte(0);
  const cancelled = booking.status === "Cancelled";
  const cancelledByAgency =
    cancelled &&
    booking.cancelledByUserId != null &&
    booking.cancelledByUserId !== booking.userId;
  const refundTotal = toDecimal(booking.refundTotal ?? 0);
  const walletAvailable = toDecimal(walletQuery.data?.available ?? 0);
  const walletMax = toDecimal(minMoney(walletAvailable, pending));
  const withinPolicy = trip
    ? isWithinPolicy(trip.startDate, new Date(), trip.cancellationDaysLimit)
    : true;
  const estimatedPenalty = penaltyFor(paid, withinPolicy);
  const estimatedRefund = refundFor(paid, withinPolicy);
  const passengers = booking.passengers ?? [];
  const items = booking.items ?? [];
  const slots = Math.max(0, booking.numberOfSeats - 1 - passengers.length);
  const progress = Math.min(
    100,
    toDecimal(booking.totalAmount).gt(0)
      ? toDecimal(paid).div(booking.totalAmount).times(100).toNumber()
      : 0,
  );
  const transport = transportQuery.data ?? null;
  const canCancel = Boolean(trip && !cancelled && isCancellationAvailable(trip));
  const myRating = ratingQuery.data ?? null;
  const distinctItems = new Set(items.map((item) => item.tripOptionId)).size;

  const openPay = () => {
    setPayError(null);
    setPayAmount(walletMax.toNumber().toFixed(2));
    setPayOpen(true);
  };

  const submitPay = () => {
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Indica un monto mayor a cero.");
      return;
    }
    if (toDecimal(amount).gt(walletMax)) {
      setPayError("El monto supera tu saldo disponible o el saldo pendiente.");
      return;
    }
    payMutation.mutate(Number(amount.toFixed(2)));
  };

  const submitCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError("Indica el motivo de la cancelación.");
      return;
    }
    cancelMutation.mutate(cancelReason.trim());
  };

  const submitTicket = () => {
    if (!ticketPassengerId) {
      setTicketError("Selecciona al pasajero que quieres cancelar.");
      return;
    }
    if (!ticketReason.trim()) {
      setTicketError("Indica el motivo de la cancelación.");
      return;
    }
    if (items.length > 1 && !ticketItemId) {
      setTicketError("Selecciona la opción a la que pertenece el boleto.");
      return;
    }
    ticketMutation.mutate({
      passengerId: Number(ticketPassengerId),
      itemId: ticketItemId ? Number(ticketItemId) : undefined,
      reason: ticketReason.trim(),
    });
  };

  const whatsappHref = `https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(
    `Hola, necesito ayuda con mi reserva #${booking.id} para "${trip?.title ?? "un viaje"}".`,
  )}`;

  return (
    <div className="space-y-5">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant hover:text-primary-container"
      >
        <ArrowLeft className="size-4" />
        Mis viajes
      </Link>

      <div className="overflow-hidden rounded-[24px] bg-white shadow-layer-1">
        <div className="relative">
          <CoverImage
            src={trip?.imageUrl}
            alt={trip?.title ?? "Viaje"}
            ratio="aspect-[16/9] sm:aspect-[21/8]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate/75 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 text-white sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <BookingStatusBadge status={booking.status} />
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-label-md text-primary-container">
                  Reserva #{booking.id}
                </span>
              </div>
              <h1 className="mt-2 text-[26px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[34px]">
                {trip?.title ?? "Tu viaje"}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1.5 text-body-md text-white/90">
                <MapPin className="size-4" />
                {trip?.destination ?? "Destino por confirmar"}
              </p>
            </div>
            <div className="rounded-[14px] bg-white/95 px-3 py-2 text-right text-on-surface shadow-layer-2">
              <p className="text-label-sm text-on-surface-variant">Total</p>
              <p className="text-price-display text-primary-container">
                {formatMxn(booking.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section
            className={cn(
              "rounded-card border p-4 shadow-layer-1 sm:p-5",
              cancelled
                ? "border-error/20 bg-error-container"
                : settled
                  ? "border-secondary/20 bg-confirmed"
                  : "border-amber/30 bg-pending/50",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  Estado de tu reserva
                </p>
                <p className="mt-0.5 text-headline-sm text-on-surface">
                  {cancelled
                    ? "Reserva cancelada"
                    : settled
                      ? "Liquidado · ¡Reserva confirmada!"
                      : "Pago pendiente"}
                </p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {cancelled
                    ? refundTotal.gt(0)
                      ? cancelledByAgency
                        ? `La agencia canceló el viaje. El 100% de lo abonado (${formatMxn(refundTotal)}) está en tu monedero.`
                        : `Saldo a favor: ${formatMxn(refundTotal)}. Ya está disponible en tu monedero.`
                      : "Esta reserva fue cancelada y no generó saldo a favor."
                    : settled
                      ? `Pagaste ${formatMxn(paid)} del total. Tu lugar está confirmado.`
                      : `Pagado ${formatMxn(paid)} de ${formatMxn(booking.totalAmount)} · Saldo pendiente ${formatMxn(pending)}`}
                </p>
              </div>
              {!cancelled ? (
                <div className="text-right">
                  <p className="text-label-sm text-on-surface-variant">Saldo pendiente</p>
                  <p className="text-price-display text-primary-container">{formatMxn(pending)}</p>
                </div>
              ) : null}
            </div>
            {!cancelled ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-secondary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            {!cancelled && !settled ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={openPay}
                  disabled={walletAvailable.lte(0)}
                >
                  <Wallet className="size-4" />
                  Pagar con mi saldo
                </Button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "outline", size: "md" })}
                >
                  <MessageCircle className="size-4" />
                  Coordinar pago
                </a>
              </div>
            ) : null}
            {settled && !cancelled ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-body-sm text-on-secondary-container">
                <CheckCircle2 className="size-4" />
                Reserva liquidada. Tu código QR ya está activo.
              </p>
            ) : null}
          </section>

          {cancelled ? (
            <SectionCard title="Tu reserva fue cancelada" icon={<XCircle className="size-5 text-error" />}>
              <p className="text-body-md text-on-surface-variant">
                {cancelledByAgency
                  ? "La agencia canceló el viaje."
                  : "Cancelaste esta reserva."}{" "}
                {booking.cancelledAt ? `El ${formatDateTime(booking.cancelledAt)}.` : ""}
              </p>
              <p className="mt-2 text-body-md text-on-surface-variant">
                {refundTotal.gt(0)
                  ? cancelledByAgency
                    ? `El 100% de lo abonado (${formatMxn(refundTotal)}) está en tu monedero. Puedes usarlo en otro viaje o solicitar el reembolso.`
                    : `Se acreditaron ${formatMxn(refundTotal)} a tu saldo a favor.`
                  : "No se generó reembolso para esta reserva."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {refundTotal.gt(0) ? (
                  <Link
                    to="/profile#billetera"
                    className={buttonClasses({ variant: "primary", size: "md" })}
                  >
                    <Wallet className="size-4" />
                    Ver saldo y solicitar reembolso
                  </Link>
                ) : null}
                <Link
                  to="/bookings"
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                >
                  Ver mis viajes
                </Link>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="Mi código QR"
              subtitle="Preséntalo en el check-in de tu salida"
              icon={<QrIcon className="size-5" />}
              action={
                <BookingStatusBadge status={booking.status} />
              }
            >
              <div className="flex flex-col items-start gap-5 sm:flex-row">
                <div className="mx-auto sm:mx-0">
                  <QrCode
                    value={booking.qrToken}
                    size={196}
                    label={`Reserva #${booking.id}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                    Titular
                  </p>
                  <p className="text-headline-sm text-on-surface">
                    {booking.user?.name ?? session?.name}
                  </p>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {booking.numberOfSeats} asiento{booking.numberOfSeats === 1 ? "" : "s"}
                    {booking.seatNumber ? ` · Asiento del titular #${booking.seatNumber}` : ""}
                  </p>
                  <div className="mt-3 space-y-2">
                    {passengers.map((passenger) => (
                      <div
                        key={passenger.id}
                        className="flex items-center justify-between gap-2 rounded-[12px] bg-surface-container-low px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body-md text-on-surface">{passenger.name}</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {passenger.isChild ? "Niño" : "Adulto"}
                            {passenger.seatNumber ? ` · Asiento ${passenger.seatNumber}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0">
                          {passenger.checkedIn ? (
                            <span className="text-label-md text-secondary">Abordó</span>
                          ) : (
                            <span className="text-label-md text-outline">Sin abordar</span>
                          )}
                        </span>
                      </div>
                    ))}
                    {passengers.length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant">
                        No hay acompañantes registrados en esta reserva.
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {passengers.length ? (
                      <Link
                        to={`/bookings/${booking.id}/qr`}
                        className={buttonClasses({ variant: "secondary", size: "sm" })}
                      >
                        <QrIcon className="size-4" />
                        Ver QR de acompañantes ({passengers.length})
                      </Link>
                    ) : null}
                    {slots > 0 ? (
                      <Link
                        to={`/bookings/${booking.id}/passengers/add`}
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        <UserPlus className="size-4" />
                        Agregar acompañantes ({slots})
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Acerca de este viaje" icon={<Bus className="size-5" />}>
            <RichText text={trip?.description} clamp={3} />
            {!trip?.description ? (
              <p className="text-body-md text-on-surface-variant">
                Escríbenos si quieres más detalles del itinerario.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Horarios e itinerario" icon={<CalendarDays className="size-5" />}>
            <div className="space-y-2.5">
              <InfoRow icon={<Clock3 className="size-4" />} label="Salida" value={trip ? formatDateTime(trip.startDate) : "Por confirmar"} />
              <InfoRow icon={<Clock3 className="size-4" />} label="Regreso" value={trip ? formatDateTime(trip.endDate) : "Por confirmar"} />
              <InfoRow
                icon={<MapPin className="size-4" />}
                label="Destino"
                value={trip?.destination ?? "Por confirmar"}
              />
              <InfoRow
                icon={<Ticket className="size-4" />}
                label="Reservaste el"
                value={formatBookingDate(booking.bookingDate)}
              />
            </div>
            {trip ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/trips/${trip.id}/map`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                  <MapPin className="size-4" />
                  Mapa e itinerario
                </Link>
                <Link to={`/trips/${trip.id}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                  Ver viaje
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            ) : null}
            {(trip?.pointsOfInterest ?? []).length ? (
              <ol className="mt-4 space-y-2 border-t border-surface-container-high pt-3">
                {(trip?.pointsOfInterest ?? []).map((poi, index) => (
                  <li key={poi.id} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-body-md text-on-surface">{poi.name ?? `Parada ${index + 1}`}</p>
                      {poi.description ? (
                        <p className="text-body-sm text-on-surface-variant">{poi.description}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Transporte"
            subtitle={trip ? transportLabel(trip.transportType) : undefined}
            icon={<Bus className="size-5" />}
          >
            {transport?.imageUrl ? (
              <div className="overflow-hidden rounded-[14px]">
                <img
                  src={transport.imageUrl}
                  alt="Unidad del viaje"
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-body-md">
              <span className="text-on-surface-variant">
                {transport?.plate ? `Placas: ${transport.plate}` : "Placas por confirmar"}
              </span>
              <span className="rounded-full bg-mint px-2.5 py-1 text-label-md text-primary-container">
                {trip ? transportLabel(trip.transportType) : "Transporte"}
              </span>
            </div>
            {!transport?.imageUrl && !transport?.plate ? (
              <p className="mt-2 text-body-sm text-on-surface-variant">
                La información de la unidad se actualizará pronto. Te avisaremos por aquí.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Detalle y costo" icon={<Receipt className="size-5" />}>
            <div className="space-y-2 text-body-md">
              {items.length ? (
                <>
                  <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                    Detalle por opciones
                  </p>
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-on-surface">{item.optionName ?? "Opción"}</p>
                        <p className="text-body-sm text-on-surface-variant">
                          {item.adults} adulto{item.adults === 1 ? "" : "s"}
                          {item.children > 0
                            ? ` · ${item.children} niño${item.children === 1 ? "" : "s"}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-on-surface">
                        {formatMxn(
                          toDecimal(item.unitPriceAdult)
                            .times(item.adults)
                            .plus(toDecimal(item.unitPriceChild ?? item.unitPriceAdult).times(item.children)),
                        )}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    {booking.numberOfSeats} asiento{booking.numberOfSeats === 1 ? "" : "s"}
                    {booking.seatNumber ? ` · Titular #${booking.seatNumber}` : ""}
                  </span>
                  <span className="text-on-surface">{formatMxn(booking.totalAmount)}</span>
                </div>
              )}
              {toDecimal(booking.discountAmount).gt(0) ? (
                <div className="flex justify-between text-secondary">
                  <span>
                    Descuento {booking.discountCode ? `(${booking.discountCode})` : ""}
                  </span>
                  <span>-{formatMxn(booking.discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-surface-container-high pt-2">
                <span className="font-semibold text-on-surface">Total</span>
                <span className="text-price-display text-primary-container">
                  {formatMxn(booking.totalAmount)}
                </span>
              </div>
              {cancelled ? (
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>Reembolso a saldo</span>
                  <span>{formatMxn(refundTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-body-sm text-on-surface-variant">
                    <span>Pagado</span>
                    <span>{formatMxn(paid)}</span>
                  </div>
                  <div className="flex justify-between text-body-sm text-on-surface-variant">
                    <span>Saldo pendiente</span>
                    <span>{formatMxn(pending)}</span>
                  </div>
                </>
              )}
            </div>
            {booking.specialNeedsNote ? (
              <div className="mt-3 rounded-[12px] bg-pending/60 p-3">
                <p className="text-label-md text-[#78350F]">Necesidades especiales</p>
                <p className="mt-1 text-body-sm text-[#78350F]">{booking.specialNeedsNote}</p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Mis pagos" icon={<Wallet className="size-5" />}>
            {(booking.payments ?? []).length ? (
              <div className="space-y-2">
                {(booking.payments ?? []).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2.5"
                  >
                    <div>
                      <p className="text-body-md text-on-surface">
                        {formatMxn(payment.amount)} · {methodLabels[payment.method] ?? payment.method}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {formatDateTime(payment.paymentDate)}
                        {payment.transactionReference ? ` · ${payment.transactionReference}` : ""}
                      </p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                Aún no hay pagos registrados. Puedes pagar con tu saldo a favor o coordinar con la
                agencia.
              </p>
            )}
            {!cancelled && !settled ? (
              <Button
                variant="secondary"
                size="md"
                className="mt-3"
                onClick={openPay}
                disabled={walletAvailable.lte(0)}
              >
                <Wallet className="size-4" />
                Realizar pago con saldo
              </Button>
            ) : null}
          </SectionCard>

          {trip?.finalized && !cancelled ? (
            <SectionCard title="Califica tu experiencia" icon={<Star className="size-5" />}>
              {myRating ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating value={myRating.rating} />
                    <Link
                      to={`/trips/${trip.id}/rate`}
                      className={buttonClasses({ variant: "ghost", size: "sm" })}
                    >
                      Editar calificación
                    </Link>
                  </div>
                  {myRating.comment ? (
                    <p className="mt-2 text-body-md text-on-surface-variant">{myRating.comment}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="text-body-md text-on-surface-variant">
                    El viaje terminó. Cuéntanos cómo fue tu experiencia para seguir mejorando.
                  </p>
                  <Link
                    to={`/trips/${trip.id}/rate`}
                    className={cn(buttonClasses({ variant: "primary", size: "md" }), "mt-3")}
                  >
                    <Star className="size-4" />
                    Calificar viaje
                  </Link>
                </>
              )}
            </SectionCard>
          ) : null}

          {canCancel ? (
            <SectionCard
              title="Cancelar reserva o boletos"
              subtitle="Revisa la política antes de continuar"
              icon={<AlertTriangle className="size-5 text-amber" />}
            >
              <div className="rounded-[12px] bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                {withinPolicy ? (
                  <p>
                    Estás dentro de la política: se reembolsa el <strong>100%</strong> de lo abonado
                    a tu saldo.
                  </p>
                ) : (
                  <p>
                    Estás fuera de la política de cancelación: se retiene el <strong>30%</strong> de
                    lo abonado. Estimado a devolver: <strong>{formatMxn(estimatedRefund)}</strong>.
                  </p>
                )}
                <p className="mt-1">
                  El reembolso se acredita a tu saldo a favor; no se devuelve a la tarjeta.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="danger" size="md" onClick={() => setCancelOpen(true)}>
                  Cancelar reserva completa
                </Button>
                {passengers.length ? (
                  <Button variant="outline" size="md" onClick={() => setTicketOpen(true)}>
                    <XCircle className="size-4" />
                    Cancelar un boleto
                  </Button>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-card bg-white p-5 shadow-layer-1">
            <p className="text-label-sm uppercase tracking-wide text-secondary">Tu saldo</p>
            <p className="mt-1 text-headline-md text-primary-container">
              {walletQuery.isLoading ? "…" : formatMxn(walletAvailable)}
            </p>
            <p className="text-body-sm text-on-surface-variant">Disponible para tus próximos viajes</p>
            <Link to="/profile" className={cn(buttonClasses({ variant: "secondary", size: "sm" }), "mt-3")}>
              <Wallet className="size-4" />
              Ver mi monedero
            </Link>
          </div>

          <div className="rounded-card bg-primary-container p-5 text-white shadow-layer-1">
            <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.1em] text-mint">
              <Info className="size-3.5" />
              Soporte
            </p>
            <p className="mt-1 text-body-sm text-mint/80">
              Estamos para ayudarte con tu reserva, pagos o cancelaciones.
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClasses({ variant: "secondary", size: "sm" }), "mt-3")}
            >
              <MessageCircle className="size-4" />
              Escribir por WhatsApp
            </a>
          </div>

          {trip ? (
            <div className="rounded-card bg-white p-4 text-body-sm text-on-surface-variant shadow-layer-1">
              <p className="inline-flex items-center gap-1.5 text-label-md text-on-surface">
                <Users className="size-4 text-secondary" />
                {booking.numberOfSeats} asiento{booking.numberOfSeats === 1 ? "" : "s"}
              </p>
              <p className="mt-1">
                {distinctItems > 1
                  ? `${distinctItems} opciones distintas en esta reserva.`
                  : "Incluye titular y acompañantes registrados."}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatShortDate(trip.startDate)}
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Pagar con mi saldo"
        description="Se descontará de tu monedero y quedará registrado en la reserva."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" loading={payMutation.isPending} onClick={submitPay}>
              Pagar {formatMxn(payAmount || 0)}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-[12px] bg-surface-container-low p-3 text-body-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Saldo disponible</span>
              <span className="font-semibold text-on-surface">{formatMxn(walletAvailable)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-on-surface-variant">Saldo pendiente</span>
              <span className="font-semibold text-on-surface">{formatMxn(pending)}</span>
            </div>
          </div>
          <label className="block text-label-md text-on-surface-variant">
            Monto a pagar
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={walletMax.toNumber()}
              step="0.01"
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
              className="mt-1 h-[52px] w-full rounded-[12px] border-[1.5px] border-input-border bg-white px-4 text-title-md outline-none focus:border-emerald"
            />
          </label>
          <div className="flex justify-between text-body-sm text-on-surface-variant">
            <span>Máximo aplicable: {formatMxn(walletMax)}</span>
            <button
              type="button"
              className="text-secondary underline"
              onClick={() => setPayAmount(walletMax.toNumber().toFixed(2))}
            >
              Usar todo
            </button>
          </div>
          {walletAvailable.lte(0) ? (
            <p className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
              No tienes saldo disponible. Puedes coordinar el pago con la agencia.
            </p>
          ) : null}
          {payError ? (
            <p role="alert" className="text-body-sm text-error">
              {payError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar reserva completa"
        description="Esta acción libera tus asientos y acredita el reembolso a tu saldo."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={cancelMutation.isPending}
              onClick={submitCancel}
            >
              Confirmar cancelación
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-[12px] bg-surface-container-low p-3 text-body-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Abonado</span>
              <span className="font-semibold text-on-surface">{formatMxn(paid)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-on-surface-variant">Multa estimada</span>
              <span className="font-semibold text-on-surface">{formatMxn(estimatedPenalty)}</span>
            </div>
            <div className="mt-1 flex justify-between text-secondary">
              <span>Reembolso a saldo</span>
              <span className="font-semibold">{formatMxn(estimatedRefund)}</span>
            </div>
          </div>
          <TextArea
            label="Motivo de la cancelación"
            value={cancelReason}
            maxLength={500}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Cuéntanos por qué cancelas."
          />
          {cancelError ? (
            <p role="alert" className="text-body-sm text-error">
              {cancelError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Cancelar un boleto"
        description="Solo puedes cancelar el asiento de un acompañante. El titular se cancela con la reserva completa."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTicketOpen(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={ticketMutation.isPending}
              onClick={submitTicket}
            >
              Cancelar boleto
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Acompañante"
            value={ticketPassengerId}
            onChange={(event) => setTicketPassengerId(event.target.value)}
          >
            <option value="">Selecciona un pasajero</option>
            {passengers.map((passenger) => (
              <option key={passenger.id} value={passenger.id}>
                {passenger.name ?? `Pasajero ${passenger.id}`}
                {passenger.seatNumber ? ` · Asiento ${passenger.seatNumber}` : ""}
                {passenger.isChild ? " (niño)" : ""}
              </option>
            ))}
          </Select>
          {items.length > 1 ? (
            <Select
              label="Opción del boleto"
              value={ticketItemId}
              onChange={(event) => setTicketItemId(event.target.value)}
            >
              <option value="">Selecciona una opción</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.optionName ?? `Opción ${item.id}`}
                </option>
              ))}
            </Select>
          ) : null}
          <TextArea
            label="Motivo"
            value={ticketReason}
            maxLength={500}
            onChange={(event) => setTicketReason(event.target.value)}
            placeholder="Cuéntanos por qué cancelas este boleto."
          />
          <p className="rounded-lg bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant">
            El reembolso se calcula sobre lo abonado y se acredita a tu saldo, con la misma política
            del viaje.
          </p>
          {ticketError ? (
            <p role="alert" className="text-body-sm text-error">
              {ticketError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-secondary">{icon}</span>
      <div>
        <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="text-body-md first-letter:uppercase text-on-surface">{value}</p>
      </div>
    </div>
  );
}
