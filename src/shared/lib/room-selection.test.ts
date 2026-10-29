import { describe, expect, it } from "vitest";
import type { TripOption } from "@/shared/api/types";
import {
  defaultOptionSelection,
  maxRoomsFor,
  selectionToOptionInput,
  selectionSeats,
  withChildren,
  withRooms,
} from "@/shared/lib/room-selection";

function makeOption(overrides: Partial<TripOption> = {}): TripOption {
  return {
    id: 1,
    tripId: 1,
    name: "Habitación doble",
    description: null,
    priceAdult: "500.00",
    priceChild: "300.00",
    capacity: 10,
    availableSeats: 10,
    benefits: null,
    isActive: true,
    order: 1,
    isBase: false,
    roomOccupancy: 2,
    ...overrides,
  };
}

describe("room selection", () => {
  it("precarga una habitación con su ocupación al seleccionar la opción", () => {
    const selection = defaultOptionSelection(makeOption());

    expect(selection).toEqual({ rooms: 1, adults: 2, children: 0 });
    expect(selectionSeats(makeOption(), selection)).toBe(2);
  });

  it("agrega habitaciones en bloques de ocupación", () => {
    const option = makeOption();
    const selection = withRooms(option, defaultOptionSelection(option), 2);

    expect(selection).toEqual({ rooms: 2, adults: 4, children: 0 });
    expect(selectionSeats(option, selection)).toBe(4);
  });

  it("mantiene el total de personas al cambiar niños", () => {
    const option = makeOption();
    const selection = withChildren(option, defaultOptionSelection(option), 1);

    expect(selection).toEqual({ rooms: 1, adults: 1, children: 1 });
    expect(selectionSeats(option, selection)).toBe(2);
  });

  it("no permite más niños que personas menos una por habitación", () => {
    const option = makeOption();
    const selection = withChildren(option, defaultOptionSelection(option), 9);

    expect(selection.children).toBe(1);
    expect(selection.adults).toBe(1);
  });

  it("vuelve a cero habitaciones y boletos al quitar todas", () => {
    const option = makeOption();
    const selection = withRooms(option, defaultOptionSelection(option), 0);

    expect(selection).toEqual({ rooms: 0, adults: 0, children: 0 });
    expect(selectionSeats(option, selection)).toBe(0);
  });

  it("mantiene el comportamiento legacy cuando la opción no tiene habitación", () => {
    const option = makeOption({ roomOccupancy: null });
    const selection = defaultOptionSelection(option);
    const withChild = withChildren(option, selection, 2);

    expect(selection).toEqual({ rooms: 0, adults: 1, children: 0 });
    expect(withChild).toEqual({ rooms: 0, adults: 1, children: 2 });
    expect(selectionSeats(option, withChild)).toBe(3);
  });

  it("calcula el máximo de habitaciones según asientos disponibles", () => {
    expect(maxRoomsFor(makeOption(), 5)).toBe(2);
    expect(maxRoomsFor(makeOption({ roomOccupancy: null }), 5)).toBe(0);
  });

  it("convierte la selección al payload de la API", () => {
    const option = makeOption({ id: 7 });
    const selection = withChildren(option, defaultOptionSelection(option), 1);

    expect(selectionToOptionInput(option, selection)).toEqual({
      tripOptionId: 7,
      adults: 1,
      children: 1,
    });
  });
});
