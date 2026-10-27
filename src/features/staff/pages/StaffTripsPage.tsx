import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bus,
  CalendarDays,
  Eye,
  MapPinned,
  Pause,
  Play,
  Plus,
  Search,
  Ticket,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { listManageTrips, setTripActive } from "@/features/trips/api";
import type { Trip } from "@/shared/api/types";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { CoverImage, CardSkeleton } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { ConfirmDialog } from "@/shared/components/ui/Modal";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatMxn } from "@/shared/lib/money";
import { formatTripDetailDate } from "@/shared/lib/dates";
import { bookableCapacity, soldSeats, transportLabel } from "@/shared/lib/trip";
import { cn } from "@/shared/lib/cn";

type Filter = "all" | "active" | "paused";

export function StaffTripsPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingToggle, setPendingToggle] = useState<Trip | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  useDocumentTitle("Mis viajes · Staff");

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });

  const toggleMutation = useMutation({
    mutationFn: (trip: Trip) => setTripActive(trip.id, !trip.isActive),
    onSuccess: (_data, trip) => {
      void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      showToast(trip.isActive ? "Viaje pausado." : "Viaje reactivado.", "success");
      setPendingToggle(null);
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "No se pudo actualizar el viaje.", "error");
    },
  });

  const trips = tripsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trips.filter((trip) => {
      if (filter === "active" && !trip.isActive) return false;
      if (filter === "paused" && trip.isActive) return false;
      if (!term) return true;
      return `${trip.title} ${trip.destination}`.toLowerCase().includes(term);
    });
  }, [trips, filter, search]);

  const counts = {
    all: trips.length,
    active: trips.filter((trip) => trip.isActive).length,
    paused: trips.filter((trip) => !trip.isActive).length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Panel ${isAdmin ? "administrador" : "coordinador"}`}
        title="Mis viajes"
        subtitle="Opera las salidas, revisa cupo y controla la publicación."
        action={
          isAdmin ? (
            <Link to="/staff/trips/new" className={buttonClasses({ variant: "primary", size: "md" })}>
              <Plus className="size-4" />
              Nuevo viaje
            </Link>
          ) : null
        }
      />

      <div className="rounded-card bg-white p-4 shadow-layer-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-[12px] border-[1.5px] border-input-border px-3">
            <Search className="size-4 text-outline" />
            <span className="sr-only">Buscar viajes</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por destino o título…"
              className="h-11 min-w-0 flex-1 bg-transparent text-body-md outline-none placeholder:text-outline"
            />
          </label>
          <div className="flex gap-2">
            {(
              [
                { key: "all", label: "Todos", count: counts.all },
                { key: "active", label: "Activos", count: counts.active },
                { key: "paused", label: "Pausados", count: counts.paused },
              ] as Array<{ key: Filter; label: string; count: number }>
            ).map((item) => (
              <Chip
                key={item.key}
                selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn(filter === item.key && "border-primary-container bg-primary-container text-white")}
              >
                {item.label}
                <span className="ml-1 text-[10px] opacity-75">{item.count}</span>
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {tripsQuery.isError ? (
        <ErrorState
          message={tripsQuery.error instanceof Error ? tripsQuery.error.message : "No se pudieron cargar los viajes."}
          onRetry={() => void tripsQuery.refetch()}
        />
      ) : tripsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={trips.length === 0 ? "Aún no hay viajes" : "Sin resultados"}
          description={
            trips.length === 0
              ? "Crea tu primera salida para empezar a vender asientos."
              : "Prueba con otro filtro o limpia la búsqueda."
          }
          action={
            isAdmin && trips.length === 0 ? (
              <Link to="/staff/trips/new" className={buttonClasses({ variant: "primary" })}>
                <Plus className="size-4" />
                Crear viaje
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => { setFilter("all"); setSearch(""); }}>
                Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((trip) => {
            const capacity = bookableCapacity(trip);
            const sold = soldSeats(trip);
            return (
              <article key={trip.id} className="flex flex-col overflow-hidden rounded-card bg-white shadow-layer-1">
                <div className="relative">
                  <CoverImage src={trip.imageUrl} alt={trip.title} ratio="aspect-[16/9]" />
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    {!trip.isActive ? <Badge tone="cancelled">PAUSADO</Badge> : null}
                    {trip.finalized ? <Badge tone="neutral">Finalizado</Badge> : null}
                    {trip.departureCompleted ? <Badge tone="pending">Salida realizada</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                    <MapPinned className="size-3.5 text-secondary" />
                    {trip.destination}
                  </p>
                  <h2 className="text-headline-sm text-on-surface">{trip.title}</h2>
                  <p className="inline-flex items-center gap-1.5 text-label-md first-letter:uppercase text-on-surface-variant">
                    <CalendarDays className="size-3.5" />
                    {formatTripDetailDate(trip.startDate)}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant">
                    <Bus className="size-3.5" />
                    {transportLabel(trip.transportType)} · {formatMxn(trip.price)}
                  </p>
                  <div className="rounded-[10px] bg-surface-container-low p-2.5 text-label-md">
                    <div className="flex justify-between text-on-surface-variant">
                      <span className="inline-flex items-center gap-1">
                        <Ticket className="size-3.5" />
                        Vendidos {sold}
                      </span>
                      <span>
                        Disponibles {trip.availableSeats} de {capacity}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${capacity ? Math.min(100, (sold / capacity) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    <Link
                      to={`/staff/trips/${trip.id}`}
                      className={buttonClasses({ variant: "primary", size: "sm" })}
                    >
                      <Eye className="size-3.5" />
                      Ver detalle
                    </Link>
                    <Link
                      to={`/staff/trips/${trip.id}/seats`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      <Users className="size-3.5" />
                      Asientos
                    </Link>
                    {isAdmin ? (
                      <Button
                        variant={trip.isActive ? "ghost" : "secondary"}
                        size="sm"
                        onClick={() => setPendingToggle(trip)}
                      >
                        {trip.isActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        {trip.isActive ? "Pausar" : "Activar"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex justify-center">
        <Link to="/staff/bookings" className="inline-flex items-center gap-1 text-label-md text-secondary hover:underline">
          Ir a reservas
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        onClose={() => setPendingToggle(null)}
        title={pendingToggle?.isActive ? "Pausar viaje" : "Reactivar viaje"}
        description={
          pendingToggle?.isActive
            ? "El viaje dejará de aceptar reservas nuevas. Se notificará a los clientes con reservas y sus lugares seguirán vigentes."
            : "El viaje volverá a estar visible y aceptará reservas. Se notificará a los clientes con reservas."
        }
        confirmLabel={pendingToggle?.isActive ? "Pausar viaje" : "Reactivar viaje"}
        tone={pendingToggle?.isActive ? "danger" : "primary"}
        loading={toggleMutation.isPending}
        onConfirm={() => pendingToggle && toggleMutation.mutate(pendingToggle)}
      >
        <p className="text-body-md text-on-surface">{pendingToggle?.title}</p>
      </ConfirmDialog>
    </div>
  );
}
