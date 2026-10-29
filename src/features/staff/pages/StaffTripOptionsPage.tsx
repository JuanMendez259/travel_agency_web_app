import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Pencil, Plus, Power, Save, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isStaffRole } from "@/features/auth/session";
import {
  createTripOption,
  deleteTripOption,
  listManageTrips,
  updateTripOption,
} from "@/features/trips/api";
import type { TripOption, TripOptionInput } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Badge } from "@/shared/components/ui/Badge";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Switch, TextArea, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { ConfirmDialog } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatMxn } from "@/shared/lib/money";
import { bookableCapacity } from "@/shared/lib/trip";

type FormState = {
  name: string;
  description: string;
  priceAdult: string;
  priceChild: string;
  benefits: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  priceAdult: "",
  priceChild: "",
  benefits: "",
  isActive: true,
});

export function StaffTripOptionsPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const { session } = useAuth();
  const isStaff = isStaffRole(session?.role);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<TripOption | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TripOption | null>(null);

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  const options = trip?.options ?? [];
  useDocumentTitle("Opciones del viaje");

  useEffect(() => {
    if (!editing) return;
    setForm({
      name: editing.name,
      description: editing.description ?? "",
      priceAdult: String(editing.priceAdult),
      priceChild: editing.priceChild != null ? String(editing.priceChild) : "",
      benefits: editing.benefits ?? "",
      isActive: editing.isActive,
    });
  }, [editing]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
    void queryClient.invalidateQueries({ queryKey: ["trips"] });
    void queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: TripOptionInput = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceAdult: Number(form.priceAdult),
        priceChild: form.priceChild.trim() ? Number(form.priceChild) : null,
        benefits: form.benefits.trim() || null,
        isActive: form.isActive,
        order: editing?.order ?? Math.max(0, ...options.map((option) => option.order)) + 1,
      };
      if (editing) return updateTripOption(tripId, editing.id, payload);
      return createTripOption(tripId, payload);
    },
    onSuccess: () => {
      invalidate();
      showToast(editing ? "Opción actualizada." : "Opción creada.", "success");
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
    mutationFn: (option: TripOption) =>
      updateTripOption(tripId, option.id, {
        name: option.name,
        description: option.description,
        priceAdult: Number(option.priceAdult),
        priceChild: option.priceChild != null ? Number(option.priceChild) : null,
        benefits: option.benefits,
        isActive: !option.isActive,
        order: option.order,
      }),
    onSuccess: (_data, option) => {
      invalidate();
      showToast(option.isActive ? "Opción desactivada." : "Opción activada.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (optionId: number) => deleteTripOption(tripId, optionId),
    onSuccess: () => {
      invalidate();
      showToast("Opción eliminada.", "success");
      setDeleteTarget(null);
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  if (!isStaff) {
    return (
      <EmptyState
        title="Acceso restringido"
        description="Solo el personal de la agencia administra las opciones del viaje."
        action={<Link to={`/staff/trips/${tripId}`} className={buttonClasses({ variant: "secondary" })}>Volver al viaje</Link>}
      />
    );
  }
  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }
  if (tripsQuery.isLoading) return <PageLoader label="Cargando opciones…" />;
  if (tripsQuery.isError || !trip) {
    return (
      <ErrorState
        message={tripsQuery.error instanceof Error ? tripsQuery.error.message : "No se pudo cargar el viaje."}
        onRetry={() => void tripsQuery.refetch()}
      />
    );
  }

  const submit = () => {
    setErrors([]);
    setServerError(null);
    const result: string[] = [];
    if (!form.name.trim()) result.push("El nombre de la opción es obligatorio.");
    if (form.name.length > 80) result.push("El nombre no puede superar 80 caracteres.");
    if (form.description.length > 400)
      result.push("La descripción no puede superar 400 caracteres.");
    if (form.priceAdult.trim() === "" || Number(form.priceAdult) < 0)
      result.push("El precio adulto debe ser mayor o igual a 0.");
    if (form.priceChild.trim() !== "" && Number(form.priceChild) < 0)
      result.push("El precio niño no puede ser negativo.");
    if (result.length) {
      setErrors(result);
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        backTo={`/staff/trips/${tripId}`}
        backLabel="Volver al viaje"
        eyebrow="Opciones y paquetes"
        title={trip.title}
        subtitle={`Capacidad efectiva ${bookableCapacity(trip)} asientos · Las opciones comparten el mismo cupo del viaje.`}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-start">
        <SectionCard
          title={editing ? "Editar opción" : "Nueva opción"}
          subtitle="Los precios de niño vacíos usan la tarifa de adulto."
          icon={<Tag className="size-5" />}
        >
          <div className="space-y-3">
            <TextField
              label="Nombre"
              value={form.name}
              maxLength={80}
              placeholder="Entrada General / VIP"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              label="Descripción (opcional)"
              value={form.description}
              maxLength={400}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Precio adulto"
                type="number"
                min={0}
                step="0.01"
                value={form.priceAdult}
                onChange={(event) => setForm({ ...form, priceAdult: event.target.value })}
              />
              <TextField
                label="Precio niño (opcional)"
                type="number"
                min={0}
                step="0.01"
                value={form.priceChild}
                onChange={(event) => setForm({ ...form, priceChild: event.target.value })}
              />
            </div>
            <TextArea
              label="Beneficios (uno por línea)"
              value={form.benefits}
              rows={5}
              maxLength={2000}
              placeholder={"Acceso al evento\nTransporte ejecutivo\nSeguro de viajero"}
              onChange={(event) => setForm({ ...form, benefits: event.target.value })}
            />
            <Switch
              checked={form.isActive}
              onChange={(value) => setForm({ ...form, isActive: value })}
              label="Opción activa"
              description="Las opciones inactivas no se muestran al cliente."
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
                {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
                {editing ? "Guardar cambios" : "Crear opción"}
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

        <SectionCard
          title="Opciones registradas"
          subtitle={`${options.length} opción(es) · la opción base no se puede eliminar`}
          icon={<Tag className="size-5" />}
        >
          <div className="space-y-3">
            {options.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">Este viaje no tiene opciones.</p>
            ) : (
              options
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((option) => (
                  <div key={option.id} className="rounded-[14px] border border-surface-container-high p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="inline-flex flex-wrap items-center gap-1.5 text-title-md text-on-surface">
                          {option.name}
                          {option.isBase ? <Badge>Base</Badge> : null}
                          {!option.isActive ? <Badge tone="cancelled">Inactiva</Badge> : null}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          Adulto {formatMxn(option.priceAdult)}
                          {option.priceChild != null
                            ? ` · Niño ${formatMxn(option.priceChild)}`
                            : " · Niño tarifa adulto"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setEditing(option)}>
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate(option)}
                        >
                          <Power className="size-3.5" />
                          {option.isActive ? "Desactivar" : "Activar"}
                        </Button>
                        {option.isBase ? (
                          <span className="inline-flex items-center rounded-lg bg-surface-container px-2.5 py-1.5 text-label-sm text-outline">
                            Base fija
                          </span>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(option)}>
                            <Trash2 className="size-3.5 text-error" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {option.description ? (
                      <p className="mt-1 text-body-sm text-on-surface-variant">{option.description}</p>
                    ) : null}
                    {(option.benefits ?? "")
                      .split("\n")
                      .filter(Boolean)
                      .slice(0, 5)
                      .map((benefit) => (
                        <p key={benefit} className="mt-1 inline-flex w-full items-start gap-1.5 text-body-sm text-on-surface-variant">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-secondary" />
                          {benefit.replace(/\*\*/g, "")}
                        </p>
                      ))}
                    <p className="mt-1 text-label-sm text-outline">
                      {option.availableSeats} disponibles · orden {option.order}
                    </p>
                  </div>
                ))
            )}
          </div>
        </SectionCard>
      </div>

      <Link to={`/staff/trips/${tripId}`} className="inline-flex items-center gap-1 text-label-md text-secondary">
        <ArrowLeft className="size-4" />
        Volver al detalle del viaje
      </Link>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar opción"
        description="Solo se puede eliminar si no tiene reservas registradas. Si tiene, desactívala."
        tone="danger"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p className="text-body-md text-on-surface">{deleteTarget?.name}</p>
      </ConfirmDialog>
    </div>
  );
}
