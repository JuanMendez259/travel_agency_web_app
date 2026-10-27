import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarRange, MapPin, Ticket, TrendingUp, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { getAdminStats } from "@/features/staff/api";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard, StatCard } from "@/shared/components/ui/Section";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatMxn, formatNumber, toDecimal } from "@/shared/lib/money";

export function StaffStatsPage() {
  const statsQuery = useQuery({ queryKey: ["adminStats"], queryFn: getAdminStats });
  useDocumentTitle("Estadísticas");
  const stats = statsQuery.data;

  const maxRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...(stats?.monthlyRevenue ?? []).map((item) => toDecimal(item.amount).toNumber()),
      ),
    [stats?.monthlyRevenue],
  );

  if (statsQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(statsQuery.error) || "No se pudieron cargar las estadísticas."}
        onRetry={() => void statsQuery.refetch()}
      />
    );
  }
  if (statsQuery.isLoading || !stats) return <PageLoader label="Calculando estadísticas…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Panel administrador"
        title="Estadísticas"
        subtitle="Ingresos, ocupación y destinos con mejor desempeño."
        action={
          <span className="rounded-full bg-mint px-3 py-1.5 text-label-md text-primary-container">
            Ingresos sin descontar reembolsos
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Viajes"
          value={formatNumber(stats.tripsCount)}
          hint={`${formatNumber(stats.bookingsCount)} reservas activas`}
          icon={<CalendarRange className="size-4" />}
        />
        <StatCard
          label="Asientos vendidos"
          value={formatNumber(stats.seatsSold)}
          hint="Reservas no canceladas"
          tone="emerald"
          icon={<Ticket className="size-4" />}
        />
        <StatCard
          label="Ingresos"
          value={formatMxn(stats.revenueTotal)}
          hint="Solo pagos completados"
          tone="primary"
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Ocupación"
          value={`${stats.occupancyPercent.toFixed(1)}%`}
          hint="Sobre capacidad física"
          tone="amber"
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <SectionCard
          title="Ingresos por mes"
          subtitle="Últimos 11 meses · pagos completados"
          icon={<BarChart3 className="size-5" />}
        >
          {stats.monthlyRevenue.length === 0 ? (
            <EmptyState title="Sin ingresos registrados" description="Los pagos completados aparecerán aquí." />
          ) : (
            <div className="flex h-56 items-end gap-2 overflow-x-auto pt-2">
              {stats.monthlyRevenue.map((item) => {
                const value = toDecimal(item.amount).toNumber();
                const height = Math.max(4, Math.round((value / maxRevenue) * 180));
                let label = item.month;
                try {
                  label = format(parse(item.month, "yyyy-MM", new Date()), "MMM yy", { locale: es });
                } catch {
                  label = item.month;
                }
                return (
                  <div key={item.month} className="flex min-w-12 flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-on-surface-variant">
                      {value > 0 ? formatMxn(value).replace("MX$", "$") : "—"}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-secondary transition-all"
                      style={{ height }}
                      title={`${item.month}: ${formatMxn(item.amount)}`}
                    />
                    <span className="text-[10px] first-letter:uppercase text-on-surface-variant">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top destinos" subtitle="Por asientos vendidos" icon={<MapPin className="size-5" />}>
          {stats.topDestinations.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">Sin datos todavía.</p>
          ) : (
            <ol className="space-y-2">
              {stats.topDestinations.map((destination, index) => (
                <li key={destination.destination} className="flex items-center gap-3 rounded-[12px] bg-surface-container-low p-3">
                  <span className="grid size-7 place-items-center rounded-full bg-primary-container text-label-md text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                    {destination.destination}
                  </span>
                  <span className="text-label-md text-on-surface-variant">
                    {formatNumber(destination.seats)} asientos
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Ocupación por viaje"
        subtitle="Vendidos / capacidad física"
        icon={<Users className="size-5" />}
      >
        {stats.occupancyByTrip.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Sin viajes registrados.</p>
        ) : (
          <div className="space-y-3">
            {stats.occupancyByTrip.map((trip) => (
              <div key={trip.tripId}>
                <div className="flex flex-wrap items-center justify-between gap-1 text-body-sm">
                  <span className="text-on-surface">{trip.title}</span>
                  <span className="text-on-surface-variant">
                    {trip.sold} / {trip.capacity} · {trip.percent.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${Math.min(100, Math.max(0, trip.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
