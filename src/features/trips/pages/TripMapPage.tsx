import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getTrip } from "@/features/trips/api";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { MapView, type MapMarker } from "@/shared/components/map/MapView";
import { PageLoader } from "@/shared/components/ui/Media";
import { SectionCard } from "@/shared/components/ui/Section";
import { PageHeader } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatTripDetailDate } from "@/shared/lib/dates";

export function TripMapPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const tripQuery = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: Number.isFinite(tripId),
  });
  const trip = tripQuery.data;
  useDocumentTitle(trip ? `Mapa · ${trip.title}` : "Mapa del viaje");

  const markers = useMemo<MapMarker[]>(() => {
    if (!trip) return [];
    const result: MapMarker[] = [];
    if (trip.originLatitude != null && trip.originLongitude != null) {
      result.push({
        id: "origin",
        lat: trip.originLatitude,
        lng: trip.originLongitude,
        label: "Punto de partida",
        kind: "origin",
      });
    }
    (trip.pointsOfInterest ?? []).forEach((poi, index) => {
      result.push({
        id: `poi-${poi.id}`,
        lat: poi.latitude,
        lng: poi.longitude,
        label: poi.name ?? `Parada ${index + 1}`,
        kind: "poi",
        index: index + 1,
      });
    });
    if (trip.destinationLatitude != null && trip.destinationLongitude != null) {
      result.push({
        id: "destination",
        lat: trip.destinationLatitude,
        lng: trip.destinationLongitude,
        label: "Punto de llegada",
        kind: "destination",
      });
    }
    return result;
  }, [trip]);

  const polyline = useMemo<Array<[number, number]>>(
    () => markers.map((marker) => [marker.lat, marker.lng]),
    [markers],
  );

  if (tripQuery.isLoading) return <PageLoader label="Cargando el mapa…" />;
  if (tripQuery.isError || !trip) {
    return (
      <ErrorState
        message={errorMessage(tripQuery.error) || "No encontramos este viaje."}
        onRetry={() => void tripQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/trips/${trip.id}`}
        backLabel="Volver al viaje"
        eyebrow="Ruta e itinerario"
        title={trip.title}
        subtitle={`${trip.destination} · ${formatTripDetailDate(trip.startDate)}`}
      />

      {markers.length === 0 ? (
        <EmptyState
          title="Este viaje todavía no tiene ruta publicada"
          description="La agencia está preparando el itinerario. Te avisaremos en cuanto esté disponible."
        />
      ) : null}

      <div className="overflow-hidden rounded-card bg-white shadow-layer-1">
        <MapView markers={markers} polyline={polyline} className="h-[380px] sm:h-[460px]" />
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-body-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Navigation className="size-4 text-secondary" />
            {markers.length} punto{markers.length === 1 ? "" : "s"} en el mapa
          </span>
          <span className="text-label-sm">Trazo referencial, no es ruta por carretera</span>
        </div>
      </div>

      <SectionCard title="Itinerario" subtitle="Paradas planeadas del viaje" icon={<MapPin className="size-5" />}>
        {markers.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Sin paradas registradas.</p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-mint pl-5">
            {markers.map((marker, index) => (
              <li key={marker.id} className="relative">
                <span
                  className="absolute -left-[27px] top-0.5 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{
                    backgroundColor:
                      marker.kind === "origin"
                        ? "#006C49"
                        : marker.kind === "destination"
                          ? "#BA1A1A"
                          : "#1D4ED8",
                  }}
                >
                  {marker.kind === "origin" ? "O" : marker.kind === "destination" ? "D" : index}
                </span>
                <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                  {marker.kind === "origin"
                    ? "Punto de partida"
                    : marker.kind === "destination"
                      ? "Punto de llegada"
                      : `Parada ${marker.index ?? index}`}
                </p>
                <p className="text-title-md text-on-surface">{marker.label}</p>
                {marker.kind === "poi" ? (
                  <p className="text-body-sm text-on-surface-variant">
                    {(trip.pointsOfInterest ?? []).find((poi) => `poi-${poi.id}` === marker.id)
                      ?.description ?? ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
