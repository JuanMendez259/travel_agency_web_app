import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Modal } from "@/shared/components/ui/Modal";

function Harness() {
  const [value, setValue] = useState("");
  return (
    <Modal open onClose={() => undefined} title="Eliminar viaje">
      <label>
        Motivo
        <textarea value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
    </Modal>
  );
}

describe("Modal", () => {
  it("mantiene el foco en el campo mientras el padre se vuelve a renderizar", async () => {
    render(<Harness />);
    const field = screen.getByLabelText("Motivo");
    await waitFor(() => expect(field).toHaveFocus());

    fireEvent.change(field, { target: { value: "Viaje de prueba" } });
    // Deja correr el temporizador de foco del modal: antes del arreglo, cada
    // cambio devolvía el foco al primer botón y el textarea se vaciaba.
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(field).toHaveValue("Viaje de prueba");
    expect(field).toHaveFocus();
  });
});
