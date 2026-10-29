import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { TripImage } from "@/shared/api/types";
import { CoverImage } from "@/shared/components/ui/Media";
import { cn } from "@/shared/lib/cn";

export function TripImageCarousel({
  images,
  fallbackUrl,
  alt,
  ratio = "aspect-[16/10]",
  overlay,
  className,
}: {
  images?: TripImage[] | null;
  fallbackUrl?: string | null;
  alt: string;
  ratio?: string;
  overlay?: ReactNode;
  className?: string;
}) {
  const gallery = useMemo<{ id?: number; url: string }[]>(() => {
    const ordered = [...(images ?? [])]
      .filter((image) => Boolean(image.url))
      .sort((a, b) => a.order - b.order || a.id - b.id)
      .map((image) => ({ id: image.id, url: image.url }));
    if (ordered.length) return ordered;
    return fallbackUrl ? [{ url: fallbackUrl }] : [];
  }, [images, fallbackUrl]);

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
          loading="lazy"
          className="size-full object-cover"
        />
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
            <span className="absolute top-2 right-2 z-10 rounded-full bg-slate/70 px-2 py-1 text-label-sm text-white">
              {currentIndex + 1} / {gallery.length}
            </span>
          </>
        ) : null}
      </div>
      {hasMultiple ? (
        <div className="flex gap-2 overflow-x-auto p-2" aria-label="Miniaturas">
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
      ) : null}
    </div>
  );
}
