import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMyRating, getTrip, upsertRating } from "@/features/trips/api";
import { errorMessage } from "@/shared/api/client";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { CoverImage, PageLoader } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { StarRating, ratingLabel } from "@/shared/components/ui/StarRating";
import { TextArea } from "@/shared/components/ui/Form";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatTripDetailDate } from "@/shared/lib/dates";
import { AGENCY } from "@/shared/lib/agency";

export function RateTripPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tripQuery = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: Number.isFinite(tripId),
  });
  const ratingQuery = useQuery({
    queryKey: ["myRating", tripId],
    queryFn: () => getMyRating(tripId),
    enabled: Number.isFinite(tripId),
    retry: false,
  });
  const trip = tripQuery.data;
  useDocumentTitle(trip ? `Calificar · ${trip.title}` : "Calificar viaje");

  useEffect(() => {
    if (ratingQuery.data) {
      setRating(ratingQuery.data.rating);
      setComment(ratingQuery.data.comment ?? "");
    }
  }, [ratingQuery.data]);

  const mutation = useMutation({
    mutationFn: () => upsertRating(tripId, rating, comment.trim() || null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myRating", tripId] });
      void queryClient.invalidateQueries({ queryKey: ["booking"] });
      showToast("¡Gracias por compartir tu experiencia!", "success");
      navigate("/bookings");
    },
    onError: (mutationError) => {
      const message = errorMessage(mutationError);
      setError(message);
      showToast(message, "error");
    },
  });

  if (!Number.isFinite(tripId)) {
    return <ErrorState message="El enlace no es válido." />;
  }
  if (tripQuery.isLoading) return <PageLoader label="Cargando el viaje…" />;
  if (tripQuery.isError || !trip) {
    return (
      <ErrorState
        message={errorMessage(tripQuery.error) || "No encontramos este viaje."}
        onRetry={() => void tripQuery.refetch()}
      />
    );
  }

  const submit = () => {
    setError(null);
    if (rating < 1 || rating > 5) {
      setError("Indica una calificación del 1 al 5.");
      return;
    }
    mutation.mutate();
  };

  const existing = ratingQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        backTo="/bookings"
        backLabel="Volver a mis viajes"
        eyebrow="Tu experiencia"
        title={existing ? "Actualiza tu calificación" : "Califica tu viaje"}
        subtitle="Tu opinión ayuda a otros viajeros y nos hace mejores."
      />

      <div className="overflow-hidden rounded-card bg-white shadow-layer-1">
        <div className="relative">
          <CoverImage src={trip.imageUrl} alt={trip.title} ratio="aspect-[16/7]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-body-sm text-white/80">{trip.destination}</p>
            <h2 className="text-headline-md">{trip.title}</h2>
            <p className="text-body-sm first-letter:uppercase text-white/80">
              {formatTripDetailDate(trip.startDate)}
            </p>
          </div>
        </div>

        <div className="p-5">
          {!trip.finalized ? (
            <div className="mb-4 rounded-[12px] bg-pending p-3 text-body-sm text-[#78350F]">
              Este viaje aún no ha finalizado. Podrás calificarlo cuando la agencia cierre la
              operación.
            </div>
          ) : null}

          <div className="text-center">
            <p className="text-headline-sm text-on-surface">¿Cómo fue tu experiencia?</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Toca las estrellas para calificar
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <StarRating value={rating} onChange={setRating} size="lg" />
              <p className="text-title-md text-secondary">
                {rating > 0 ? ratingLabel(rating) : "Sin calificación"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <TextArea
              label="Comentario (opcional)"
              value={comment}
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="¿Qué fue lo mejor del viaje? ¿Qué podríamos mejorar?"
              hint={`${comment.length}/1000 caracteres`}
            />
          </div>

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
              disabled={!trip.finalized || rating < 1}
              onClick={submit}
            >
              <Star className="size-4" />
              {existing ? "Actualizar calificación" : "Guardar calificación"}
            </Button>
            <Link
              to="/bookings"
              className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-button border-[1.5px] border-input-border bg-white px-5 text-label-lg text-on-surface hover:border-emerald"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-card bg-white p-4 text-center shadow-layer-1">
        <p className="text-body-sm text-on-surface-variant">
          ¿Algo no salió como esperabas? Escríbenos y lo revisamos juntos.
        </p>
        <a
          href={`https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(
            `Hola, quiero compartir mi experiencia del viaje "${trip.title}".`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-label-md text-secondary hover:underline"
        >
          <MessageCircle className="size-4" />
          Contactar a la agencia
        </a>
      </div>
    </div>
  );
}
