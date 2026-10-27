import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "@/features/staff/api";
import { listManageTrips } from "@/features/trips/api";
import type { TripExpense } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { Select, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { ConfirmDialog } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard, StatCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime } from "@/shared/lib/dates";
import { addMoney, formatMxn } from "@/shared/lib/money";

export function StaffExpensesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tripId, setTripId] = useState<number | null>(null);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<TripExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TripExpense | null>(null);

  useDocumentTitle("Gastos");

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trips = tripsQuery.data ?? [];

  useEffect(() => {
    if (tripId == null && trips.length) setTripId(trips[0].id);
  }, [trips, tripId]);

  const expensesQuery = useQuery({
    queryKey: ["expenses", tripId],
    queryFn: () => listExpenses(tripId!),
    enabled: tripId != null,
  });

  const expenses = expensesQuery.data ?? [];
  const total = addMoney(...expenses.map((expense) => expense.amount));
  const selectedTrip = trips.find((trip) => trip.id === tripId) ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses", tripId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { concept: concept.trim(), amount: Number(amount) };
      if (editing) return updateExpense(editing.id, payload);
      return createExpense(tripId!, payload);
    },
    onSuccess: () => {
      invalidate();
      setConcept("");
      setAmount("");
      setEditing(null);
      setError(null);
      showToast("Gasto guardado.", "success");
    },
    onError: (mutationError) => {
      const message = errorMessage(mutationError);
      setError(message);
      showToast(message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast("Gasto eliminado.", "success");
    },
    onError: (mutationError) => showToast(errorMessage(mutationError), "error"),
  });

  const submit = () => {
    setError(null);
    if (tripId == null) return setError("Selecciona un viaje.");
    if (!concept.trim()) return setError("El concepto es obligatorio.");
    if (!amount.trim() || Number(amount) <= 0) return setError("El monto debe ser mayor a cero.");
    saveMutation.mutate();
  };

  if (tripsQuery.isLoading) return <PageLoader label="Cargando viajes…" />;
  if (tripsQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(tripsQuery.error) || "No se pudieron cargar los viajes."}
        onRetry={() => void tripsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finanzas"
        title="Gastos de viaje"
        subtitle="Registra la inversión operativa de cada salida."
      />

      {trips.length === 0 ? (
        <EmptyState title="No hay viajes" description="Crea un viaje para registrar sus gastos." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
            <div className="sm:col-span-2">
              <SectionCard title="Selecciona el viaje">
                <Select
                  label="Viaje"
                  value={tripId ?? ""}
                  onChange={(event) => {
                    setTripId(Number(event.target.value));
                    setEditing(null);
                    setConcept("");
                    setAmount("");
                    setError(null);
                  }}
                >
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title}
                    </option>
                  ))}
                </Select>
                {selectedTrip ? (
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {selectedTrip.destination} · {expenses.length} gasto(s) registrado(s)
                  </p>
                ) : null}
              </SectionCard>
            </div>
            <StatCard
              label="Inversión total"
              value={formatMxn(total)}
              hint="Gastos del viaje seleccionado"
              tone="amber"
              icon={<Wallet className="size-4" />}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <SectionCard
              title={editing ? "Editar gasto" : "Nuevo gasto"}
              icon={<Receipt className="size-5" />}
            >
              <div className="space-y-3">
                <TextField
                  label="Concepto"
                  value={concept}
                  maxLength={200}
                  placeholder="Combustible, casetas, guía…"
                  onChange={(event) => setConcept(event.target.value)}
                />
                <TextField
                  label="Monto (MXN)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                {error ? (
                  <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
                    {error}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button className="flex-1" loading={saveMutation.isPending} onClick={submit}>
                    {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                    {editing ? "Guardar cambios" : "Registrar gasto"}
                  </Button>
                  {editing ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(null);
                        setConcept("");
                        setAmount("");
                        setError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Gastos registrados" icon={<Receipt className="size-5" />}>
              {expensesQuery.isError ? (
                <ErrorState
                  message={errorMessage(expensesQuery.error) || "No se pudieron cargar los gastos."}
                  onRetry={() => void expensesQuery.refetch()}
                />
              ) : expensesQuery.isLoading ? (
                <PageLoader label="Cargando gastos…" />
              ) : expenses.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">
                  Aún no hay gastos registrados para este viaje.
                </p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2.5"
                    >
                      <div>
                        <p className="text-body-md text-on-surface">{expense.concept}</p>
                        <p className="text-body-sm text-on-surface-variant">
                          {formatDateTime(expense.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-title-md text-primary-container">
                          {formatMxn(expense.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Editar gasto"
                          onClick={() => {
                            setEditing(expense);
                            setConcept(expense.concept);
                            setAmount(String(expense.amount));
                            setError(null);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Eliminar gasto"
                          onClick={() => setDeleteTarget(expense)}
                        >
                          <Trash2 className="size-3.5 text-error" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-right text-body-sm text-on-surface-variant">
                    Total: <strong className="text-on-surface">{formatMxn(total)}</strong>
                  </p>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar gasto"
        description="Esta acción no se puede deshacer."
        tone="danger"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p className="text-body-md text-on-surface">{deleteTarget?.concept}</p>
      </ConfirmDialog>
    </div>
  );
}
