import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addPassengers, getBooking } from "@/features/bookings/api";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatMxn } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";

type Row = { name: string; age: string };

export function AddPassengersPage() {
  const { id } = useParams();
  const bookingId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([{ name: "", age: "" }]);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle("Agregar acompañantes");

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId),
    enabled: Number.isFinite(bookingId),
  });
  const booking = bookingQuery.data;
  const slots = booking
    ? Math.max(0, booking.numberOfSeats - 1 - (booking.passengers?.length ?? 0))
    : 0;

  const mutation = useMutation({
    mutationFn: (payload: { name: string; age: number }[]) =>
      addPassengers(bookingId, {
        passengers: payload.map((passenger) => ({
          name: passenger.name,
          age: passenger.age,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      showToast("Acompañantes registrados. Sus asientos se asignaron automáticamente.", "success");
      navigate(`/bookings/${bookingId}`, { replace: true });
    },
    onError: (mutationError) => {
      const message = errorMessage(mutationError);
      setError(message);
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

  if (booking.status === "Cancelled") {
    return (
      <EmptyState
        title="La reserva está cancelada"
        description="No puedes agregar acompañantes a una reserva cancelada."
        action={
          <Link
            to={`/bookings/${booking.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary-container px-4 text-label-md text-white"
          >
            <ArrowLeft className="size-4" />
            Volver a la reserva
          </Link>
        }
      />
    );
  }

  if (slots <= 0) {
    return (
      <EmptyState
        title="No hay asientos adicionales que registrar"
        description="Esta reserva ya tiene todos sus acompañantes o solo incluye el asiento del titular."
        action={
          <Link
            to={`/bookings/${booking.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-primary-container px-4 text-label-md text-white"
          >
            <ArrowLeft className="size-4" />
            Volver a la reserva
          </Link>
        }
      />
    );
  }

  const trip = booking.trip;

  const submit = () => {
    setError(null);
    if (rows.length > slots) {
      setError(`Esta reserva admite máximo ${slots} pasajero(s) adicional(es).`);
      return;
    }
    const passengers: { name: string; age: number }[] = [];
    for (const [index, row] of rows.entries()) {
      if (!row.name.trim()) {
        setError(`Escribe el nombre del pasajero ${index + 2}.`);
        return;
      }
      const age = Number(row.age);
      if (row.age.trim() === "" || !Number.isInteger(age) || age < 0 || age > 110) {
        setError(`Indica una edad entre 0 y 110 para el pasajero ${index + 2}.`);
        return;
      }
      passengers.push({ name: row.name.trim(), age });
    }
    mutation.mutate(passengers);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        backTo={`/bookings/${booking.id}`}
        backLabel="Volver a mi reserva"
        eyebrow={`Reserva #${booking.id}`}
        title="Agregar acompañantes"
        subtitle={
          trip
            ? `Tienes ${slots} asiento${slots === 1 ? "" : "s"} disponible${slots === 1 ? "" : "s"} para registrar.`
            : undefined
        }
      />

      <div className="rounded-card bg-white p-4 shadow-layer-1 sm:p-5">
        {trip ? (
          <div className="mb-4 rounded-[12px] bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
            <p className="font-semibold text-on-surface">{trip.title}</p>
            <p>
              Adulto {formatMxn(trip.price)}
              {trip.childPrice != null
                ? ` · Niño ${formatMxn(trip.childPrice)}`
                : " · Niño paga tarifa de adulto"}
            </p>
            <p className="mt-1">
              Los asientos se asignan automáticamente en los primeros lugares libres.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {rows.map((row, index) => {
            const ageNumber = Number(row.age);
            const isChild =
              row.age.trim() !== "" &&
              Number.isInteger(ageNumber) &&
              ageNumber >= 0 &&
              ageNumber <= 11;
            return (
              <div
                key={index}
                className="rounded-[14px] border border-input-border p-3.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-label-md text-on-surface">
                    Pasajero {index + 2}
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-label-sm",
                        row.age.trim() === ""
                          ? "bg-surface-container text-on-surface-variant"
                          : isChild
                            ? "bg-pending text-[#78350F]"
                            : "bg-mint text-primary-container",
                      )}
                    >
                      {row.age.trim() === "" ? "Edad pendiente" : isChild ? "Niño" : "Adulto"}
                    </span>
                  </p>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Quitar pasajero ${index + 2}`}
                      onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                      className="rounded-lg p-2 text-outline hover:bg-error-container hover:text-error"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-[1fr_110px]">
                  <TextField
                    label="Nombre completo"
                    value={row.name}
                    maxLength={120}
                    placeholder="Nombre del acompañante"
                    onChange={(event) => {
                      const value = event.target.value;
                      setRows((current) =>
                        current.map((item, i) => (i === index ? { ...item, name: value } : item)),
                      );
                      setError(null);
                    }}
                  />
                  <TextField
                    label="Edad"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={110}
                    value={row.age}
                    placeholder="12"
                    onChange={(event) => {
                      const value = event.target.value;
                      setRows((current) =>
                        current.map((item, i) => (i === index ? { ...item, age: value } : item)),
                      );
                      setError(null);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {rows.length < slots ? (
          <Button
            variant="outline"
            size="md"
            className="mt-3 w-full"
            onClick={() => setRows((current) => [...current, { name: "", age: "" }])}
          >
            <Plus className="size-4" />
            Agregar otro pasajero
          </Button>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            size="lg"
            loading={mutation.isPending}
            onClick={submit}
          >
            <UserPlus className="size-4" />
            Guardar pasajeros
          </Button>
          <Link
            to={`/bookings/${booking.id}`}
            className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-button border-[1.5px] border-input-border bg-white px-5 text-label-lg text-on-surface hover:border-emerald"
          >
            Volver a mi reserva
          </Link>
        </div>
      </div>
    </div>
  );
}
