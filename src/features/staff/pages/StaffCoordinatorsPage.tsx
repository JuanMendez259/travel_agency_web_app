import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createCoordinator,
  deleteCoordinator,
  listCoordinators,
  resetCoordinatorPassword,
  updateCoordinator,
} from "@/features/staff/api";
import type { UserProfile } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { Button } from "@/shared/components/ui/Button";
import { TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { ConfirmDialog, Modal } from "@/shared/components/ui/Modal";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime } from "@/shared/lib/dates";
import { formatPhone } from "@/shared/lib/phone";

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(14);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

type CreateForm = { name: string; email: string; phone: string; password: string };

export function StaffCoordinatorsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateForm>({
    name: "",
    email: "",
    phone: "",
    password: generatePassword(),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [secret, setSecret] = useState<{ title: string; email: string; password: string } | null>(null);

  useDocumentTitle("Coordinadores");

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listCoordinators });
  const coordinators = useMemo(
    () => (usersQuery.data ?? []).filter((user) => user.role === "Coordinador"),
    [usersQuery.data],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createCoordinator({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        password: form.password,
      }),
    onSuccess: (created) => {
      invalidate();
      setSecret({
        title: "Coordinador creado",
        email: created.email,
        password: created.temporaryPassword ?? form.password,
      });
      setForm({ name: "", email: "", phone: "", password: generatePassword() });
      setFormError(null);
      showToast("Coordinador creado.", "success");
    },
    onError: (error) => {
      const message = errorMessage(error);
      setFormError(message);
      showToast(message, "error");
    },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateCoordinator(editing!.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setEditError(null);
      showToast("Coordinador actualizado.", "success");
    },
    onError: (error) => {
      const message = errorMessage(error);
      setEditError(message);
      showToast(message, "error");
    },
  });

  const resetMutation = useMutation({
    mutationFn: (id: number) => resetCoordinatorPassword(id),
    onSuccess: (result, id) => {
      const user = coordinators.find((item) => item.id === id);
      setSecret({
        title: "Contraseña restablecida",
        email: user?.email ?? "",
        password: result.temporaryPassword,
      });
      setResetTarget(null);
      showToast("Contraseña temporal generada.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCoordinator(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast("Coordinador eliminado.", "success");
    },
    onError: (error) => showToast(errorMessage(error), "error"),
  });

  const openEdit = (user: UserProfile) => {
    setEditing(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone ?? "");
    setEditError(null);
  };

  const validateCreate = () => {
    setFormError(null);
    if (!form.name.trim()) return "Escribe el nombre.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Escribe un correo válido.";
    if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    createMutation.mutate();
    return null;
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.password);
      showToast("Contraseña copiada.", "success");
    } catch {
      showToast("No se pudo copiar. Cópiala manualmente.", "error");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Equipo"
        title="Coordinadores"
        subtitle="Crea y administra las cuentas operativas. La contraseña temporal se muestra una sola vez."
        action={
          <span className="rounded-full bg-mint px-3 py-1.5 text-label-md text-primary-container">
            {coordinators.length} coordinador(es)
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <SectionCard title="Nuevo coordinador" icon={<UserCog className="size-5" />}>
          <div className="space-y-3">
            <TextField
              label="Nombre completo"
              value={form.name}
              maxLength={120}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <TextField
              label="Teléfono (opcional)"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <div>
              <label className="text-label-md text-on-surface-variant" htmlFor="coordinator-password">
                Contraseña temporal
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="coordinator-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="h-[52px] min-w-0 flex-1 rounded-[12px] border-[1.5px] border-input-border bg-white px-4 font-label text-title-md outline-none focus:border-emerald"
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                  aria-label="Generar contraseña"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Compártela por un canal seguro. El usuario puede cambiarla después.
              </p>
            </div>
            {formError ? (
              <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
                {formError}
              </p>
            ) : null}
            <Button
              className="w-full"
              loading={createMutation.isPending}
              onClick={() => {
                const error = validateCreate();
                if (error) setFormError(error);
              }}
            >
              <Plus className="size-4" />
              Crear coordinador
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Equipo de coordinación" icon={<Users className="size-5" />}>
          {usersQuery.isError ? (
            <ErrorState
              message={errorMessage(usersQuery.error) || "No se pudieron cargar los usuarios."}
              onRetry={() => void usersQuery.refetch()}
            />
          ) : usersQuery.isLoading ? (
            <PageLoader label="Cargando equipo…" />
          ) : coordinators.length === 0 ? (
            <EmptyState title="Sin coordinadores" description="Crea la primera cuenta operativa." />
          ) : (
            <div className="space-y-2">
              {coordinators.map((user) => (
                <div key={user.id} className="rounded-[14px] border border-surface-container-high p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-title-md text-on-surface">{user.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
                        <Mail className="size-3.5" /> {user.email}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
                        <Phone className="size-3.5" /> {user.phone ? formatPhone(user.phone) : "Sin teléfono"}
                      </p>
                    </div>
                    <span className="rounded-full bg-mint px-2.5 py-1 text-label-sm text-primary-container">
                      Coordinador
                    </span>
                  </div>
                  <p className="mt-1 text-label-sm text-outline">
                    Alta: {user.createdAt ? formatDateTime(user.createdAt) : "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResetTarget(user)}>
                      <KeyRound className="size-3.5" />
                      Resetear
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(user)}>
                      <Trash2 className="size-3.5 text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar coordinador"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              loading={editMutation.isPending}
              onClick={() => {
                if (!editName.trim()) return setEditError("El nombre es obligatorio.");
                if (!/^\S+@\S+\.\S+$/.test(editEmail.trim())) return setEditError("Correo inválido.");
                editMutation.mutate();
              }}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <TextField label="Nombre" value={editName} onChange={(event) => setEditName(event.target.value)} />
          <TextField label="Correo" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
          <TextField label="Teléfono" type="tel" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} />
          {editError ? <p className="text-body-sm text-error">{editError}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar coordinador"
        description="No se puede eliminar una cuenta con reservas registradas."
        tone="danger"
        confirmLabel="Eliminar"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        <p className="text-body-md text-on-surface">{deleteTarget?.name}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="Restablecer contraseña"
        description="Se generará una contraseña temporal que deberás compartir con el coordinador."
        confirmLabel="Generar contraseña"
        loading={resetMutation.isPending}
        onConfirm={() => resetTarget && resetMutation.mutate(resetTarget.id)}
      >
        <p className="text-body-md text-on-surface">{resetTarget?.name}</p>
      </ConfirmDialog>

      <Modal
        open={Boolean(secret)}
        onClose={() => setSecret(null)}
        title={secret?.title ?? "Contraseña temporal"}
        description="Guárdala ahora. No se volverá a mostrar."
        footer={
          <Button className="w-full" onClick={() => setSecret(null)}>
            Entendido
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-body-sm text-on-surface-variant">{secret?.email}</p>
          <div className="flex items-center gap-2 rounded-[12px] bg-surface-container-low p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-title-md text-primary-container">
              {secret?.password}
            </code>
            <Button variant="outline" size="sm" onClick={() => void copySecret()}>
              <Copy className="size-4" />
              Copiar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
