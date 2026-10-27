import { Minus, Plus } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function Counter({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max = 99,
  disabled,
  price,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  price?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-title-md text-on-surface">{label}</p>
        {hint ? <p className="text-body-sm text-on-surface-variant">{hint}</p> : null}
        {price ? <p className="mt-0.5 text-label-md text-secondary">{price}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-full border border-input-border bg-white p-1">
        <button
          type="button"
          aria-label={`Quitar ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={cn(
            "grid size-9 place-items-center rounded-full text-primary-container transition",
            "hover:bg-mint disabled:cursor-not-allowed disabled:opacity-35",
          )}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-7 text-center text-title-md tabular-nums text-on-surface" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Agregar ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={cn(
            "grid size-9 place-items-center rounded-full text-primary-container transition",
            "hover:bg-mint disabled:cursor-not-allowed disabled:opacity-35",
          )}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
