import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "@/shared/components/ui/ImageLightbox";

const images = [
  { id: 1, url: "https://cdn.test/uno.jpg" },
  { id: 2, url: "https://cdn.test/dos.jpg" },
  { id: 3, url: "https://cdn.test/tres.jpg" },
];

function renderLightbox(initialIndex = 0, onClose = vi.fn()) {
  render(
    <ImageLightbox
      images={images}
      initialIndex={initialIndex}
      alt="Viaje a Oaxaca"
      onClose={onClose}
    />,
  );
  return onClose;
}

describe("ImageLightbox", () => {
  it("muestra la imagen inicial y navega entre todas las imágenes", () => {
    renderLightbox(1);

    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (2 de 3)" }),
    ).toHaveAttribute("src", "https://cdn.test/dos.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (3 de 3)" }),
    ).toHaveAttribute("src", "https://cdn.test/tres.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Imagen anterior" }));
    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (2 de 3)" }),
    ).toHaveAttribute("src", "https://cdn.test/dos.jpg");
  });

  it("hace zoom con los botones y lo restablece", () => {
    renderLightbox();

    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(screen.getByText("150%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alejar" }));
    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer zoom" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("hace zoom con la rueda del mouse", () => {
    renderLightbox();
    const stage = screen.getByTestId("lightbox-stage");

    fireEvent.wheel(stage, { deltaY: -100 });
    expect(screen.getByText("150%")).toBeInTheDocument();

    fireEvent.wheel(stage, { deltaY: 100 });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("permite arrastrar la imagen cuando hay zoom", () => {
    renderLightbox();
    const stage = screen.getByTestId("lightbox-stage");
    Object.defineProperty(stage, "getBoundingClientRect", {
      value: () => ({
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    fireEvent.pointerDown(stage, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 150, clientY: 130 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 150, clientY: 130 });

    expect(screen.getByRole("img").style.transform).toContain(
      "translate3d(50px, 30px, 0)",
    );
  });

  it("hace zoom con pinch en móvil", () => {
    renderLightbox();
    const stage = screen.getByTestId("lightbox-stage");

    fireEvent.pointerDown(stage, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerDown(stage, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 0,
      clientY: 100,
    });
    fireEvent.pointerMove(stage, {
      pointerId: 2,
      clientX: 0,
      clientY: 200,
    });

    expect(screen.getByText("200%")).toBeInTheDocument();
  });

  it("reinicia el zoom al cambiar de imagen", () => {
    renderLightbox();

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(screen.getByText("150%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Viaje a Oaxaca (2 de 3)" }),
    ).toBeInTheDocument();
  });

  it("cierra con el botón y con Escape", () => {
    const onClose = renderLightbox();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar visor" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("cierra al tocar el fondo pero no al tocar la imagen", () => {
    const onClose = renderLightbox();

    fireEvent.click(screen.getByRole("img"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("lightbox-stage"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
