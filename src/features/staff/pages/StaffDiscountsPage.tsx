import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Check, Pencil, Plus, Power, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createDiscount,
  deleteDiscount,
  listDiscounts,
  updateDiscount,
} from "@/features/staff/api";
import { listManageTrips } from "@/features/trips/api";
import type { Discount, DiscountInput, DiscountType } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Select, Switch, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { ConfirmDialog } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { fromDateInputValue, formatShortDate, toDateInputValue } from "@/shared/lib/dates";
import { formatMxn } from "@/shared/lib/money";

type FormState = {
  code: string;
  type: DiscountType;
  value: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  isActive: boolean;
  scope: string;
};

const emptyForm = (): FormState => ({
  code: "",
  type: "Percentage",
  value: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  isActive: true,
  scope: "global",
});

export function StaffDiscountsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);

  useDocumentTitle("Descuentos");

  const discountsQuery = useQuery({ queryKey: ["discounts"], queryFn: listDiscounts });
  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trips = tripsQuery.data ?? [];

  useEffect(() => {
    if (!editing) return;
    setForm({
      code: editing.code,
      type: editing.type,
      value: String(editing.value),
      startDate: editing.startDate ? toDateInputValue(editing.startDate).slice(0, 10) : "",
      endDate: editing.endDate ? toDateInputValue(editing.endDate).slice(0, 10) : "",
      usageLimit: editing.usageLimit != null ? String(editing.usageLimit) : "",
      isActive: editing.isActive,
      scope: editing.tripId != null ? String(editing.tripId) : "global",
    });
  }, [editing]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["discounts"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: DiscountInput = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        startDate: form.startDate ? fromDateInputValue(form.startDate) : null,
        endDate: form.endDate ? fromDateInputValue(form.endDate) : null,
        usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
        isActive: form.isActive,
        tripId: form.scope === "global" ? null : Number(form.scope),
      };
      if (editing) return updateDiscount(editing.id, payload);
      return createDiscount(payload);
    },
    onSuccess: () => {
      invalidate();
      showToast(editing ? "Descuento actualizado." : "Descuento creado.", "success");
      setEditing(null);
      setForm(emptyForm());
      setErrors([]);
      setServerError(null);
    },
    onError: (error) => {
      const message = errorMessage(error);
      setServerError(message);
      showToast(message, "error");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (discount: Discount) =>
      updateDiscount(discount.id, {
        code: discount.code,
        type: discount.type,
        value: Number(discount.value),
        startDate: discount.startDate,
        endDate: discount.endDate,
        usageLimit: discount.usageLimit,
        isActive: !discount.isActive,
        tripId: discount.tripId,
      }),
    onSuccess: (_data, discount) => {
      invalidate();
      showToast(discount.isActive ? "Descuento desactivado." : "Descuento activado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDiscount(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast("Descuento eliminado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const submit = () => {
    setErrors([]);
    setServerError(null);
    const result: string[] = [];
    if (!form.code.trim()) result.push("El código es obligatorio.");
    if (form.code.trim().length > 60) result.push("El código no puede superar 60 caracteres.");
    if (!form.value.trim() || Number(form.value) <= 0) result.push("El valor debe ser mayor a cero.");
    if (form.type === "Percentage" && Number(form.value) > 100)
      result.push("El porcentaje no puede superar 100.");
    if (form.usageLimit.trim() && Number(form.usageLimit) < 1)
      result.push("El límite de usos debe ser al menos 1.");
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate))
      result.push("La fecha de fin no puede ser anterior al inicio.");
    if (result.length) {
      setErrors(result);
      return;
    }
    saveMutation.mutate();
  };

  const discounts = discountsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Promociones"
        title="Descuentos"
        subtitle="Códigos porcentuales o de monto fijo, globales o por viaje."
        action={
          <span className="rounded-full bg-mint px-3 py-1.5 text-label-md text-primary-container">
            {discounts.length} código(s)
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <SectionCard
          title={editing ? "Editar descuento" : "Nuevo descuento"}
          icon={<BadgePercent className="size-5" />}
        >
          <div className="space-y-3">
            <TextField
              label="Código"
              value={form.code}
              maxLength={60}
              placeholder="VERANO10"
              hint="Se guarda en mayúsculas."
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Tipo"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as DiscountType })}
              >
                <option value="Percentage">Porcentaje</option>
                <option value="Amount">Monto fijo</option>
              </Select>
              <TextField
                label={form.type === "Percentage" ? "Porcentaje" : "Monto (MXN)"}
                type="number"
                min={0}
                step="0.01"
                max={form.type === "Percentage" ? 100 : undefined}
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Vigencia desde (opcional)"
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
              <TextField
                label="Vigencia hasta (opcional)"
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Límite de usos (opcional)"
                type="number"
                min={1}
                value={form.usageLimit}
                placeholder="Ilimitado"
                onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
              />
              <Select
                label="Alcance"
                value={form.scope}
                onChange={(event) => setForm({ ...form, scope: event.target.value })}
              >
                <option value="global">Todos los viajes</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </Select>
            </div>
            <Switch
              checked={form.isActive}
              onChange={(value) => setForm({ ...form, isActive: value })}
              label="Descuento activo"
              description="Solo los activos y vigentes se aplican en el checkout."
            />

            {errors.length ? (
              <ul role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {serverError ? (
              <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
                {serverError}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button className="flex-1" loading={saveMutation.isPending} onClick={submit}>
                {editing ? <Check className="size-4" /> : <Plus className="size-4" />}
                {editing ? "Guardar cambios" : "Crear descuento"}
              </Button>
              {editing ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyForm());
                    setErrors([]);
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Códigos registrados" icon={<Tag className="size-5" />}>
          {discountsQuery.isError ? (
            <ErrorState
              message={errorMessage(discountsQuery.error) || "No se pudieron cargar los descuentos."}
              onRetry={() => void discountsQuery.refetch()}
            />
          ) : discountsQuery.isLoading ? (
            <PageLoader label="Cargando descuentos…" />
          ) : discounts.length === 0 ? (
            <EmptyState title="Sin descuentos" description="Crea el primer código promocional." />
          ) : (
            <div className="space-y-2">
              {discounts.map((discount) => (
                <div key={discount.id} className="rounded-[14px] border border-surface-container-high p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="inline-flex flex-wrap items-center gap-1.5 text-title-md text-on-surface">
                        {discount.code}
                        {!discount.isActive ? <Badge tone="cancelled">Inactivo</Badge> : null}
                        {discount.isActive && discount.hasUsesLeft === false ? (
                          <Badge tone="pending">Agotado</Badge>
                        ) : null}
                        {discount.isGlobal ?? discount.tripId == null ? <Badge>Global</Badge> : null}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {discount.type === "Percentage"
                          ? `${Number(discount.value)}% de descuento`
                          : `${formatMxn(discount.value)} de descuento`}{" "}
                        · usos {discount.usedCount}
                        {discount.usageLimit != null ? `/${discount.usageLimit}` : " (ilimitado)"}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {discount.startDate ? formatShortDate(discount.startDate) : "Sin inicio"} —{" "}
                        {discount.endDate ? formatShortDate(discount.endDate) : "Sin fin"}
                      </p>
                      <p className="text-label-sm text-outline">
                        {discount.trip?.title ?? "Todos los viajes"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setEditing(discount)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate(discount)}>
                        <Power className="size-3.5" />
                        {discount.isActive ? "Desactivar" : "Activar"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(discount)}>
                        <Trash2 className="size-3.5 text-error" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar descuento"
        description="El código dejará de funcionar de inmediato."
        tone="danger"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p className="text-body-md text-on-surface">{deleteTarget?.code}</p>
      </ConfirmDialog>
    </div>
  );
}
