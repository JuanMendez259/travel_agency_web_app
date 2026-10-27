import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Flag,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  createPoi,
  deletePoi,
  listManageTrips,
  updatePoi,
  updateRoute,
} from "@/features/trips/api";
import type { PointOfInterest } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { MapView, type MapMarker } from "@/shared/components/map/MapView";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Modal, ConfirmDialog } from "@/shared/components/ui/Modal";
import { TextArea, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatTripDetailDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

type Mode = "pan" | "origin" | "destination" | "poi";
type SearchResult = { display_name: string; lat: string; lon: string };

export function StaffTripMapPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("pan");
  const [poiModal, setPoiModal] = useState(false);
  const [editingPoi, setEditingPoi] = useState<PointOfInterest | null>(null);
  const [poiCoords, setPoiCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [poiName, setPoiName] = useState("");
  const [poiDescription, setPoiDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PointOfInterest | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  const pois = useMemo(() => trip?.pointsOfInterest ?? [], [trip]);
  useDocumentTitle("Mapa e itinerario");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
    void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
  };

  const routeMutation = useMutation({
    mutationFn: (payload: {
      originLatitude: number | null;
      originLongitude: number | null;
      destinationLatitude: number | null;
      destinationLongitude: number | null;
    }) => updateRoute(tripId, payload),
    onSuccess: () => {
      invalidate();
      setMode("pan");
      showToast("Ruta actualizada.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const poiMutation = useMutation({
    mutationFn: async () => {
      if (!poiCoords) throw new Error("Selecciona un punto en el mapa.");
      const payload = {
        name: poiName.trim(),
        description: poiDescription.trim() || null,
        latitude: poiCoords.lat,
        longitude: poiCoords.lng,
      };
      if (editingPoi) return updatePoi(tripId, editingPoi.id, payload);
      return createPoi(tripId, payload);
    },
    onSuccess: () => {
      invalidate();
      setPoiModal(false);
      setEditingPoi(null);
      setPoiCoords(null);
      setPoiName("");
      setPoiDescription("");
      showToast("Punto de interés guardado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (poiId: number) => deletePoi(tripId, poiId),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast("Punto eliminado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const markers = useMemo<MapMarker[]>(() => {
    if (!trip) return [];
    const result: MapMarker[] = [];
    if (trip.originLatitude != null && trip.originLongitude != null) {
      result.push({
        id: "origin",
        lat: trip.originLatitude,
        lng: trip.originLongitude,
        label: "Origen",
        kind: "origin",
      });
    }
    pois.forEach((poi, index) => {
      result.push({
        id: `poi-${poi.id}`,
        lat: poi.latitude,
        lng: poi.longitude,
        label: poi.name ?? `Punto ${index + 1}`,
        kind: "poi",
        index: index + 1,
      });
    });
    if (trip.destinationLatitude != null && trip.destinationLongitude != null) {
      result.push({
        id: "destination",
        lat: trip.destinationLatitude,
        lng: trip.destinationLongitude,
        label: "Destino",
        kind: "destination",
      });
    }
    return result;
  }, [trip, pois]);

  const polyline = useMemo(
    () => markers.map((marker) => [marker.lat, marker.lng] as [number, number]),
    [markers],
  );

  const handleMapClick = (lat: number, lng: number) => {
    if (!trip) return;
    if (mode === "origin") {
      routeMutation.mutate({
        originLatitude: lat,
        originLongitude: lng,
        destinationLatitude: trip.destinationLatitude ?? null,
        destinationLongitude: trip.destinationLongitude ?? null,
      });
    } else if (mode === "destination") {
      routeMutation.mutate({
        originLatitude: trip.originLatitude ?? null,
        originLongitude: trip.originLongitude ?? null,
        destinationLatitude: lat,
        destinationLongitude: lng,
      });
    } else if (mode === "poi") {
      setMode("pan");
      openPoiCreate({ lat, lng });
    }
  };

  const openPoiCreate = (coords: { lat: number; lng: number } | null) => {
    setEditingPoi(null);
    setPoiCoords(coords);
    setPoiName("");
    setPoiDescription("");
    setPoiModal(true);
  };

  const openPoiEdit = (poi: PointOfInterest) => {
    setEditingPoi(poi);
    setPoiCoords({ lat: poi.latitude, lng: poi.longitude });
    setPoiName(poi.name ?? "");
    setPoiDescription(poi.description ?? "");
    setPoiModal(true);
    setFocus({ lat: poi.latitude, lng: poi.longitude, zoom: 14 });
  };

  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Búsqueda no disponible.");
      const data = (await response.json()) as SearchResult[];
      setSearchResults(data);
      if (!data.length) showToast("No encontramos lugares con ese nombre.", "info");
    } catch {
      showToast("No se pudo buscar en el mapa. Puedes marcar el punto manualmente.", "error");
    } finally {
      setSearching(false);
    }
  };

  if (!isAdmin) {
    return (
      <EmptyState
        title="Acceso restringido"
        description="Solo los administradores editan la ruta y el itinerario."
        action={<Link to={`/staff/trips/${tripId}`} className={buttonClasses({ variant: "secondary" })}>Volver al viaje</Link>}
      />
    );
  }
  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }
  if (tripsQuery.isLoading) return <PageLoader label="Cargando mapa…" />;
  if (!trip) {
    return <EmptyState title="Viaje no encontrado" description="Puede que se haya eliminado." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/staff/trips/${tripId}`}
        backLabel="Volver al viaje"
        eyebrow="Ruta e itinerario"
        title={trip.title}
        subtitle={`${trip.destination} · ${formatTripDetailDate(trip.startDate)}`}
      />

      <div className="rounded-card bg-white p-3 shadow-layer-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={mode === "origin" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode(mode === "origin" ? "pan" : "origin")}
          >
            <MapPin className="size-4" />
            Marcar origen
          </Button>
          <Button
            variant={mode === "poi" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode(mode === "poi" ? "pan" : "poi")}
          >
            <Plus className="size-4" />
            Agregar punto
          </Button>
          <Button
            variant={mode === "destination" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode(mode === "destination" ? "pan" : "destination")}
          >
            <Flag className="size-4" />
            Marcar destino
          </Button>
          <span className="ml-auto text-label-sm text-on-surface-variant">
            {mode === "pan"
              ? "Modo navegación: toca un marcador para editar"
              : mode === "origin"
                ? "Toca el mapa para fijar el origen"
                : mode === "destination"
                  ? "Toca el mapa para fijar el destino"
                  : "Toca el mapa para agregar un punto de interés"}
          </span>
        </div>

        <form onSubmit={runSearch} className="mt-2 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-[12px] border-[1.5px] border-input-border px-3">
            <Search className="size-4 text-outline" />
            <span className="sr-only">Buscar lugar</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar lugar (OpenStreetMap)…"
              className="h-11 min-w-0 flex-1 bg-transparent text-body-md outline-none placeholder:text-outline"
            />
          </label>
          <Button type="submit" variant="secondary" size="md" loading={searching}>
            Buscar
          </Button>
        </form>

        {searchResults.length ? (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-[12px] border border-surface-container-high">
            {searchResults.map((result) => (
              <div key={`${result.lat}-${result.lon}`} className="border-b border-surface-container-high p-2.5 last:border-0">
                <p className="text-body-sm text-on-surface">{result.display_name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg bg-mint px-2 py-1 text-label-sm text-primary-container"
                    onClick={() => {
                      const lat = Number(result.lat);
                      const lon = Number(result.lon);
                      setFocus({ lat, lng: lon, zoom: 15 });
                    }}
                  >
                    Centrar
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant"
                    onClick={() => openPoiCreate({ lat: Number(result.lat), lng: Number(result.lon) })}
                  >
                    Agregar como punto
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          <MapView
            markers={markers}
            polyline={polyline}
            focus={focus}
            className="h-[420px]"
            onMapClick={(lat, lng) => {
              if (mode === "pan") return;
              handleMapClick(lat, lng);
            }}
            onMarkerClick={(markerId) => {
              if (markerId.startsWith("poi-")) {
                const poi = pois.find((item) => `poi-${item.id}` === markerId);
                if (poi) openPoiEdit(poi);
              }
            }}
          />
        </div>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          El trazo es referencial (línea recta entre puntos), no es ruteo por carretera.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <SectionCard title="Resumen de ruta" icon={<MapPin className="size-5" />}>
          <div className="space-y-2 text-body-md">
            <div className="rounded-[12px] bg-surface-container-low p-3">
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Origen</p>
              <p className="text-on-surface">
                {trip.originLatitude != null && trip.originLongitude != null
                  ? `${trip.originLatitude.toFixed(5)}, ${trip.originLongitude.toFixed(5)}`
                  : "Sin marcar"}
              </p>
            </div>
            <div className="rounded-[12px] bg-surface-container-low p-3">
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">Destino</p>
              <p className="text-on-surface">
                {trip.destinationLatitude != null && trip.destinationLongitude != null
                  ? `${trip.destinationLatitude.toFixed(5)}, ${trip.destinationLongitude.toFixed(5)}`
                  : "Sin marcar"}
              </p>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {pois.length} punto(s) de interés. Los cambios se guardan al instante.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Itinerario"
          subtitle="Puntos de interés ordenados"
          icon={<MapPin className="size-5" />}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode("poi");
                showToast("Toca el mapa para elegir la ubicación del nuevo punto.", "info");
              }}
            >
              <Plus className="size-3.5" />
              Nuevo
            </Button>
          }
        >
          {pois.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">
              Agrega puntos de interés para describir las paradas del viaje.
            </p>
          ) : (
            <ol className="space-y-2">
              {pois
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((poi, index) => (
                  <li key={poi.id} className="flex items-start justify-between gap-2 rounded-[12px] border border-surface-container-high p-3">
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-body-md text-on-surface">{poi.name ?? `Punto ${index + 1}`}</p>
                        {poi.description ? (
                          <p className="text-body-sm text-on-surface-variant">{poi.description}</p>
                        ) : null}
                        <p className="text-label-sm text-outline">
                          {poi.latitude.toFixed(5)}, {poi.longitude.toFixed(5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openPoiEdit(poi)} aria-label="Editar punto">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(poi)} aria-label="Eliminar punto">
                        <Trash2 className="size-3.5 text-error" />
                      </Button>
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </SectionCard>
      </div>

      <Modal
        open={poiModal}
        onClose={() => setPoiModal(false)}
        title={editingPoi ? "Editar punto de interés" : "Agregar punto de interés"}
        description={
          poiCoords
            ? `Coordenadas: ${poiCoords.lat.toFixed(5)}, ${poiCoords.lng.toFixed(5)}`
            : "Toca el mapa antes de guardar para elegir las coordenadas."
        }
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPoiModal(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              loading={poiMutation.isPending}
              disabled={!poiCoords || !poiName.trim()}
              onClick={() => poiMutation.mutate()}
            >
              <Check className="size-4" />
              Guardar punto
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <TextField
            label="Nombre"
            value={poiName}
            maxLength={200}
            onChange={(event) => setPoiName(event.target.value)}
            placeholder="Pozo Azul"
          />
          <TextArea
            label="Descripción (opcional)"
            value={poiDescription}
            maxLength={1000}
            onChange={(event) => setPoiDescription(event.target.value)}
          />
          {!poiCoords ? (
            <p className="text-body-sm text-[#78350F]">
              Aún no hay coordenadas. Cierra este modal y toca el mapa en el lugar deseado.
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar punto de interés"
        description="Se eliminará del itinerario y se reordenarán las paradas."
        tone="danger"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p className={cn("text-body-md text-on-surface")}>{deleteTarget?.name}</p>
      </ConfirmDialog>
    </div>
  );
}
