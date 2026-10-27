import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Info, Wallet, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { listAllPayouts, resolvePayout } from "@/features/staff/api";
import { listUsers } from "@/features/profile/api";
import type { PayoutRequest, PayoutStatus } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { PageLoader } from "@/shared/components/ui/Media";
import { ConfirmDialog } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { PayoutStatusBadge } from "@/shared/components/ui/StatusBadge";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime } from "@/shared/lib/dates";
import { formatMxn } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";

const filters: Array<{ key: "all" | PayoutStatus; label: string }> = [
  { key: "Pending", label: "Pendientes" },
  { key: "Paid", label: "Pagados" },
  { key: "Rejected", label: "Rechazados" },
  { key: "all", label: "Todos" },
];

export function StaffPayoutsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | PayoutStatus>("Pending");
  const [confirm, setConfirm] = useState<{ payout: PayoutRequest; approve: boolean } | null>(null);

  useDocumentTitle("Reembolsos");

  const payoutsQuery = useQuery({
    queryKey: ["payouts", "all", status],
    queryFn: () => listAllPayouts(status),
  });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    (usersQuery.data ?? []).forEach((user) => map.set(user.id, user.name));
    return map;
  }, [usersQuery.data]);

  const mutation = useMutation({
    mutationFn: (vars: { id: number; approve: boolean }) => resolvePayout(vars.id, vars.approve),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["payouts"] });
      setConfirm(null);
      showToast(
        vars.approve
          ? "Reembolso marcado como pagado. Se debitó el saldo del cliente."
          : "Solicitud rechazada. El saldo quedó liberado.",
        "success",
      );
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const payouts = payoutsQuery.data ?? [];
  const pendingCount = payouts.filter((payout) => payout.status === "Pending").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finanzas"
        title="Reembolsos de saldo"
        subtitle="Marca como pagado al entregar el dinero o rechaza para liberar el saldo retenido."
        action={
          <span className="rounded-full bg-pending px-3 py-1.5 text-label-md text-[#78350F]">
            {pendingCount} pendiente(s) en vista
          </span>
        }
      />

      <div className="rounded-card bg-primary-container p-4 text-white shadow-layer-1">
        <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.1em] text-mint">
          <Info className="size-3.5" />
          Cómo funciona
        </p>
        <p className="mt-1 text-body-sm text-mint/85">
          Al aprobar, se descuenta el monto de la wallet del cliente y se registra el pago. Al
          rechazar, el monto retenido se libera y el saldo sigue disponible para el cliente.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <Chip
            key={filter.key}
            selected={status === filter.key}
            onClick={() => setStatus(filter.key)}
            className={cn(status === filter.key && "border-primary-container bg-primary-container text-white")}
          >
            {filter.label}
          </Chip>
        ))}
      </div>

      {payoutsQuery.isError ? (
        <ErrorState
          message={errorMessage(payoutsQuery.error) || "No se pudieron cargar las solicitudes."}
          onRetry={() => void payoutsQuery.refetch()}
        />
      ) : payoutsQuery.isLoading ? (
        <PageLoader label="Cargando reembolsos…" />
      ) : payouts.length === 0 ? (
        <EmptyState
          title="Sin solicitudes"
          description="Las solicitudes de reembolso de los clientes aparecerán aquí."
        />
      ) : (
        <SectionCard title="Solicitudes" icon={<Wallet className="size-5" />}>
          <div className="space-y-2">
            {payouts.map((payout) => {
              const name = payout.user?.name ?? userMap.get(payout.userId) ?? `Usuario ${payout.userId}`;
              return (
                <div key={payout.id} className="rounded-[14px] border border-surface-container-high p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-title-md text-on-surface">{name}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {formatDateTime(payout.createdAt)}
                        {payout.user?.email ? ` · ${payout.user.email}` : ""}
                      </p>
                      {payout.note ? (
                        <p className="mt-1 rounded-lg bg-surface-container-low px-2 py-1 text-body-sm text-on-surface-variant">
                          “{payout.note}”
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-price-display text-primary-container">{formatMxn(payout.amount)}</p>
                      <PayoutStatusBadge status={payout.status} />
                    </div>
                  </div>
                  {payout.status === "Pending" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirm({ payout, approve: true })}
                      >
                        <Check className="size-4" />
                        Marcar como pagado
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirm({ payout, approve: false })}
                      >
                        <X className="size-4" />
                        Rechazar
                      </Button>
                    </div>
                  ) : payout.resolvedAt ? (
                    <p className="mt-2 text-label-sm text-outline">
                      Resuelto el {formatDateTime(payout.resolvedAt)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.approve ? "Marcar reembolso como pagado" : "Rechazar solicitud"}
        description={
          confirm?.approve
            ? "Confirma que ya entregaste el dinero. Se debitará el saldo del cliente y se le notificará."
            : "El monto retenido se liberará y el saldo seguirá disponible para el cliente."
        }
        tone={confirm?.approve ? "primary" : "danger"}
        confirmLabel={confirm?.approve ? "Sí, ya pagué" : "Rechazar solicitud"}
        loading={mutation.isPending}
        onConfirm={() =>
          confirm && mutation.mutate({ id: confirm.payout.id, approve: confirm.approve })
        }
      >
        <div className="space-y-1 text-body-md">
          <p className="text-on-surface">
            {confirm?.payout.user?.name ?? userMap.get(confirm?.payout.userId ?? 0) ?? "Cliente"}
          </p>
          <p className="text-on-surface-variant">{formatMxn(confirm?.payout.amount ?? 0)}</p>
          <p className="text-body-sm text-outline">Solicitud de {session?.name}</p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
