import type { ReactNode } from "react";
import { Compass } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#14532D" />
      <path d="M14 44c9-18 26-24 36-26-4 10-8 20-10 26-8-4-17-2-26 0Z" fill="#6CF8BB" />
      <circle cx="42" cy="18" r="5" fill="#FAF8FF" />
      <path d="M18 49c8-4 18-4 28-1" stroke="#96D5A3" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLockup({
  compact,
  invert,
  className,
}: {
  compact?: boolean;
  invert?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-10 shrink-0 rounded-[12px]" />
      {compact ? null : (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block truncate text-title-md font-extrabold tracking-tight",
              invert ? "text-white" : "text-primary-container",
            )}
          >
            Proxima Parada
          </span>
          <span
            className={cn(
              "block text-label-sm uppercase tracking-[0.14em]",
              invert ? "text-mint/80" : "text-secondary",
            )}
          >
            Tours
          </span>
        </span>
      )}
    </span>
  );
}

export function BrandPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-label-md text-primary-container">
      <Compass className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}
