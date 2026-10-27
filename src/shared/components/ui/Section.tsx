import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/cn";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  icon,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: ReactNode;
}) {
  return (
    <section className={cn("rounded-card border border-white bg-white shadow-layer-1", className)}>
      {title || action ? (
        <header className="flex items-start gap-3 px-5 pt-5">
          {icon ? <div className="mt-0.5 text-primary-container">{icon}</div> : null}
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-headline-sm text-on-surface">{title}</h2> : null}
            {subtitle ? (
              <p className="mt-0.5 text-body-sm text-on-surface-variant">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel = "Volver",
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 text-label-md text-on-surface-variant transition hover:text-primary-container"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-label-sm uppercase tracking-[0.08em] text-secondary">{eyebrow}</p>
          ) : null}
          <h1 className="text-headline-lg text-on-surface sm:text-display">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "primary" | "emerald" | "amber" | "slate";
}) {
  const tones = {
    primary: "bg-mint text-primary-container",
    emerald: "bg-confirmed text-on-secondary-container",
    amber: "bg-pending text-[#78350F]",
    slate: "bg-surface-container text-on-surface",
  };
  return (
    <div className="rounded-card border border-white bg-white p-4 shadow-layer-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-label-md uppercase tracking-wide text-on-surface-variant">{label}</p>
        {icon ? (
          <span className={cn("rounded-lg p-1.5", tones[tone])} aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-headline-md text-on-surface">{value}</p>
      {hint ? <p className="mt-1 text-body-sm text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}
