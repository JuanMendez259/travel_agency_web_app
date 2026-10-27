import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({ selected, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-label-md transition",
        selected
          ? "border border-emerald bg-mint text-primary-container"
          : "border border-input-border bg-white text-slate",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
