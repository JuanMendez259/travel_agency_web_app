import { ImageOff, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function CoverImage({
  src,
  alt,
  className,
  ratio = "aspect-[16/10]",
  priority,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  ratio?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-container-high", ratio, className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-mint via-surface-container to-surface-container-high text-primary-container">
          <ImageOff className="size-8 opacity-60" aria-hidden="true" />
          <span className="text-label-sm uppercase tracking-widest opacity-70">Proxima Parada</span>
        </div>
      )}
    </div>
  );
}

export function RichText({
  text,
  className,
  clamp,
}: {
  text: string | null | undefined;
  className?: string;
  clamp?: number;
}) {
  if (!text) return null;
  const blocks = text.split(/\n{2,}/);
  return (
    <div className={cn("space-y-3 text-body-md leading-relaxed text-on-surface-variant", className)}>
      {blocks.slice(0, clamp).map((block, blockIndex) => (
        <p key={blockIndex} className="whitespace-pre-wrap break-words">
          {renderInline(block)}
        </p>
      ))}
      {clamp && blocks.length > clamp ? <p className="text-outline">…</p> : null}
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-container-high", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-layer-1">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-end justify-between pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}

export function PageLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-on-surface-variant">
      <Loader2 className="size-5 animate-spin text-secondary" aria-hidden="true" />
      <span className="text-body-md">{label}</span>
    </div>
  );
}
