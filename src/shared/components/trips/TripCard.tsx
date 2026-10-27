import { ArrowRight, Bus, CalendarDays, Clock3, Heart, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { Trip } from "@/shared/api/types";
import { Badge } from "@/shared/components/ui/Badge";
import { buttonClasses } from "@/shared/components/ui/Button";
import { CoverImage } from "@/shared/components/ui/Media";
import { formatTripCardDate } from "@/shared/lib/dates";
import { formatMxn } from "@/shared/lib/money";
import { displayPrice, isBookingClosed, transportLabel } from "@/shared/lib/trip";
import { cn } from "@/shared/lib/cn";

type TripCardProps = {
  trip: Trip;
  favorite?: boolean;
  onToggleFavorite?: (tripId: number) => void;
};

export function TripCard({ trip, favorite, onToggleFavorite }: TripCardProps) {
  const seats = trip.availableSeats;
  const lowSeats = seats > 0 && seats <= 3;
  const closed = isBookingClosed(trip);
  const durationDays = Math.max(
    1,
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000,
    ),
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-layer-1 transition hover:-translate-y-0.5 hover:shadow-layer-2">
      <div className="relative">
        <Link to={`/trips/${trip.id}`} aria-label={`Ver ${trip.title}`}>
          <CoverImage src={trip.imageUrl} alt={trip.title} ratio="aspect-[16/10]" />
        </Link>
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge className="bg-white/90 backdrop-blur">
            <Bus className="size-3.5" />
            {transportLabel(trip.transportType)}
          </Badge>
          {!trip.isActive ? <Badge tone="cancelled">Pausado</Badge> : null}
        </div>
        <button
          type="button"
          aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite?.(trip.id)}
          className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-[12px] bg-white/90 text-primary-container shadow-layer-2 backdrop-blur-[8px] transition active:scale-95"
        >
          <Heart className={cn("size-5", favorite && "fill-emerald text-emerald")} />
        </button>
        <div className="absolute bottom-3 left-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-md shadow-sm backdrop-blur",
              seats <= 0
                ? "bg-error-container text-on-error-container"
                : lowSeats
                  ? "bg-pending text-[#78350F]"
                  : "bg-white/95 text-primary-container",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                seats <= 0 ? "bg-error" : lowSeats ? "bg-amber" : "bg-emerald",
              )}
            />
            {seats <= 0
              ? "Sin cupo"
              : lowSeats
                ? `Últimos ${seats} lugares`
                : `${seats} asientos disponibles`}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
          <MapPin className="size-3.5 text-secondary" />
          <span className="truncate">{trip.destination}</span>
          {trip.category ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-secondary">{trip.category}</span>
            </>
          ) : null}
        </div>
        <Link to={`/trips/${trip.id}`}>
          <h3 className="text-headline-sm text-on-surface transition group-hover:text-primary-container">
            {trip.title}
          </h3>
        </Link>
        {trip.description ? (
          <p className="line-clamp-2 text-body-md text-on-surface-variant">
            {trip.description.replace(/\*\*/g, "").replace(/\n+/g, " ")}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 text-label-md first-letter:uppercase">
            <CalendarDays className="size-3.5" />
            {formatTripCardDate(trip.startDate)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-label-md">
            <Clock3 className="size-3.5" />
            {durationDays} {durationDays === 1 ? "día" : "días"}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-body-sm text-on-surface-variant">Desde</p>
            <p className="text-price-display text-primary-container">
              {formatMxn(displayPrice(trip))}
            </p>
            <p className="text-body-sm text-on-surface-variant">por persona</p>
          </div>
          <Link
            to={`/trips/${trip.id}`}
            className={buttonClasses({ variant: closed ? "outline" : "primary", size: "md" })}
          >
            {closed ? (
              <>
                <Users className="size-4" />
                Ver viaje
              </>
            ) : (
              <>
                Ver detalles
                <ArrowRight className="size-4" />
              </>
            )}
          </Link>
        </div>
      </div>
    </article>
  );
}
