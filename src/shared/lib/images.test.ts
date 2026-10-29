import { describe, expect, it } from "vitest";
import { MAX_TRIP_IMAGES, formatBytes, validateImageFiles } from "@/shared/lib/images";

function image(name: string, type = "image/jpeg", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("selección de imágenes de viaje", () => {
  it("limita la selección al cupo restante", () => {
    const files = Array.from({ length: 3 }, (_, i) => image(`foto-${i}.jpg`));
    const result = validateImageFiles(files, 2);
    expect(result.accepted).toHaveLength(2);
    expect(result.errors.join(" ")).toContain("máximo");
  });

  it("rechaza formatos no permitidos y archivos vacíos", () => {
    const result = validateImageFiles(
      [image("doc.pdf", "application/pdf"), image("vacia.jpg", "image/jpeg", 0)],
      10,
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });

  it("acepta hasta el máximo por viaje", () => {
    const files = Array.from({ length: MAX_TRIP_IMAGES }, (_, i) => image(`foto-${i}.webp`, "image/webp"));
    const result = validateImageFiles(files, MAX_TRIP_IMAGES);
    expect(result.accepted).toHaveLength(MAX_TRIP_IMAGES);
    expect(result.errors).toHaveLength(0);
  });

  it("formatea tamaños legibles", () => {
    expect(formatBytes(800)).toBe("1 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
