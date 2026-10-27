import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  Check,
  CreditCard,
  Info,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { createBooking } from "@/features/bookings/api";
import {
  clearCheckoutDraft,
  readCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from "@/features/bookings/checkoutDraft";
import { getWallet } from "@/features/profile/api";
import { validateDiscount } from "@/features/staff/api";
import { getSeatAvailability, getTrip } from "@/features/trips/api";
import { errorMessage } from "@/shared/api/client";
import type { DiscountValidation, Seat } from "@/shared/api/types";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { SeatGrid, SeatLegend } from "@/shared/components/seats/SeatGrid";
import { Button } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { Switch, TextField } from "@/shared/components/ui/Form";
import { CoverImage, PageLoader, Skeleton } from "@/shared/components/ui/Media";
import { Modal } from "@/shared/components/ui/Modal";
import { PageHeader } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatMxn, minMoney, toDecimal } from "@/shared/lib/money";
import { formatTripDetailDate } from "@/shared/lib/dates";
import { activeOptions, bookableCapacity, isBookingClosed } from "@/shared/lib/trip";
import { cn } from "@/shared/lib/cn";

type PassengerDraft = { name: string; age: string };

export function CheckoutPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { showToast } = useToast();

  const tripQuery = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: Number.isFinite(tripId),
  });
  const seatsQuery = useQuery({
    queryKey: ["seats", tripId],
    queryFn: () => getSeatAvailability(tripId),
    enabled: Number.isFinite(tripId),
  });
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: getWallet });

  const trip = tripQuery.data;
  useDocumentTitle(trip ? `Reservar · ${trip.title}` : "Reservar");

  const [draft, setDraft] = useState<CheckoutDraft | null>(() =>
    Number.isFinite(tripId) ? readCheckoutDraft(tripId) : null,
  );
  const [passengerDrafts, setPassengerDrafts] = useState<PassengerDraft[]>([]);
  const [seats, setSeats] = useState<Record<number, number | null>>({});
  const [activeSlot, setActiveSlot] = useState(0);
  const [floor, setFloor] = useState(1);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountValidation | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!trip || draft) return;
    const options = activeOptions(trip);
    const fallback: CheckoutDraft =
      trip.hasOptions && options.length
        ? {
            tripId: trip.id,
            useOptions: true,
            options: [{ tripOptionId: options[0].id, adults: 1, children: 0 }],
            adults: 0,
            children: 0,
            totalSeats: 1,
            specialNeedsNote: null,
          }
        : {
            tripId: trip.id,
            useOptions: false,
            options: [],
            adults: 1,
            children: 0,
            totalSeats: 1,
            specialNeedsNote: null,
          };
    saveCheckoutDraft(fallback);
    setDraft(fallback);
  }, [trip, draft]);

  const totalSeats = draft?.totalSeats ?? 0;
  const extras = Math.max(0, totalSeats - 1);

  useEffect(() => {
    setPassengerDrafts((current) =>
      Array.from({ length: extras }, (_, index) => current[index] ?? { name: "", age: "" }),
    );
  }, [extras]);

  useEffect(() => {
    setSeats((current) => {
      const next: Record<number, number | null> = {};
      for (let index = 0; index < totalSeats; index += 1) {
        next[index] = current[index] ?? null;
      }
      return next;
    });
    setActiveSlot((current) => (current >= totalSeats ? 0 : current));
  }, [totalSeats]);

  const baseTotal = useMemo(() => {
    if (!trip || !draft) return "0.00";
    if (draft.useOptions) {
      const options = activeOptions(trip);
      return draft.options
        .reduce((sum, line) => {
          const option = options.find((item) => item.id === line.tripOptionId);
          if (!option) return sum;
          const childPrice = option.priceChild ?? option.priceAdult;
          return sum
            .plus(toDecimal(option.priceAdult).times(line.adults))
            .plus(toDecimal(childPrice).times(line.children));
        }, toDecimal(0))
        .toDecimalPlaces(2)
        .toFixed(2);
    }
    return toDecimal(trip.price)
      .times(draft.adults)
      .plus(toDecimal(trip.childPrice ?? trip.price).times(draft.children))
      .toDecimalPlaces(2)
      .toFixed(2);
  }, [trip, draft]);

  const discountAmount = appliedDiscount?.valid
    ? toDecimal(appliedDiscount.discountAmount)
    : toDecimal(0);
  const total = toDecimal(baseTotal).minus(discountAmount).toDecimalPlaces(2);
  const totalSafe = total.isNegative() ? toDecimal(0) : total;

  const walletAvailable = toDecimal(walletQuery.data?.available ?? 0);
  const walletMax = toDecimal(minMoney(walletAvailable, totalSafe));
  const walletMaxNumber = walletMax.toNumber();

  useEffect(() => {
    setWalletAmount((current) => Math.min(current, walletMaxNumber));
  }, [walletMaxNumber]);

  const walletApplied = walletEnabled ? Math.min(walletAmount, walletMax.toNumber()) : 0;
  const pendingAfterWallet = toDecimal(totalSafe).minus(walletApplied);

  const floors = useMemo(
    () => [...new Set((seatsQuery.data?.rows ?? []).map((row) => row.floor))].sort((a, b) => a - b),
    [seatsQuery.data?.rows],
  );
  useEffect(() => {
    if (floors.length && !floors.includes(floor)) setFloor(floors[0]);
  }, [floors, floor]);

  const floorRows = (seatsQuery.data?.rows ?? []).filter((row) => row.floor === floor);
  const selectedSeats = new Set(Object.values(seats).filter((seat): seat is number => seat != null));
  const seatLabels = new Map<number, string>();
  Object.entries(seats).forEach(([slot, seat]) => {
    if (seat != null) seatLabels.set(seat, Number(slot) === 0 ? "Tú" : `P${Number(slot) + 1}`);
  });

  const applyDiscountMutation = useMutation({
    mutationFn: () =>
      validateDiscount({
        code: discountCode.trim(),
        tripId,
        baseAmount: Number(baseTotal),
      }),
    onSuccess: (result) => {
      if (result.valid) {
        setAppliedDiscount(result);
        setDiscountError(null);
        setDiscountCode(result.code ?? discountCode.trim().toUpperCase());
        showToast(`Descuento aplicado: ${formatMxn(result.discountAmount)} menos.`, "success");
      } else {
        setAppliedDiscount(null);
        setDiscountError(result.message || "El código no es válido para este viaje.");
      }
    },
    onError: (error) => {
      setAppliedDiscount(null);
      setDiscountError(errorMessage(error));
    },
  });

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      clearCheckoutDraft(tripId);
      setPolicyOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["seats", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      showToast("¡Reserva creada! Ya puedes ver tu código QR.", "success");
      navigate(`/bookings/${booking.id}?created=1`, { replace: true });
    },
    onError: (error) => {
      const message = errorMessage(error);
      setServerError(message);
      showToast(message, "error");
    },
  });

  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }

  if (tripQuery.isLoading || seatsQuery.isLoading || !draft) {
    return <PageLoader label="Preparando tu reserva…" />;
  }

  if (tripQuery.isError || !trip) {
    return (
      <ErrorState
        message={errorMessage(tripQuery.error) || "No encontramos este viaje."}
        onRetry={() => void tripQuery.refetch()}
      />
    );
  }

  if (seatsQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(seatsQuery.error) || "No pudimos cargar los asientos."}
        onRetry={() => void seatsQuery.refetch()}
      />
    );
  }

  const capacity = bookableCapacity(trip);
  const effectiveAvailable = Math.min(trip.availableSeats, seatsQuery.data?.availableCount ?? capacity);
  const closed = isBookingClosed(trip);

  if (!trip.isActive || closed || effectiveAvailable <= 0 || totalSeats > effectiveAvailable) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          title={
            !trip.isActive
              ? "Este viaje está pausado"
              : closed
                ? "Las reservas están cerradas"
                : "Sin cupo suficiente"
          }
          description={
            !trip.isActive
              ? "El viaje no acepta nuevas reservas por ahora. Tu reserva existente sigue vigente."
              : closed
                ? "La fecha límite de reserva ya pasó. Escríbenos para revisar opciones."
                : `Necesitas ${totalSeats} asiento(s) y solo quedan ${Math.max(0, effectiveAvailable)}. Ajusta tu selección o solicita más cupo.`
          }
          action={
            <Link
              to={`/trips/${trip.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary-container px-4 text-label-md text-white"
            >
              <ArrowLeft className="size-4" />
              Volver al viaje
            </Link>
          }
        />
      </div>
    );
  }

  const selectSeat = (seat: Seat) => {
    if (seat.isOccupied) return;
    const next = { ...seats };
    const owner = Object.keys(next).find((key) => next[Number(key)] === seat.number);
    if (owner !== undefined) {
      const ownerIndex = Number(owner);
      if (ownerIndex === activeSlot) {
        next[ownerIndex] = null;
        setSeats(next);
        return;
      }
      next[ownerIndex] = null;
    }
    next[activeSlot] = seat.number;
    setSeats(next);
    setFormErrors([]);
    const firstEmpty = Array.from({ length: totalSeats }, (_, index) => index).find(
      (index) => next[index] == null,
    );
    if (firstEmpty !== undefined) setActiveSlot(firstEmpty);
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    for (let slot = 0; slot < totalSeats; slot += 1) {
      if (seats[slot] == null) {
        errors.push(
          slot === 0
            ? "Elige el asiento del titular."
            : `Elige el asiento del pasajero ${slot + 1}.`,
        );
      }
    }
    passengerDrafts.forEach((passenger, index) => {
      if (!passenger.name.trim()) {
        errors.push(`Escribe el nombre del pasajero ${index + 2}.`);
      }
      const age = Number(passenger.age);
      if (passenger.age.trim() === "" || !Number.isInteger(age) || age < 0 || age > 110) {
        errors.push(`Indica una edad válida (0 a 110) para el pasajero ${index + 2}.`);
      }
    });
    if (draft.useOptions && draft.options.length === 0) {
      errors.push("Selecciona al menos una opción de viaje.");
    }
    return errors;
  };

  const openPolicy = () => {
    const errors = validate();
    setFormErrors(errors);
    setServerError(null);
    if (errors.length) {
      showToast(errors[0], "error");
      return;
    }
    setPolicyOpen(true);
  };

  const submit = () => {
    if (!policyAccepted) return;
    setServerError(null);
    const errors = validate();
    if (errors.length) {
      setFormErrors(errors);
      setPolicyOpen(false);
      showToast(errors[0], "error");
      return;
    }
    bookingMutation.mutate({
      tripId,
      numberOfSeats: totalSeats,
      seatNumber: seats[0] ?? null,
      passengers: passengerDrafts.map((passenger, index) => ({
        name: passenger.name.trim(),
        age: Number(passenger.age),
        seatNumber: seats[index + 1] ?? null,
      })),
      options: draft.useOptions ? draft.options : [],
      useOptions: draft.useOptions,
      discountCode: appliedDiscount?.code ?? null,
      specialNeedsNote: draft.specialNeedsNote,
      walletAmount: walletApplied > 0 ? Number(walletApplied.toFixed(2)) : null,
    });
  };

  const optionLines = draft.useOptions
    ? draft.options.flatMap((line) => {
        const option = (trip.options ?? []).find((item) => item.id === line.tripOptionId);
        if (!option) return [];
        const childPrice = option.priceChild ?? option.priceAdult;
        return [
          {
            name: option.name,
            adults: line.adults,
            children: line.children,
            total: toDecimal(option.priceAdult)
              .times(line.adults)
              .plus(toDecimal(childPrice).times(line.children))
              .toFixed(2),
          },
        ];
      })
    : [];

  const tripDate = formatTripDetailDate(trip.startDate);

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <PageHeader
        backTo={`/trips/${trip.id}`}
        backLabel="Volver al viaje"
        eyebrow="Checkout"
        title="Completa tu reserva"
        subtitle={`${trip.title} · ${tripDate}`}
      />

      {formErrors.length ? (
        <div role="alert" className="rounded-[16px] border border-error/20 bg-error-container p-4">
          <p className="flex items-center gap-2 text-title-md text-on-error-container">
            <AlertTriangle className="size-4" />
            Revisa estos detalles antes de continuar
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-on-error-container">
            {formErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="flex gap-4 rounded-card bg-white p-4 shadow-layer-1">
            <CoverImage
              src={trip.imageUrl}
              alt={trip.title}
              ratio="aspect-square"
              className="size-24 shrink-0 rounded-[16px] sm:size-28"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-label-md text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {trip.destination}
                </span>
                <span>·</span>
                <span className="first-letter:uppercase">{tripDate}</span>
              </div>
              <h2 className="mt-1 text-headline-sm text-on-surface">{trip.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-label-md">
                <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-primary-container">
                  <Ticket className="size-3.5" />
                  {totalSeats} asiento{totalSeats === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">
                  {capacity - trip.availableSeats} vendidos · {trip.availableSeats} libres
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-card bg-white p-4 shadow-layer-1 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">Pasajeros y boletos</h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  Asigna un asiento a cada persona. Toca un pasajero y luego su asiento en el mapa.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-label-md text-primary-container">
                {Object.values(seats).filter(Boolean).length} / {totalSeats}
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {Array.from({ length: totalSeats }).map((_, slot) => {
                const isHolder = slot === 0;
                const seat = seats[slot];
                const active = activeSlot === slot;
                const passenger = passengerDrafts[slot - 1];
                const ageNumber = passenger ? Number(passenger.age) : NaN;
                const isChild = !isHolder && Number.isInteger(ageNumber) && ageNumber >= 0 && ageNumber <= 11;
                return (
                  <div
                    key={slot}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveSlot(slot)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setActiveSlot(slot);
                    }}
                    className={cn(
                      "rounded-[16px] border-[1.5px] p-3.5 transition",
                      active ? "border-emerald bg-mint/25" : "border-input-border bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-full",
                            active ? "bg-primary-container text-white" : "bg-surface-container text-primary-container",
                          )}
                        >
                          {isHolder ? <UserRound className="size-4" /> : <span className="text-label-md">{slot + 1}</span>}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-title-md text-on-surface">
                            {isHolder ? "Titular (tú)" : `Pasajero ${slot + 1}`}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                            {isHolder ? "Adulto responsable de la reserva" : isChild ? "Niño (0 a 11 años)" : "Acompañante"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-label-md",
                          seat != null
                            ? "bg-primary-container text-white"
                            : "bg-surface-container text-on-surface-variant",
                        )}
                      >
                        {seat != null ? `Asiento ${seat}` : "Sin asignar"}
                      </span>
                    </div>

                    {isHolder ? (
                      <p className="mt-2 text-body-sm text-on-surface-variant">
                        {session?.name} · {session?.email}
                      </p>
                    ) : (
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[1fr_100px]">
                        <TextField
                          label="Nombre completo"
                          value={passenger?.name ?? ""}
                          maxLength={120}
                          placeholder="Nombre del acompañante"
                          onFocus={() => setActiveSlot(slot)}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPassengerDrafts((current) =>
                              current.map((item, index) =>
                                index === slot - 1 ? { ...item, name: value } : item,
                              ),
                            );
                            setFormErrors([]);
                          }}
                        />
                        <TextField
                          label="Edad"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={110}
                          value={passenger?.age ?? ""}
                          placeholder="12"
                          onFocus={() => setActiveSlot(slot)}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPassengerDrafts((current) =>
                              current.map((item, index) =>
                                index === slot - 1 ? { ...item, age: value } : item,
                              ),
                            );
                            setFormErrors([]);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-card bg-white p-4 shadow-layer-1 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">Distribución de asientos</h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {trip.hasTwoFloors ? "Autobús de dos pisos · numeración global" : "Planta única"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant">
                  {seatsQuery.data?.availableCount ?? 0} libres
                </span>
              </div>
            </div>

            {floors.length > 1 ? (
              <div className="mt-3 flex gap-2">
                {floors.map((number) => (
                  <Chip key={number} selected={floor === number} onClick={() => setFloor(number)}>
                    Piso {number}
                  </Chip>
                ))}
              </div>
            ) : null}

            <div className="mt-3">
              <SeatLegend
                extra={
                  <span className="text-label-md text-primary-container">
                    Asignando: {activeSlot === 0 ? "Titular" : `Pasajero ${activeSlot + 1}`}
                  </span>
                }
              />
            </div>

            <div className="mt-3">
              {seatsQuery.isFetching ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <SeatGrid
                  rows={floorRows}
                  selectedSeats={selectedSeats}
                  seatLabels={seatLabels}
                  onSeatClick={selectSeat}
                />
              )}
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Toca un asiento ocupado y no pasa nada: ya está reservado. Si te equivocas, toca de
              nuevo tu asiento para liberarlo.
            </p>
          </section>

          <section className="rounded-card bg-white p-4 shadow-layer-1 sm:p-5">
            <h2 className="flex items-center gap-2 text-headline-sm text-on-surface">
              <ShieldCheck className="size-5 text-secondary" />
              Políticas y condiciones
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Al confirmar aceptas las políticas de reserva, pago y cancelación de Proxima Parada
              Tours.
            </p>
            <details className="group mt-3 rounded-[14px] border border-input-border px-4 py-3">
              <summary className="cursor-pointer list-none text-label-lg text-primary-container">
                Leer políticas completas
              </summary>
              <div className="mt-3 space-y-2 text-body-sm text-on-surface-variant">
                <p>
                  <strong className="text-on-surface">Confirmación.</strong> Tu reserva se crea como
                  pendiente. El lugar queda apartado y se confirma al liquidar el total.
                </p>
                <p>
                  <strong className="text-on-surface">Precios.</strong> Los precios mostrados son por
                  persona en MXN. La tarifa infantil aplica de 0 a 11 años.
                </p>
                <p>
                  <strong className="text-on-surface">Pagos.</strong> Puedes pagar con saldo a favor
                  desde la app o acordar el pago con la agencia. No se cobra tarjeta en línea.
                </p>
                <p>
                  <strong className="text-on-surface">Cancelación.</strong>{" "}
                  {trip.cancellationDaysLimit == null
                    ? "Este viaje tiene cancelación flexible con reembolso del 100% de lo abonado a tu saldo."
                    : `Con ${trip.cancellationDaysLimit} días o más de anticipación se reembolsa el 100% de lo abonado; después se retiene el 30%.`}{" "}
                  No se puede cancelar después de la salida o el check-in.
                </p>
                <p>
                  <strong className="text-on-surface">QR.</strong> Cada pasajero recibe un código QR
                  personal para el check-in. No lo compartas.
                </p>
              </div>
            </details>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-card border border-white bg-white p-5 shadow-layer-1">
            <h2 className="text-headline-sm text-on-surface">Resumen de tu reserva</h2>

            <div className="mt-3 space-y-2 text-body-md">
              {draft.useOptions ? (
                optionLines.map((line) => (
                  <div key={line.name} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-on-surface">{line.name}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {line.adults} adulto{line.adults === 1 ? "" : "s"}
                        {line.children > 0
                          ? ` · ${line.children} niño${line.children === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-on-surface">{formatMxn(line.total)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-on-surface-variant">
                      Adultos × {draft.adults}
                    </span>
                    <span className="text-on-surface">
                      {formatMxn(toDecimal(trip.price).times(draft.adults))}
                    </span>
                  </div>
                  {draft.children > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">
                        Niños × {draft.children}
                      </span>
                      <span className="text-on-surface">
                        {formatMxn(toDecimal(trip.childPrice ?? trip.price).times(draft.children))}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-3 border-t border-surface-container-high pt-3">
              <label className="text-label-md text-on-surface-variant" htmlFor="discount-code">
                Código de descuento
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="discount-code"
                  value={discountCode}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase();
                    setDiscountCode(value);
                    setDiscountError(null);
                    if (appliedDiscount && value.trim() !== appliedDiscount.code) {
                      setAppliedDiscount(null);
                    }
                  }}
                  placeholder="VERANO10"
                  className="h-11 min-w-0 flex-1 rounded-[12px] border-[1.5px] border-input-border bg-white px-3 text-body-md uppercase outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
                />
                <Button
                  variant="secondary"
                  size="md"
                  loading={applyDiscountMutation.isPending}
                  disabled={!discountCode.trim()}
                  onClick={() => applyDiscountMutation.mutate()}
                >
                  <BadgePercent className="size-4" />
                  Aplicar
                </Button>
              </div>
              {discountError ? (
                <p className="mt-1 text-body-sm text-error" role="alert">
                  {discountError}
                </p>
              ) : null}
              {appliedDiscount?.valid ? (
                <p className="mt-1 flex items-center gap-1 text-body-sm text-secondary">
                  <Check className="size-3.5" />
                  {appliedDiscount.code} aplicado: -{formatMxn(appliedDiscount.discountAmount)}
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedDiscount(null);
                      setDiscountCode("");
                    }}
                    className="ml-1 underline"
                  >
                    Quitar
                  </button>
                </p>
              ) : null}
            </div>

            <div className="mt-3 rounded-[14px] bg-surface-container-low p-3">
              <label className="flex items-center justify-between gap-3 text-label-md text-on-surface">
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="size-4 text-secondary" />
                  Usar mi saldo
                </span>
                <span className="text-on-surface-variant">
                  {walletQuery.isLoading ? "…" : formatMxn(walletAvailable)}
                </span>
              </label>
              <div className="mt-2">
                <Switch
                  checked={walletEnabled}
                  onChange={(enabled) => {
                    setWalletEnabled(enabled);
                    setWalletAmount(enabled ? walletMax.toNumber() : 0);
                  }}
                  label="Aplicar saldo a favor"
                  description={
                    walletAvailable.gt(0)
                      ? "El saldo se descuenta de tu total y queda registrado como pago."
                      : "Aún no tienes saldo disponible."
                  }
                  disabled={walletAvailable.lte(0)}
                />
              </div>
              {walletEnabled && walletMax.gt(0) ? (
                <div className="mt-3">
                  <TextField
                    label="Monto a aplicar"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={walletMax.toNumber()}
                    step="0.01"
                    value={walletAmount}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setWalletAmount(Number.isFinite(value) ? Math.max(0, Math.min(value, walletMax.toNumber())) : 0);
                    }}
                  />
                  <div className="mt-1 flex justify-between text-body-sm text-on-surface-variant">
                    <span>Máximo aplicable: {formatMxn(walletMax)}</span>
                    <button
                      type="button"
                      className="text-secondary underline"
                      onClick={() => setWalletAmount(walletMax.toNumber())}
                    >
                      Usar todo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-surface-container-high pt-3 text-body-md">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal</span>
                <span className="text-on-surface">{formatMxn(baseTotal)}</span>
              </div>
              {discountAmount.gt(0) ? (
                <div className="flex justify-between text-secondary">
                  <span>Descuento</span>
                  <span>-{formatMxn(discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex items-end justify-between pt-1">
                <span className="text-label-md text-on-surface-variant">Total de la reserva</span>
                <span className="text-price-display text-primary-container">{formatMxn(totalSafe)}</span>
              </div>
              {walletApplied > 0 ? (
                <>
                  <div className="flex justify-between text-secondary">
                    <span>Saldo aplicado</span>
                    <span>-{formatMxn(walletApplied)}</span>
                  </div>
                  <div className="flex justify-between text-on-surface">
                    <span>Queda por pagar</span>
                    <span className="font-semibold">{formatMxn(pendingAfterWallet)}</span>
                  </div>
                </>
              ) : null}
            </div>

            <Button size="lg" className="mt-3 hidden w-full md:flex" onClick={openPolicy}>
              <LockKeyhole className="size-4" />
              Continuar y aceptar políticas
            </Button>
            <p className="mt-2 hidden items-center justify-center gap-1 text-center text-body-sm text-on-surface-variant md:flex">
              <CreditCard className="size-3.5" />
              No se solicita tarjeta. Aparta ahora y paga después.
            </p>
          </section>

          <div className="rounded-card bg-primary-container p-5 text-white shadow-layer-1">
            <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.1em] text-mint">
              <Info className="size-3.5" />
              ¿Necesitas ayuda?
            </p>
            <p className="mt-1 text-body-sm text-mint/80">
              Escríbenos por WhatsApp y te acompañamos en el proceso de reserva.
            </p>
            <a
              href={`https://wa.me/5214444579256?text=${encodeURIComponent(
                `Hola, necesito ayuda con mi reserva para "${trip.title}".`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-mint px-3 text-label-md text-primary-container"
            >
              Hablar con un asesor
            </a>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-surface-container-high bg-white/95 px-4 py-2.5 shadow-layer-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-body-sm text-on-surface-variant">
              {totalSeats} asiento{totalSeats === 1 ? "" : "s"} · Total
            </p>
            <p className="text-price-display text-primary-container">{formatMxn(totalSafe)}</p>
          </div>
          <Button size="md" onClick={openPolicy}>
            <LockKeyhole className="size-4" />
            Continuar
          </Button>
        </div>
      </div>

      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="Políticas y condiciones"
        description="Aceptación en dos pasos antes de reservar."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPolicyOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!policyAccepted}
              loading={bookingMutation.isPending}
              onClick={submit}
            >
              Confirmar y reservar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[14px] bg-surface-container-low p-3.5">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Viaje</span>
              <span className="font-semibold text-on-surface">{trip.title}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Asientos</span>
              <span className="font-semibold text-on-surface">{totalSeats}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Total</span>
              <span className="font-semibold text-primary-container">{formatMxn(totalSafe)}</span>
            </div>
            {walletApplied > 0 ? (
              <div className="mt-1 flex items-center justify-between text-body-sm">
                <span className="text-on-surface-variant">Saldo aplicado</span>
                <span className="font-semibold text-secondary">-{formatMxn(walletApplied)}</span>
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-label-sm uppercase tracking-wide text-secondary">Paso 1</p>
            <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-[14px] border border-input-border p-3.5">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(event) => setPolicyAccepted(event.target.checked)}
                className="mt-0.5 size-5 rounded border-input-border accent-primary-container"
              />
              <span className="text-body-md text-on-surface">
                Acepto todas las políticas de reserva, pago, cancelación y reembolso de Proxima
                Parada Tours.
              </span>
            </label>
          </div>

          {policyAccepted ? (
            <div>
              <p className="text-label-sm uppercase tracking-wide text-secondary">Paso 2</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Al confirmar se crea tu reserva como <strong>pago pendiente</strong>. Puedes
                liquidarla desde el detalle con tu saldo o coordinar el pago con la agencia. Los
                asientos quedarán apartados a tu nombre.
              </p>
            </div>
          ) : null}

          {serverError ? (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
              {serverError}
            </p>
          ) : null}

          <p className="text-body-sm text-on-surface-variant">
            <Info className="mr-1 inline size-3.5" />
            No se guarda la aceptación en el servidor; si recargas la página deberás confirmar de
            nuevo.
          </p>
        </div>
      </Modal>
    </div>
  );
}
