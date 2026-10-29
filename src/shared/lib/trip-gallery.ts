import type { TripImage } from "@/shared/api/types";

export type GalleryImage = {
  id?: number;
  url: string;
};

export function buildTripGallery(
  images?: TripImage[] | null,
  fallbackUrl?: string | null,
): GalleryImage[] {
  const ordered = [...(images ?? [])]
    .filter((image) => Boolean(image.url))
    .sort((a, b) => a.order - b.order || a.id - b.id)
    .map((image) => ({ id: image.id, url: image.url }));

  if (ordered.length) return ordered;
  return fallbackUrl ? [{ url: fallbackUrl }] : [];
}
