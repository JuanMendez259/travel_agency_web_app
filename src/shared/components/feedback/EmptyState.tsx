import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-layer-1">
      <p className="text-headline-sm text-on-surface">{title}</p>
      {description ? <p className="mt-2 text-body-md text-on-surface-variant">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
