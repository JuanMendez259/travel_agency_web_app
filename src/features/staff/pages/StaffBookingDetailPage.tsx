import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileClock,
  Mail,
  Phone,
  QrCode,
  Receipt,
  Ticket,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  cancelTicket,
  getBooking,
  registerPayment,
  updateBookingStatus,
} from "@/features/bookings/api";
import type { PaymentMethod } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Select, TextArea, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { Modal } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/shared/components/ui/StatusBadge";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { paidAmount, pendingAmount } from "@/shared/lib/booking";
import { formatMxn, toDecimal } from "@/shared/lib/money";
import { formatBookingDate, formatDateTime } from "@/shared/lib/dates";
import { formatPhone, telHref, whatsappHref } from "@/shared/lib/phone";

const methods: Array<{ value: Exclude<PaymentMethod, "Wallet">; label: string }> = [
  { value: "Cash", label: "Efectivo" },
  { value: "BankTransfer", label: "Transferencia bancaria" },
  { value: "CreditCard", label: "Tarjeta de crédito" },
  { value: "DebitCard", label: "Tarjeta de débito" },
  { value: "MercadoPago", label: "Mercado Pago" },
  { value: "PayPal", label: "PayPal" },
];

export function StaffBookingDetailPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<Exclude<PaymentMethod, "Wallet">>("Cash");
  const [payReference, setPayReference] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketPassengerId, setTicketPassengerId] = useState("");
  const [ticketItemId, setTicketItemId] = useState("");
  const [ticketReason, setTicketReason] = useState("");
  const [ticketError, setTicketError] = useState<string | null>(null);

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  const booking = bookingQuery.data;
  const trip = booking?.trip;
  useDocumentTitle(booking ? `Reserva #${booking.id}` : "Reserva");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    void queryClient.invalidateQueries({ queryKey: ["allBookings"] });
    void queryClient.invalidateQueries({ queryKey: ["tripBookings"] });
    void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
    if (trip?.id) void queryClient.invalidateQueries({ queryKey: ["seats", trip.id] });
  };

  const payMutation = useMutation({
    mutationFn: (vars: { amount: number; method: Exclude<PaymentMethod, "Wallet">; reference: string | null }) =>
      registerPayment(bookingId, {
        amount: vars.amount,
        method: vars.method,
        transactionReference: vars.reference,
      }),
    onSuccess: () => {
      setPayOpen(false);
      setPayAmount("");
      setPayReference("");
      setPayError(null);
      invalidate();
      showToast("Pago registrado. Si liquidó el total, la reserva quedó confirmada.", "success");
    },
    onError: (error) => {
      const message = errorMessage(error);
      setPayError(message);
      showToast(message, "error");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateBookingStatus(bookingId, status),
    onSuccess: (_result, status) => {
      setCancelOpen(false);
      invalidate();
      showToast(
        status === "Cancelled"
          ? "Reserva cancelada por la agencia. No se generó reembolso automático."
          : "Estado de la reserva actualizado.",
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
      setTicketError(null);
      invalidate();
      showToast(`Boleto cancelado. Reembolso a saldo: ${formatMxn(result.refundAmount)}.`, "success");
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
  if (bookingQuery.isLoading) return <PageLoader label="Cargando reserva…" />;
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
  const items = booking.items ?? [];
  const passengers = booking.passengers ?? [];

  const openPay = () => {
    setPayError(null);
    setPayAmount(toDecimal(pending).toFixed(2));
    setPayMethod("Cash");
    setPayReference("");
    setPayOpen(true);
  };

  const submitPay = () => {
    setPayError(null);
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Indica un monto mayor a cero.");
      return;
    }
    if (toDecimal(amount).gt(pending)) {
      setPayError(`El monto supera el saldo pendiente (${formatMxn(pending)}).`);
      return;
    }
    payMutation.mutate({
      amount: Number(amount.toFixed(2)),
      method: payMethod,
      reference: payReference.trim() || null,
    });
  };

  const openTicket = (passengerId: number) => {
    setTicketPassengerId(String(passengerId));
    setTicketItemId(items.length === 1 ? String(items[0].id) : "");
    setTicketReason("");
    setTicketError(null);
    setTicketOpen(true);
  };

  const submitTicket = () => {
    setTicketError(null);
    if (!ticketPassengerId) {
      setTicketError("Selecciona un pasajero.");
      return;
    }
    if (!ticketReason.trim()) {
      setTicketError("Indica el motivo de la cancelación.");
      return;
    }
    if (items.length > 1 && !ticketItemId) {
      setTicketError("Selecciona la opción del boleto.");
      return;
    }
    ticketMutation.mutate({
      passengerId: Number(ticketPassengerId),
      itemId: ticketItemId ? Number(ticketItemId) : undefined,
      reason: ticketReason.trim(),
    });
  };

  const whatsapp = whatsappHref(
    booking.user?.phone,
    `Hola ${booking.user?.name ?? ""}, te contactamos por tu reserva #${booking.id} de "${trip?.title ?? "tu viaje"}".`,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={trip ? `/staff/trips/${trip.id}/bookings` : "/staff/bookings"}
        backLabel="Volver a reservas"
        eyebrow={`Reserva #${booking.id}`}
        title={trip?.title ?? "Detalle de la reserva"}
        subtitle={trip ? `${trip.destination} · ${formatBookingDate(booking.bookingDate)}` : undefined}
        action={
          <>
            <Link to={`/staff/bookings/${booking.id}/qr`} className={buttonClasses({ variant: "secondary", size: "md" })}>
              <QrCode className="size-4" />
              Ver QR
            </Link>
            <Link
              to={`/staff/audit?entity=Booking&id=${booking.id}`}
              className={buttonClasses({ variant: "outline", size: "md" })}
            >
              <FileClock className="size-4" />
              Historial
            </Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <SectionCard title="Resumen" icon={<Receipt className="size-5" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] bg-surface-container-low p-3">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Cliente</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-body-md text-on-surface">
                  <User className="size-4" />
                  {booking.user?.name ?? `Usuario ${booking.userId}`}
                </p>
                <p className="text-body-sm text-on-surface-variant">{booking.user?.email ?? ""}</p>
                {booking.user?.phone ? (
                  <div className="mt-1 flex gap-2">
                    <a href={whatsapp ?? "#"} target="_blank" rel="noreferrer" className="text-label-md text-secondary">
                      WhatsApp
                    </a>
                    <a href={telHref(booking.user.phone) ?? "#"} className="text-label-md text-secondary">
                      {formatPhone(booking.user.phone)}
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="rounded-[12px] bg-surface-container-low p-3">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Estado</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <BookingStatusBadge status={booking.status} />
                  {settled && !cancelled ? <BadgeCheck className="size-4 text-secondary" /> : null}
                </div>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {booking.numberOfSeats} asiento(s)
                  {booking.seatNumber ? ` · Titular #${booking.seatNumber}` : ""}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {booking.checkedIn ? `Check-in ${booking.checkedInAt ? formatDateTime(booking.checkedInAt) : ""}` : "Sin check-in"}
                </p>
              </div>
              <div className="rounded-[12px] bg-surface-container-low p-3">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Importes</p>
                <p className="text-body-md text-on-surface">Total {formatMxn(booking.totalAmount)}</p>
                <p className="text-body-sm text-on-surface-variant">
                  Pagado {formatMxn(paid)} · Saldo {formatMxn(pending)}
                </p>
                {toDecimal(booking.discountAmount).gt(0) ? (
                  <p className="text-body-sm text-secondary">
                    Descuento {formatMxn(booking.discountAmount)}
                    {booking.discountCode ? ` (${booking.discountCode})` : ""}
                  </p>
                ) : null}
              </div>
              <div className="rounded-[12px] bg-surface-container-low p-3">
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Viaje</p>
                <p className="text-body-md text-on-surface">{trip?.title ?? "—"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                  <CalendarDays className="size-3.5" />
                  {trip ? formatBookingDate(trip.startDate) : "—"}
                </p>
                {trip ? (
                  <Link to={`/staff/trips/${trip.id}`} className="mt-1 flex w-fit items-center gap-1 text-label-md text-secondary">
                    Ver viaje
                    <ArrowRight className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>

            {booking.specialNeedsNote ? (
              <div className="mt-3 rounded-[12px] bg-pending/70 p-3">
                <p className="text-label-md text-[#78350F]">Necesidades especiales</p>
                <p className="mt-0.5 text-body-sm text-[#78350F]">{booking.specialNeedsNote}</p>
              </div>
            ) : null}

            {!cancelled ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {!settled ? (
                  <Button variant="primary" size="md" onClick={openPay}>
                    <CreditCard className="size-4" />
                    Registrar pago
                  </Button>
                ) : null}
                {booking.status === "Pending" && toDecimal(paid).gt(0) ? (
                  <Button
                    variant="secondary"
                    size="md"
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("Confirmed")}
                  >
                    <CheckCircle2 className="size-4" />
                    Confirmar reserva
                  </Button>
                ) : null}
                <Button variant="danger" size="md" onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-4" />
                  Cancelar reserva
                </Button>
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
                Reserva cancelada. {toDecimal(booking.refundTotal ?? 0).gt(0) ? `Reembolso a saldo: ${formatMxn(booking.refundTotal ?? 0)}.` : "Sin reembolso registrado."}
              </p>
            )}
          </SectionCard>

          {items.length ? (
            <SectionCard title="Detalle por opciones" icon={<Ticket className="size-5" />}>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2">
                    <div>
                      <p className="text-body-md text-on-surface">{item.optionName ?? `Opción ${item.tripOptionId}`}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {item.adults} adulto(s) · {item.children} niño(s) · Unitario{" "}
                        {formatMxn(item.unitPriceAdult)}
                      </p>
                    </div>
                    <span className="text-label-md text-on-surface">
                      {formatMxn(
                        toDecimal(item.unitPriceAdult)
                          .times(item.adults)
                          .plus(toDecimal(item.unitPriceChild ?? item.unitPriceAdult).times(item.children)),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Acompañantes"
            subtitle={`${passengers.length} pasajero(s) adicional(es)`}
            icon={<User className="size-5" />}
          >
            {passengers.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Esta reserva no tiene acompañantes.</p>
            ) : (
              <div className="space-y-2">
                {passengers.map((passenger) => (
                  <div key={passenger.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2">
                    <div>
                      <p className="text-body-md text-on-surface">{passenger.name ?? "Sin nombre"}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {passenger.isChild ? "Niño" : "Adulto"} · Asiento {passenger.seatNumber ?? "—"}
                        {passenger.checkedIn ? " · Abordó" : ""}
                      </p>
                    </div>
                    {!cancelled ? (
                      <Button variant="outline" size="sm" onClick={() => openTicket(passenger.id)}>
                        Cancelar boleto
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-body-sm text-on-surface-variant">
              El asiento del titular solo se cancela con la reserva completa.
            </p>
          </SectionCard>

          <SectionCard title="Pagos registrados" icon={<Wallet className="size-5" />}>
            {(booking.payments ?? []).length ? (
              <div className="space-y-2">
                {(booking.payments ?? []).map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2">
                    <div>
                      <p className="text-body-md text-on-surface">
                        {formatMxn(payment.amount)} · {payment.method}
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
              <p className="text-body-md text-on-surface-variant">Sin pagos registrados.</p>
            )}
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Total abonado: <strong className="text-on-surface">{formatMxn(paid)}</strong> · Saldo pendiente:{" "}
              <strong className="text-on-surface">{formatMxn(pending)}</strong>
            </p>
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <SectionCard title="Saldos" icon={<Wallet className="size-5" />}>
            <div className="space-y-2 text-body-md">
              <div className="flex justify-between text-on-surface-variant">
                <span>Total</span>
                <span className="text-on-surface">{formatMxn(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Pagado</span>
                <span className="text-on-surface">{formatMxn(paid)}</span>
              </div>
              <div className="flex justify-between border-t border-surface-container-high pt-2">
                <span className="text-on-surface-variant">Saldo</span>
                <span className="text-price-display text-primary-container">{formatMxn(pending)}</span>
              </div>
            </div>
            {!settled && !cancelled ? (
              <Button className="mt-3 w-full" variant="secondary" onClick={openPay}>
                <CreditCard className="size-4" />
                Registrar pago
              </Button>
            ) : null}
          </SectionCard>

          <div className="rounded-card bg-primary-container p-4 text-white shadow-layer-1">
            <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.1em] text-mint">
              <AlertTriangle className="size-3.5" />
              Recordatorio
            </p>
            <p className="mt-1 text-body-sm text-mint/80">
              La cancelación administrativa actual no genera reembolso a la wallet del cliente.
              Si corresponde reembolsar, coordínalo antes de cancelar.
            </p>
          </div>

          <div className="rounded-card bg-white p-4 shadow-layer-1">
            <p className="text-label-md text-on-surface">Contacto</p>
            <div className="mt-1 space-y-1 text-body-sm text-on-surface-variant">
              <p className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {booking.user?.email ?? "Sin correo"}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {booking.user?.phone ? formatPhone(booking.user.phone) : "Sin teléfono"}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Registrar pago manual"
        description="Solo pagos completados. El saldo se actualiza en la reserva."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" loading={payMutation.isPending} onClick={submitPay}>
              Registrar pago
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-[12px] bg-surface-container-low p-3 text-body-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Saldo pendiente</span>
              <span className="font-semibold text-on-surface">{formatMxn(pending)}</span>
            </div>
          </div>
          <TextField
            label="Monto"
            type="number"
            inputMode="decimal"
            min={0}
            max={toDecimal(pending).toNumber()}
            step="0.01"
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value)}
          />
          <Select
            label="Método de pago"
            value={payMethod}
            onChange={(event) => setPayMethod(event.target.value as Exclude<PaymentMethod, "Wallet">)}
          >
            {methods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </Select>
          <TextField
            label="Referencia (opcional)"
            value={payReference}
            maxLength={120}
            onChange={(event) => setPayReference(event.target.value)}
            placeholder="Folio o referencia"
          />
          <p className="text-body-sm text-on-surface-variant">
            El método “Saldo a favor” no está disponible aquí: usa la app del cliente o el flujo de
            wallet para evitar inconsistencias.
          </p>
          {payError ? (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
              {payError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar reserva"
        description="Se liberarán los asientos. Esta acción no genera reembolso automático a la wallet."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate("Cancelled")}
            >
              Cancelar reserva
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-body-md text-on-surface-variant">
          <p>
            Cliente: <strong className="text-on-surface">{booking.user?.name ?? "—"}</strong>
          </p>
          <p>
            Total pagado: <strong className="text-on-surface">{formatMxn(paid)}</strong>. Si la política
            aplica un reembolso, regístralo manualmente o pide al cliente cancelar desde su cuenta.
          </p>
          {cancelError ? <p className="text-error">{cancelError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Cancelar boleto de acompañante"
        description="El reembolso se calcula sobre lo abonado y se acredita a la wallet del cliente."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setTicketOpen(false)}>
              Volver
            </Button>
            <Button variant="danger" className="flex-1" loading={ticketMutation.isPending} onClick={submitTicket}>
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
                {passenger.name}
                {passenger.seatNumber ? ` · Asiento ${passenger.seatNumber}` : ""}
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
          />
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
