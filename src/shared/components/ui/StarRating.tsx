import { Star } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function StarRating({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dimensions = { sm: "size-4", md: "size-6", lg: "size-9" };
  const interactive = Boolean(onChange);

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`Calificación: ${value} de 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (!interactive) {
          return (
            <Star
              key={star}
              className={cn(
                dimensions[size],
                filled ? "fill-amber text-amber" : "fill-transparent text-outline-variant",
              )}
              aria-hidden="true"
            />
          );
        }
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} estrella${star === 1 ? "" : "s"}`}
            onClick={() => onChange?.(star)}
            className="rounded p-0.5 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald"
          >
            <Star
              className={cn(
                dimensions[size],
                filled ? "fill-amber text-amber" : "fill-transparent text-outline-variant",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

export function ratingLabel(rating: number) {
  if (rating >= 5) return "Excelente";
  if (rating === 4) return "Muy bueno";
  if (rating === 3) return "Bueno";
  if (rating === 2) return "Regular";
  if (rating === 1) return "Malo";
  return "Sin calificación";
}
