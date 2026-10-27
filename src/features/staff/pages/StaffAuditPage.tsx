import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileClock, Filter, RefreshCw, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { listAuditLog } from "@/features/staff/api";
import type { AuditLog } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { Select, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";

const entities = ["Trip", "Booking", "Payment"];

const actionStyles: Record<string, string> = {
  Created: "bg-confirmed text-on-secondary-container",
  Updated: "bg-pending text-[#78350F]",
  Deleted: "bg-error-container text-on-error-container",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value === "True") return "Sí";
  if (value === "False") return "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseDetails(details: string | null): Array<{ field: string; before: string; after: string }> {
  if (!details) return [];
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed).map(([field, value]) => {
      if (Array.isArray(value)) {
        return { field, before: formatValue(value[0]), after: formatValue(value[1]) };
      }
      return { field, before: "—", after: formatValue(value) };
    });
  } catch {
    return [];
  }
}

function actionLabel(action: string): string {
  if (action === "Created") return "Creado";
  if (action === "Updated") return "Actualizado";
  if (action === "Deleted") return "Eliminado";
  return action;
}

export function StaffAuditPage() {
  const [params, setParams] = useSearchParams();
  const [entity, setEntity] = useState(params.get("entity") ?? "");
  const [id, setId] = useState(params.get("id") ?? "");
  const [limit, setLimit] = useState("200");

  useDocumentTitle("Auditoría");

  useEffect(() => {
    setEntity(params.get("entity") ?? "");
    setId(params.get("id") ?? "");
  }, [params]);

  const auditQuery = useQuery({
    queryKey: ["audit", params.get("entity"), params.get("id"), limit],
    queryFn: () =>
      listAuditLog({
        entity: params.get("entity") || undefined,
        id: params.get("id") ? Number(params.get("id")) : undefined,
        limit: Number(limit) || 200,
      }),
  });

  const logs = auditQuery.data ?? [];

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (entity) next.entity = entity;
    if (id) next.id = id;
    setParams(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Trazabilidad"
        title="Historial de cambios"
        subtitle="Auditoría de viajes, reservas y pagos."
        action={
          <Button
            variant="outline"
            size="sm"
            loading={auditQuery.isFetching}
            onClick={() => void auditQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
        }
      />

      <SectionCard title="Filtros" icon={<Filter className="size-5" />}>
        <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
          <Select label="Entidad" value={entity} onChange={(event) => setEntity(event.target.value)}>
            <option value="">Todas</option>
            {entities.map((item) => (
              <option key={item} value={item}>
                {item === "Trip" ? "Viajes" : item === "Booking" ? "Reservas" : "Pagos"}
              </option>
            ))}
          </Select>
          <TextField
            label="ID de entidad"
            type="number"
            min={1}
            value={id}
            placeholder="Ej. 30"
            onChange={(event) => setId(event.target.value)}
          />
          <TextField
            label="Límite"
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
          <Button type="submit" variant="primary" size="md">
            Aplicar
          </Button>
        </form>
        {params.get("entity") || params.get("id") ? (
          <p className="mt-2 text-body-sm text-on-surface-variant">
            Filtro activo: {params.get("entity") ?? "todas"} {params.get("id") ? `#${params.get("id")}` : ""}
          </p>
        ) : null}
      </SectionCard>

      {auditQuery.isError ? (
        <ErrorState
          message={errorMessage(auditQuery.error) || "No se pudo cargar la auditoría."}
          onRetry={() => void auditQuery.refetch()}
        />
      ) : auditQuery.isLoading ? (
        <PageLoader label="Cargando historial…" />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Sin cambios registrados"
          description="Los cambios de viajes, reservas y pagos aparecerán aquí."
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <AuditCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditCard({ log }: { log: AuditLog }) {
  const changes = parseDetails(log.details);
  return (
    <article className="rounded-card bg-white p-4 shadow-layer-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-label-sm",
                actionStyles[log.action] ?? "bg-surface-container text-on-surface-variant",
              )}
            >
              {actionLabel(log.action)}
            </span>
            <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant">
              {log.entityType} #{log.entityId}
            </span>
          </div>
          <p className="mt-1.5 text-body-md text-on-surface">{log.summary}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {log.userName || "Sistema"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {formatDateTime(log.createdAt)}
            </span>
          </p>
        </div>
        <FileClock className="size-5 shrink-0 text-outline" />
      </div>
      {changes.length ? (
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-surface-container-high">
          <table className="w-full min-w-[420px] text-left text-body-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-3 py-2 font-label text-label-sm text-on-surface-variant">Campo</th>
                <th className="px-3 py-2 font-label text-label-sm text-on-surface-variant">Antes</th>
                <th className="px-3 py-2 font-label text-label-sm text-on-surface-variant">Después</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field} className="border-t border-surface-container-high">
                  <td className="px-3 py-2 text-on-surface">{change.field}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{change.before}</td>
                  <td className="px-3 py-2 text-on-surface">{change.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
