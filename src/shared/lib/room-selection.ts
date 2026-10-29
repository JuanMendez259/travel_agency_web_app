import type { BookingOptionInput, TripOption } from "@/shared/api/types";

export type OptionSelection = {
  rooms: number;
  adults: number;
  children: number;
};

export function roomOccupancy(option: TripOption): number {
  return option.roomOccupancy != null && option.roomOccupancy > 0 ? option.roomOccupancy : 0;
}

export function isRoomOption(option: TripOption): boolean {
  return roomOccupancy(option) > 0;
}

export function defaultOptionSelection(option: TripOption): OptionSelection {
  if (isRoomOption(option)) {
    return { rooms: 1, adults: roomOccupancy(option), children: 0 };
  }
  return { rooms: 0, adults: 1, children: 0 };
}

export function selectionSeats(option: TripOption, selection: OptionSelection): number {
  const occupancy = roomOccupancy(option);
  if (occupancy > 0) return selection.rooms * occupancy;
  return selection.adults + selection.children;
}

export function maxRoomsFor(option: TripOption, remainingSeats: number): number {
  const occupancy = roomOccupancy(option);
  if (occupancy <= 0) return 0;
  return Math.max(0, Math.floor(remainingSeats / occupancy));
}

export function withRooms(
  option: TripOption,
  selection: OptionSelection,
  rooms: number,
): OptionSelection {
  const occupancy = roomOccupancy(option);
  if (occupancy <= 0) return selection;

  const nextRooms = Math.max(0, Math.floor(rooms));
  const seats = nextRooms * occupancy;
  const maxChildren = Math.max(0, seats - nextRooms);
  const children = Math.min(Math.max(0, selection.children), maxChildren);
  return { rooms: nextRooms, adults: seats - children, children };
}

export function withChildren(
  option: TripOption,
  selection: OptionSelection,
  children: number,
): OptionSelection {
  const occupancy = roomOccupancy(option);
  if (occupancy <= 0) return { ...selection, children: Math.max(0, Math.floor(children)) };

  const seats = selection.rooms * occupancy;
  const maxChildren = Math.max(0, seats - selection.rooms);
  const nextChildren = Math.min(Math.max(0, Math.floor(children)), maxChildren);
  return { ...selection, children: nextChildren, adults: seats - nextChildren };
}

export function selectionToOptionInput(
  option: TripOption,
  selection: OptionSelection,
): BookingOptionInput {
  return {
    tripOptionId: option.id,
    adults: selection.adults,
    children: selection.children,
  };
}
