import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/shared/lib/cn";

export type MapMarkerKind = "origin" | "poi" | "destination" | "default";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  kind?: MapMarkerKind;
  index?: number;
};

type MapViewProps = {
  markers: MapMarker[];
  polyline?: Array<[number, number]>;
  className?: string;
  center?: [number, number];
  zoom?: number;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
};

const CDMX: [number, number] = [19.4326, -99.1332];

function iconHtml(marker: MapMarker): string {
  const kind = marker.kind ?? "default";
  const base =
    "display:flex;align-items:center;justify-content:center;border-radius:9999px;color:#fff;font-weight:700;font-family:Inter,sans-serif;border:2px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,.3);";
  if (kind === "origin") {
    return `<div style="${base}width:34px;height:34px;background:#006C49;font-size:14px;">O</div>`;
  }
  if (kind === "destination") {
    return `<div style="${base}width:34px;height:34px;background:#BA1A1A;font-size:14px;">D</div>`;
  }
  if (kind === "poi") {
    return `<div style="${base}width:30px;height:30px;background:#1D4ED8;font-size:12px;">${marker.index ?? "•"}</div>`;
  }
  return `<div style="${base}width:30px;height:30px;background:#14532D;font-size:12px;">•</div>`;
}

export function MapView({
  markers,
  polyline,
  className,
  center,
  zoom = 12,
  focus,
  onMapClick,
  onMarkerClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const clickHandler = useRef(onMapClick);
  const markerHandler = useRef(onMarkerClick);

  clickHandler.current = onMapClick;
  markerHandler.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: center ?? CDMX,
      zoom,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      clickHandler.current?.(event.latlng.lat, event.latlng.lng);
    });
    mapRef.current = map;
    layerRef.current = layer;
    window.setTimeout(() => map.invalidateSize(), 50);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.flyTo([focus.lat, focus.lng], focus.zoom ?? 14, { duration: 0.8 });
    }
  }, [focus]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    markers.forEach((marker) => {
      const icon = L.divIcon({
        html: iconHtml(marker),
        className: "ppt-map-marker",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const instance = L.marker([marker.lat, marker.lng], { icon }).addTo(layer);
      if (marker.label) {
        const tooltip = document.createElement("span");
        tooltip.textContent = marker.label;
        instance.bindTooltip(tooltip, { direction: "top", offset: [0, -14] });
      }
      instance.on("click", () => markerHandler.current?.(marker.id));
    });

    if (polyline && polyline.length > 1) {
      L.polyline(polyline, {
        color: "#006C49",
        weight: 4,
        opacity: 0.8,
        dashArray: "8 8",
      }).addTo(layer);
    }

    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((marker) => [marker.lat, marker.lng]));
      map.fitBounds(bounds.pad(0.15), { maxZoom: 14 });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], Math.max(map.getZoom(), 13));
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [markers, polyline, center, zoom]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa del viaje"
      className={cn("relative z-0 h-72 w-full overflow-hidden rounded-card bg-surface-container", className)}
    />
  );
}
