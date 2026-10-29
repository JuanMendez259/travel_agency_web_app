import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ClipboardCheck,
  Compass,
  Megaphone,
  RefreshCw,
  Ticket,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { listNotifications } from "@/features/profile/api";
import { errorMessage } from "@/shared/api/client";
import type { Notification } from "@/shared/api/types";
import { isStaffRole } from "@/features/auth/session";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { noticeDayKey, noticeDayLabel, formatNoticeDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

type Tag = {
  label: string;
  icon: typeof Bell;
  className: string;
};

function classify(message: string): Tag {
  const text = message.toLowerCase();
  if (/reserva|confirmaci|apart/.test(text)) {
    return { label: "Agencia", icon: Ticket, className: "bg-mint text-primary-container" };
  }
  if (/pago|abono|saldo|reembolso|wallet/.test(text)) {
    return { label: "Pagos", icon: Wallet, className: "bg-confirmed text-on-secondary-container" };
  }
  if (/check-in|abord|requisito|salida completada/.test(text)) {
    return { label: "Operaciones", icon: ClipboardCheck, className: "bg-pending text-[#78350F]" };
  }
  if (/guía|ruta|salida|transporte|viaje/.test(text)) {
    return { label: "Guías y Soporte", icon: Compass, className: "bg-surface-container text-primary-container" };
  }
  return { label: "Avisos", icon: Megaphone, className: "bg-surface-container text-on-surface-variant" };
}

export function groupNotifications(items: Notification[]) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const groups: Array<{ key: string; label: string; items: Notification[] }> = [];
  for (const item of sorted) {
    const key = noticeDayKey(item.createdAt);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.items.push(item);
    else groups.push({ key, label: noticeDayLabel(item.createdAt), items: [item] });
  }
  return groups;
}

export function NotificationsPage() {
  const { session } = useAuth();
  const staff = isStaffRole(session?.role);
  const notificationsQuery = useQuery({
    queryKey: ["notifications", session?.userId],
    queryFn: () => listNotifications(session!.userId),
    enabled: Boolean(session?.userId),
  });
  useDocumentTitle("Avisos");

  const groups = useMemo(
    () => groupNotifications(notificationsQuery.data ?? []),
    [notificationsQuery.data],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Canal oficial"
        title="Avisos"
        subtitle="Confirmaciones, pagos, operación y novedades de tu agencia."
        backTo={staff ? "/staff/trips" : "/explore"}
        backLabel={staff ? "Panel staff" : "Explorar"}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void notificationsQuery.refetch()}
            loading={notificationsQuery.isFetching}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
        }
      />

      <div className="flex items-center gap-3 rounded-card bg-primary-container p-4 text-white shadow-layer-1">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
          <Bell className="size-5 text-mint" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase tracking-[0.12em] text-mint">
            Canal de avisos en tiempo real
          </p>
          <p className="truncate text-title-md">Proxima Parada Tours</p>
        </div>
        <span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-on-secondary-container">
          Oficial
        </span>
      </div>

      {notificationsQuery.isError ? (
        <ErrorState
          message={errorMessage(notificationsQuery.error) || "No pudimos cargar tus avisos."}
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : notificationsQuery.isLoading ? (
        <PageLoader label="Cargando avisos…" />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No hay avisos todavía"
          description="Cuando reserves un viaje o haya novedades de tu salida, aparecerán aquí."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-label-sm font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                  {group.label}
                </p>
                <span className="h-px flex-1 bg-surface-container-high" />
              </div>
              <div className="overflow-hidden rounded-card bg-white shadow-layer-1">
                <ul className="divide-y divide-surface-container-high">
                  {group.items.map((item) => {
                    const tag = classify(item.message);
                    const Icon = tag.icon;
                    return (
                      <li key={item.id} className="flex gap-3 p-4">
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-full",
                            tag.className,
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-label-sm", tag.className)}>
                              {tag.label}
                            </span>
                            <span className="text-body-sm text-outline">
                              {formatNoticeDate(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-body-md text-on-surface">{item.message}</p>
                          <p className="mt-1 text-label-sm text-outline">Leído ✓✓</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
          <p className="text-center text-body-sm text-on-surface-variant">
            Los avisos son informativos. Escríbenos por WhatsApp si necesitas atención personal.
          </p>
        </div>
      )}
    </div>
  );
}
