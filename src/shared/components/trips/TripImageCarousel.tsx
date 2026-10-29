import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { TripImage } from "@/shared/api/types";
import { CoverImage } from "@/shared/components/ui/Media";
import { cn } from "@/shared/lib/cn";
import { buildTripGallery } from "@/shared/lib/trip-gallery";

export function TripImageCarousel({
  images,
  fallbackUrl,
  alt,
  ratio = "aspect-[16/10]",
  overlay,
  className,
  priority = false,
  onImageClick,
}: {
  images?: TripImage[] | null;
  fallbackUrl?: string | null;
  alt: string;
  ratio?: string;
  overlay?: ReactNode;
  className?: string;
  priority?: boolean;
  onImageClick?: (index: number) => void;
}) {
  const gallery = useMemo(
    () => buildTripGallery(images, fallbackUrl),
    [images, fallbackUrl],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  if (gallery.length === 0) {
    return <CoverImage src={null} alt={alt} ratio={ratio} className={className} />;
  }

  const currentIndex = activeIndex % gallery.length;
  const currentImage = gallery[currentIndex];
  const hasMultiple = gallery.length > 1;
  const imageAlt = hasMultiple ? `${alt} (${currentIndex + 1} de ${gallery.length})` : alt;

  return (
    <div
      className={cn("bg-surface-container-high", className)}
      aria-roledescription="carrusel"
      aria-label={`Imágenes de ${alt}`}
    >
      <div className={cn("relative overflow-hidden", ratio)}>
        <img
          src={currentImage.url}
          alt={imageAlt}
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover"
        />
        {onImageClick ? (
          <button
            type="button"
            aria-label="Ampliar imagen"
            onClick={() => onImageClick(currentIndex)}
            className="absolute inset-0 z-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
          />
        ) : null}
        {overlay}
        {hasMultiple ? (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={() =>
                setActiveIndex((currentIndex - 1 + gallery.length) % gallery.length)
              }
              className="absolute top-1/2 left-2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-slate/60 text-white shadow-sm transition hover:bg-slate/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={() => setActiveIndex((currentIndex + 1) % gallery.length)}
              className="absolute top-1/2 right-2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-slate/60 text-white shadow-sm transition hover:bg-slate/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>
      {hasMultiple ? (
        <div className="flex items-center gap-2 p-2" aria-label="Miniaturas">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {gallery.map((image, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={`${image.id ?? "respaldo"}-${image.url}`}
                  type="button"
                  aria-label={`Ver imagen ${index + 1} de ${gallery.length}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                    isActive ? "ring-secondary" : "opacity-70 ring-transparent hover:opacity-100",
                  )}
                >
                  <img
                    src={image.url}
                    alt={`Miniatura ${index + 1} de ${alt}`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </button>
              );
            })}
          </div>
          <span className="shrink-0 px-1 text-label-sm text-on-surface-variant">
            {currentIndex + 1} / {gallery.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}
