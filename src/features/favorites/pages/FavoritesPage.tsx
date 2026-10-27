import { HeartOff, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useFavorites, useToggleFavorite } from "@/features/favorites/hooks";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { TripCard } from "@/shared/components/trips/TripCard";
import { buttonClasses } from "@/shared/components/ui/Button";
import { CardSkeleton } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export function FavoritesPage() {
  const favoritesQuery = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { showToast } = useToast();
  useDocumentTitle("Mis favoritos");

  const favorites = favoritesQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Guardados"
        title="Tus favoritos"
        subtitle="Los viajes que te robaron el aliento. Vuelve cuando quieras."
        backTo="/explore"
        backLabel="Seguir explorando"
      />

      {favoritesQuery.isError ? (
        <ErrorState
          message="No pudimos cargar tus favoritos."
          onRetry={() => void favoritesQuery.refetch()}
        />
      ) : favoritesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          title="Aún no tienes viajes favoritos"
          description="Usa el corazón en cualquier viaje para guardarlo aquí y comparar después."
          action={
            <Link to="/explore" className={buttonClasses({ variant: "primary" })}>
              <Heart className="size-4" />
              Explorar viajes
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-body-sm text-on-surface-variant">
            {favorites.length} viaje{favorites.length === 1 ? "" : "s"} guardado
            {favorites.length === 1 ? "" : "s"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                favorite
                onToggleFavorite={() =>
                  toggleFavorite.mutate(
                    { tripId: trip.id, favorite: true },
                    {
                      onSuccess: () => showToast("Viaje quitado de favoritos.", "success"),
                      onError: () => showToast("No se pudo actualizar el favorito.", "error"),
                    },
                  )
                }
              />
            ))}
          </div>
          <p className="flex items-center justify-center gap-2 pt-2 text-body-sm text-on-surface-variant">
            <HeartOff className="size-4" />
            Toca el corazón para quitar un viaje de tu lista.
          </p>
        </>
      )}
    </div>
  );
}
