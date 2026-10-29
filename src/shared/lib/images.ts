export const MAX_TRIP_IMAGES = 10;
export const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const OPTIMIZED_MAX_DIMENSION = 1920;
const OPTIMIZED_QUALITY = 0.82;
const CLIENT_OPTIMIZE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAllowedImage(file: File): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

export function validateImageFiles(
  files: File[],
  remainingSlots: number,
): { accepted: File[]; errors: string[] } {
  const errors: string[] = [];
  const accepted: File[] = [];

  for (const file of files) {
    if (!isAllowedImage(file)) {
      errors.push(`${file.name}: usa JPG, PNG o WebP.`);
      continue;
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_INPUT_BYTES) {
      errors.push(`${file.name}: el tamaño máximo es 20 MB.`);
      continue;
    }
    accepted.push(file);
  }

  if (accepted.length > remainingSlots) {
    errors.push(
      remainingSlots <= 0
        ? `Ya tienes el máximo de ${MAX_TRIP_IMAGES} imágenes por viaje.`
        : `Solo se agregaron ${remainingSlots} imagen(es); el máximo es ${MAX_TRIP_IMAGES} por viaje.`,
    );
    accepted.splice(Math.max(0, remainingSlots));
  }

  return { accepted, errors };
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

/**
 * Reduce imágenes grandes antes de subirlas para evitar enviar archivos de
 * varios MB. El API vuelve a validar y a re-encodear a 1920 px, así que esto es
 * una optimización de red, no la única barrera.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  if (typeof document === "undefined" || !isAllowedImage(file)) return file;

  let source: ImageBitmap | HTMLImageElement | null = null;
  try {
    if (typeof createImageBitmap === "function") {
      source = await createImageBitmap(file);
    } else {
      source = await loadImageElement(file);
    }

    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) return file;

    const requiresResize = width > OPTIMIZED_MAX_DIMENSION || height > OPTIMIZED_MAX_DIMENSION;
    if (!requiresResize && file.size <= CLIENT_OPTIMIZE_THRESHOLD_BYTES) return file;

    const scale = Math.min(1, OPTIMIZED_MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", OPTIMIZED_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    if (source && "close" in source && typeof source.close === "function") source.close();
  }
}
