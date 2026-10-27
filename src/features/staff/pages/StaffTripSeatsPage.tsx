import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bus, CheckCircle2, ClipboardCheck, Info, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeatMap, listManageTrips } from "@/features/trips/api";
import type { Seat } from "@/shared/api/types";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { SeatGrid, SeatLegend } from "@/shared/components/seats/SeatGrid";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard, StatCard } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { bookableCapacity, transportLabel } from "@/shared/lib/trip";
import { cn } from "@/shared/lib/cn";

export function StaffTripSeatsPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const [floor, setFloor] = useState(1);
  const [selected, setSelected] = useState<Seat | null>(null);

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const seatMapQuery = useQuery({
    queryKey: ["seatMap", tripId],
    queryFn: () => getSeatMap(tripId),
    enabled: Number.isFinite(tripId),
  });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  const seatMap = seatMapQuery.data;
  useDocumentTitle("Mapa de asientos");

  const floors = useMemo(
    () => [...new Set((seatMap?.rows ?? []).map((row) => row.floor))].sort((a, b) => a - b),
    [seatMap?.rows],
  );
  const rows = (seatMap?.rows ?? []).filter((row) => row.floor === floor);

  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }
  if (seatMapQuery.isLoading) return <PageLoader label="Cargando mapa de asientos…" />;
  if (seatMapQuery.isError || !seatMap) {
    return (
      <ErrorState
        message={seatMapQuery.error instanceof Error ? seatMapQuery.error.message : "No se pudo cargar el mapa."}
        onRetry={() => void seatMapQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/staff/trips/${tripId}`}
        backLabel="Volver al viaje"
        eyebrow="Operación"
        title="Mapa de asientos"
        subtitle={`${seatMap.tripTitle} · ${transportLabel(seatMap.transportType)}`}
        action={
          <Link to={`/staff/trips/${tripId}/checkin`} className={buttonClasses({ variant: "secondary", size: "md" })}>
            <ClipboardCheck className="size-4" />
            Check-in
          </Link>
        }
      />

      <div className="grid gap-2 sm:grid-cols-4">
        <StatCard label="Capacidad" value={seatMap.capacity} icon={<Bus className="size-4" />} />
        <StatCard label="Ocupados" value={seatMap.occupiedCount} tone="amber" icon={<Users className="size-4" />} />
        <StatCard label="Libres" value={seatMap.availableCount} tone="emerald" icon={<CheckCircle2 className="size-4" />} />
        <StatCard
          label="Cupo reservable"
          value={trip ? bookableCapacity(trip) : seatMap.capacity}
          tone="slate"
          icon={<Info className="size-4" />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <SectionCard
          title="Distribución de la unidad"
          subtitle={seatMap.hasTwoFloors ? "Dos pisos · numeración global" : "Planta única"}
        >
          {floors.length > 1 ? (
            <div className="mb-3 flex gap-2">
              {floors.map((number) => (
                <Chip key={number} selected={floor === number} onClick={() => setFloor(number)}>
                  Piso {number}
                </Chip>
              ))}
            </div>
          ) : null}
          <SeatLegend showCheckin showSelection={false} />
          <div className="mt-3">
            <SeatGrid
              rows={rows}
              onSeatClick={(seat) => setSelected(seat)}
              inspectOccupied
            />
          </div>
        </SectionCard>

        <div className="space-y-4 lg:sticky lg:top-24">
          <SectionCard title="Detalle del asiento" icon={<Info className="size-5" />}>
            {!selected ? (
              <p className="text-body-md text-on-surface-variant">
                Toca un asiento libre u ocupado para ver su estado y la reserva asociada.
              </p>
            ) : (
              <div className="space-y-2 text-body-md">
                <div className="flex items-center justify-between">
                  <p className="text-headline-sm text-on-surface">Asiento {selected.number}</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-label-md",
                      selected.checkedIn
                        ? "bg-confirmed text-on-secondary-container"
                        : selected.isOccupied
                          ? "bg-pending text-[#78350F]"
                          : "bg-mint text-primary-container",
                    )}
                  >
                    {selected.statusLabel ?? (selected.isOccupied ? "Ocupado" : "Disponible")}
                  </span>
                </div>
                <p className="text-on-surface-variant">
                  {selected.occupiedBy
                    ? selected.occupiedBy
                    : selected.isOccupied
                      ? "Reserva sin pasajero registrado"
                      : "Libre para asignar"}
                </p>
                {selected.isAssigned === false && selected.isOccupied ? (
                  <p className="text-body-sm text-on-surface-variant">
                    Este asiento fue rellenado automáticamente por el servidor para completar una reserva.
                  </p>
                ) : null}
                {selected.bookingId ? (
                  <Link to={`/staff/bookings/${selected.bookingId}`}>
                    <Button variant="secondary" size="sm" className="mt-1">
                      Ver reserva #{selected.bookingId}
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                ) : null}
                {selected.checkedIn ? (
                  <p className="inline-flex items-center gap-1.5 text-body-sm text-secondary">
                    <CheckCircle2 className="size-4" />
                    Check-in realizado
                  </p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <div className="rounded-card bg-white p-4 shadow-layer-1">
            <p className="text-label-md text-on-surface">Leyenda</p>
            <div className="mt-2 space-y-1.5 text-body-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <span className="size-3 rounded bg-surface-container-highest" />
                Disponible
              </p>
              <p className="flex items-center gap-2">
                <span className="size-3 rounded bg-seat-occupied" />
                Ocupado
              </p>
              <p className="flex items-center gap-2">
                <span className="size-3 rounded bg-secondary" />
                Ocupado con check-in
              </p>
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              El mapa usa la capacidad física del transporte. El cupo reservable puede ser menor si
              el hotel limita.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
