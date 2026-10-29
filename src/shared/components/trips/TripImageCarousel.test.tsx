import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TripImage } from "@/shared/api/types";
import { TripImageCarousel } from "@/shared/components/trips/TripImageCarousel";

function makeImage(overrides: Partial<TripImage> & Pick<TripImage, "id" | "url" | "order">): TripImage {
  return {
    tripId: 1,
    isCover: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TripImageCarousel", () => {
  it("ordena las imágenes y navega con flechas y miniaturas", () => {
    const images = [
      makeImage({ id: 2, order: 2, url: "https://cdn.test/dos.jpg" }),
      makeImage({ id: 1, order: 1, url: "https://cdn.test/uno.jpg", isCover: true }),
    ];

    render(<TripImageCarousel images={images} alt="Viaje a Oaxaca" />);

    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (1 de 2)" }),
    ).toHaveAttribute("src", "https://cdn.test/uno.jpg");
    expect(screen.getAllByRole("button", { name: /Ver imagen/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));

    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (2 de 2)" }),
    ).toHaveAttribute("src", "https://cdn.test/dos.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Ver imagen 1 de 2" }));

    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (1 de 2)" }),
    ).toHaveAttribute("src", "https://cdn.test/uno.jpg");
  });

  it("muestra el contador junto a las miniaturas y lo actualiza", () => {
    const images = [
      makeImage({ id: 1, order: 1, url: "https://cdn.test/uno.jpg" }),
      makeImage({ id: 2, order: 2, url: "https://cdn.test/dos.jpg" }),
    ];

    render(<TripImageCarousel images={images} alt="Viaje a Oaxaca" />);
    const thumbnails = screen.getByLabelText("Miniaturas");

    expect(within(thumbnails).getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));

    expect(within(thumbnails).getByText("2 / 2")).toBeInTheDocument();
  });

  it("carga la imagen principal con prioridad cuando se solicita", () => {
    render(
      <TripImageCarousel
        images={[]}
        fallbackUrl="https://cdn.test/portada.jpg"
        alt="Viaje prioritario"
        priority
      />,
    );

    expect(screen.getByRole("img", { name: "Viaje prioritario" })).toHaveAttribute(
      "loading",
      "eager",
    );
  });

  it("vuelve a la última imagen al retroceder desde la primera", () => {
    const images = [
      makeImage({ id: 1, order: 1, url: "https://cdn.test/uno.jpg" }),
      makeImage({ id: 2, order: 2, url: "https://cdn.test/dos.jpg" }),
    ];

    render(<TripImageCarousel images={images} alt="Viaje a Oaxaca" />);
    fireEvent.click(screen.getByRole("button", { name: "Imagen anterior" }));

    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (2 de 2)" }),
    ).toHaveAttribute("src", "https://cdn.test/dos.jpg");
  });

  it("usa imageUrl como respaldo cuando el viaje no tiene galería", () => {
    render(
      <TripImageCarousel
        images={[]}
        fallbackUrl="https://cdn.test/portada.jpg"
        alt="Viaje sin galería"
      />,
    );

    expect(screen.getByRole("img", { name: "Viaje sin galería" })).toHaveAttribute(
      "src",
      "https://cdn.test/portada.jpg",
    );
    expect(
      screen.queryByRole("button", { name: "Imagen siguiente" }),
    ).not.toBeInTheDocument();
  });

  it("muestra el placeholder cuando no hay ninguna imagen", () => {
    render(<TripImageCarousel images={[]} fallbackUrl={null} alt="Viaje vacío" />);

    expect(screen.getByText("Proxima Parada")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
