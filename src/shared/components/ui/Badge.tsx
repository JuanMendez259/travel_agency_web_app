import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Tone = "mint" | "confirmed" | "pending" | "cancelled" | "neutral";

const tones: Record<Tone, string> = {
  mint: "bg-mint text-primary-container",
  confirmed: "bg-confirmed text-on-secondary-container",
  pending: "bg-pending text-[#78350F]",
  cancelled: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container text-on-surface-variant",
};

export function Badge({
  children,
  tone = "mint",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md", tones[tone], className)}>
      {children}
    </span>
  );
}
