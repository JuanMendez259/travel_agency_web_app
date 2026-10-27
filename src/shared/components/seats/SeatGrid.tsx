import { Bus, Check } from "lucide-react";
import type { ReactNode } from "react";
import type { Seat, SeatRow } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";

export function SeatGrid({
  rows,
  selectedSeats,
  seatLabels,
  onSeatClick,
  disabled,
  inspectOccupied,
}: {
  rows: SeatRow[];
  selectedSeats?: Set<number>;
  seatLabels?: Map<number, string>;
  onSeatClick?: (seat: Seat) => void;
  disabled?: boolean;
  inspectOccupied?: boolean;
}) {
  return (
    <div className="rounded-[22px] border-2 border-surface-container-high bg-surface-container-low p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-surface-container-high pb-2.5">
        <span className="inline-flex items-center gap-1.5 text-label-md text-on-surface-variant">
          <Bus className="size-4 text-primary-container" />
          Frente del vehículo
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-label-sm text-outline">
          Pasillo central
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${row.floor}-${row.rowNumber}`} className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-outline">
              {row.rowNumber}
            </span>
            <div className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2">
              {row.seats.map((seat, index) => {
                if (seat.isAisle) {
                  return <span key={`aisle-${index}`} className="w-5 sm:w-8" aria-hidden="true" />;
                }
                const selected = selectedSeats?.has(seat.number) ?? false;
                const label = seatLabels?.get(seat.number);
                return (
                  <button
                    key={seat.number}
                    type="button"
                    disabled={disabled || (seat.isOccupied && !inspectOccupied)}
                    onClick={() => onSeatClick?.(seat)}
                    aria-label={`Asiento ${seat.number}: ${
                      selected
                        ? "seleccionado"
                        : seat.isOccupied
                          ? seat.checkedIn
                            ? "ocupado con check-in"
                            : "ocupado"
                          : "libre"
                    }`}
                    aria-pressed={selected}
                    className={cn(
                      "relative flex h-10 w-9 flex-col items-center justify-center rounded-[10px] border text-label-md tabular-nums transition sm:h-11 sm:w-10",
                      selected &&
                        "border-primary-container bg-primary-container text-white shadow-sm",
                      !selected &&
                        !seat.isOccupied &&
                        "border-transparent bg-surface-container-highest text-primary-container hover:border-emerald hover:bg-mint",
                      !selected &&
                        seat.isOccupied &&
                        (seat.checkedIn
                          ? "border-transparent bg-secondary text-white"
                          : "border-transparent bg-seat-occupied text-white"),
                      seat.isOccupied && inspectOccupied && "cursor-pointer hover:opacity-90",
                      seat.isOccupied && !inspectOccupied && "cursor-not-allowed",
                    )}
                  >
                    <span>{seat.number}</span>
                    {label ? (
                      <span className="text-[8px] leading-none opacity-90">{label}</span>
                    ) : selected ? (
                      <Check className="size-2.5" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <span className="w-5 shrink-0" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatLegend({
  showCheckin = false,
  showSelection = true,
  extra,
}: {
  showCheckin?: boolean;
  showSelection?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-on-surface-variant">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded bg-surface-container-highest" />
        Libre
      </span>
      {showSelection ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-primary-container" />
          Tu elección
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded bg-seat-occupied" />
        Ocupado
      </span>
      {showCheckin ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-secondary" />
          Check-in
        </span>
      ) : null}
      {extra}
    </div>
  );
}
