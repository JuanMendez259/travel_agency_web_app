import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  CreditCard,
  Download,
  HelpCircle,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  getMyProfile,
  getMyStats,
  getWallet,
  listMyPayouts,
  requestPayout,
  updateMyProfile,
} from "@/features/profile/api";
import { errorMessage } from "@/shared/api/client";
import type { WalletType } from "@/shared/api/types";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Switch, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { Modal } from "@/shared/components/ui/Modal";
import { QrCode } from "@/shared/components/ui/QrCode";
import { SectionCard } from "@/shared/components/ui/Section";
import { PayoutStatusBadge } from "@/shared/components/ui/StatusBadge";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AGENCY } from "@/shared/lib/agency";
import { formatDateTime } from "@/shared/lib/dates";
import { formatMxn, toDecimal } from "@/shared/lib/money";
import { isValidMxPhone, normalizePhone, formatPhone } from "@/shared/lib/phone";
import { cn } from "@/shared/lib/cn";

const transactionLabels: Record<WalletType, string> = {
  CancellationCredit: "Reembolso por cancelación",
  BookingPayment: "Pago de reserva",
  PayoutRequest: "Retiro solicitado",
  Adjustment: "Ajuste de saldo",
};

export function ProfilePage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  useDocumentTitle("Mi perfil");

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getMyProfile });
  const statsQuery = useQuery({ queryKey: ["profileStats"], queryFn: getMyStats });
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const payoutsQuery = useQuery({ queryKey: ["payouts", "me"], queryFn: listMyPayouts });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const profile = profileQuery.data;
  const wallet = walletQuery.data;
  const available = toDecimal(wallet?.available ?? 0);

  useEffect(() => {
    const stored = localStorage.getItem("ppt.notificationsEnabled");
    if (stored != null) setNotificationsEnabled(stored === "true");
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone ?? "");
      setEmergencyContact(profile.emergencyContact ?? "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        name: name.trim(),
        phone: phone.trim() ? normalizePhone(phone) : null,
        emergencyContact: emergencyContact.trim() || null,
      }),
    onSuccess: () => {
      setEditOpen(false);
      setEditError(null);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      showToast("Datos actualizados.", "success");
    },
    onError: (error) => {
      const message = errorMessage(error);
      setEditError(message);
      showToast(message, "error");
    },
  });

  const payoutMutation = useMutation({
    mutationFn: () => requestPayout(Number(payoutAmount), payoutNote.trim() || null),
    onSuccess: () => {
      setPayoutAmount("");
      setPayoutNote("");
      setPayoutError(null);
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["payouts", "me"] });
      showToast("Solicitud de reembolso enviada. La agencia la revisará.", "success");
    },
    onError: (error) => {
      const message = errorMessage(error);
      setPayoutError(message);
      showToast(message, "error");
    },
  });

  const initials = (profile?.name ?? session?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const passId = profile?.qrToken
    ? `PPT-${profile.qrToken.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`
    : "PPT-000000";

  const saveProfile = () => {
    setEditError(null);
    if (!name.trim()) {
      setEditError("El nombre no puede estar vacío.");
      return;
    }
    if (phone.trim() && !isValidMxPhone(phone)) {
      setEditError("El teléfono debe tener 10 dígitos (o 12 con lada 52).");
      return;
    }
    updateMutation.mutate();
  };

  const submitPayout = () => {
    setPayoutError(null);
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayoutError("Indica un monto mayor a cero.");
      return;
    }
    if (toDecimal(amount).gt(available)) {
      setPayoutError(`El monto supera tu saldo disponible (${formatMxn(available)}).`);
      return;
    }
    payoutMutation.mutate();
  };

  const sharePass = async () => {
    const text = `Mi pase de viajero de Proxima Parada Tours: ${passId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi pase Proxima Parada", text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast("Pase copiado al portapapeles.", "success");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        showToast("No se pudo compartir el pase.", "error");
      }
    }
  };

  const handleLogout = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  if (profileQuery.isLoading) return <PageLoader label="Cargando tu perfil…" />;

  if (profileQuery.isError || !profile) {
    return (
      <div className="rounded-card bg-error-container p-5 text-on-error-container">
        <p>No pudimos cargar tu perfil.</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => void profileQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const transactions = (wallet?.transactions ?? []).slice(0, 8);
  const payouts = payoutsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-secondary">Mi cuenta</p>
          <h1 className="text-headline-lg text-on-surface">Mi perfil</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full p-2 text-outline hover:bg-error-container hover:text-error"
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-card bg-white shadow-layer-1">
            <div className="relative bg-primary-container px-5 pt-5 pb-14 text-white">
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(circle at 90% 10%, rgba(108,248,187,.28), transparent 45%), radial-gradient(circle at 20% 120%, rgba(150,213,163,.2), transparent 50%)",
                }}
                aria-hidden="true"
              />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <p className="text-label-sm uppercase tracking-[0.14em] text-mint">
                  Proxima Parada Tours
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-label-sm text-mint">
                  <BadgeCheck className="size-3.5" />
                  Activo
                </span>
              </div>
            </div>
            <div className="-mt-10 px-5 pb-5">
              <div className="flex items-end justify-between gap-3">
                <div className="relative">
                  <div className="grid size-20 place-items-center rounded-full border-4 border-white bg-mint text-headline-md font-extrabold text-primary-container shadow-layer-1">
                    {initials}
                  </div>
                  <button
                    type="button"
                    aria-label="Cambiar foto (próximamente)"
                    onClick={() => showToast("La foto de perfil estará disponible pronto.", "info")}
                    className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-full border-2 border-white bg-primary-container text-white"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  Editar datos
                </Button>
              </div>
              <h2 className="mt-3 text-headline-md text-on-surface">{profile.name}</h2>
              <p className="text-body-md text-on-surface-variant">{profile.email}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-[12px] bg-surface-container-low p-2.5 text-center">
                  <p className="text-headline-sm text-primary-container">
                    {statsQuery.data?.trips ?? "—"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Viajes hechos</p>
                </div>
                <div className="rounded-[12px] bg-surface-container-low p-2.5 text-center">
                  <p className="text-headline-sm text-primary-container">
                    {statsQuery.data?.reviews ?? "—"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Reseñas</p>
                </div>
                <div className="rounded-[12px] bg-surface-container-low p-2.5 text-center">
                  <p className="text-headline-sm text-primary-container">
                    {formatMxn(available)}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Saldo</p>
                </div>
              </div>

              <p className="mt-4 text-label-sm uppercase tracking-wide text-on-surface-variant">
                Datos personales
              </p>
              <dl className="mt-1.5 space-y-2 text-body-md">
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-on-surface-variant">
                    <UserRound className="size-4" /> Nombre
                  </dt>
                  <dd className="truncate text-on-surface">{profile.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-on-surface-variant">
                    <Mail className="size-4" /> Correo
                  </dt>
                  <dd className="truncate text-on-surface">{profile.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-on-surface-variant">
                    <Phone className="size-4" /> Teléfono
                  </dt>
                  <dd className="inline-flex items-center gap-1 text-on-surface">
                    {profile.phone ? formatPhone(profile.phone) : "Sin registrar"}
                    {profile.phone ? <BadgeCheck className="size-4 text-secondary" /> : null}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-on-surface-variant">
                    <ShieldCheck className="size-4" /> Emergencia
                  </dt>
                  <dd className="truncate text-on-surface">
                    {profile.emergencyContact ?? "Sin registrar"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <SectionCard
            title="Mi billetera"
            subtitle="Saldo a favor generado por reembolsos"
            icon={<Wallet className="size-5" />}
            action={<span className="text-price-display text-primary-container">{formatMxn(available)}</span>}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[12px] bg-surface-container-low p-3">
                <p className="text-label-sm text-on-surface-variant">Saldo total</p>
                <p className="text-title-md text-on-surface">{formatMxn(wallet?.balance ?? 0)}</p>
              </div>
              <div className="rounded-[12px] bg-surface-container-low p-3">
                <p className="text-label-sm text-on-surface-variant">Retenido</p>
                <p className="text-title-md text-on-surface">{formatMxn(wallet?.held ?? 0)}</p>
              </div>
              <div className="rounded-[12px] bg-mint p-3">
                <p className="text-label-sm text-primary-container">Disponible</p>
                <p className="text-title-md text-primary-container">{formatMxn(available)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-label-md text-on-surface">Movimientos recientes</p>
              {transactions.length === 0 ? (
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Aún no hay movimientos en tu monedero.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-surface-container-high">
                  {transactions.map((transaction) => {
                    const positive = toDecimal(transaction.amount).gte(0);
                    return (
                      <li key={transaction.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-body-md text-on-surface">
                            {transactionLabels[transaction.type] ?? transaction.type}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                            {formatDateTime(transaction.createdAt)}
                            {transaction.note ? ` · ${transaction.note}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-title-md",
                            positive ? "text-secondary" : "text-error",
                          )}
                        >
                          {positive ? "+" : ""}
                          {formatMxn(transaction.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {available.gt(0) ? (
              <div className="mt-4 rounded-[14px] bg-surface-container-low p-3">
                <p className="text-label-md text-on-surface">Solicitar reembolso de mi saldo</p>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  La agencia revisará tu solicitud y te contactará para entregarte el monto.
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr]">
                  <TextField
                    label="Monto"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={available.toNumber()}
                    step="0.01"
                    value={payoutAmount}
                    onChange={(event) => setPayoutAmount(event.target.value)}
                  />
                  <TextField
                    label="Nota (opcional)"
                    value={payoutNote}
                    maxLength={300}
                    placeholder="Ej. Transferencia BBVA"
                    onChange={(event) => setPayoutNote(event.target.value)}
                  />
                </div>
                {payoutError ? (
                  <p role="alert" className="mt-1 text-body-sm text-error">
                    {payoutError}
                  </p>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  loading={payoutMutation.isPending}
                  onClick={submitPayout}
                >
                  <Plus className="size-4" />
                  Solicitar reembolso
                </Button>
              </div>
            ) : null}

            {payouts.length ? (
              <div className="mt-4">
                <p className="text-label-md text-on-surface">Mis solicitudes</p>
                <ul className="mt-2 space-y-2">
                  {payouts.map((payout) => (
                    <li
                      key={payout.id}
                      className="flex items-center justify-between gap-2 rounded-[12px] border border-surface-container-high px-3 py-2"
                    >
                      <div>
                        <p className="text-body-md text-on-surface">{formatMxn(payout.amount)}</p>
                        <p className="text-body-sm text-on-surface-variant">
                          {formatDateTime(payout.createdAt)}
                          {payout.note ? ` · ${payout.note}` : ""}
                        </p>
                      </div>
                      <PayoutStatusBadge status={payout.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Configuración" icon={<Smartphone className="size-5" />}>
            <div className="space-y-3">
              <Switch
                checked={notificationsEnabled}
                onChange={(value) => {
                  setNotificationsEnabled(value);
                  localStorage.setItem("ppt.notificationsEnabled", String(value));
                }}
                label="Avisos en este dispositivo"
                description="Guarda tu preferencia local. Los avisos siempre están disponibles en la app."
              />
              {[
                { icon: CreditCard, label: "Métodos de pago", hint: "Próximamente" },
                { icon: ShieldCheck, label: "Cambiar contraseña", hint: "Próximamente" },
                { icon: Mail, label: "Actualizar correo", hint: "Próximamente" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => showToast(`${item.label}: próximamente.`, "info")}
                  className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-surface-container-high px-3 py-2.5 text-left transition hover:bg-surface-container-low"
                >
                  <span className="inline-flex items-center gap-2 text-body-md text-on-surface">
                    <item.icon className="size-4 text-on-surface-variant" />
                    {item.label}
                  </span>
                  <span className="text-label-sm text-outline">{item.hint}</span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Soporte" icon={<HelpCircle className="size-5" />}>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={`https://wa.me/${AGENCY.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: "secondary", size: "md" })}
              >
                <MessageCircle className="size-4" />
                Centro de soporte
              </a>
              <a
                href={`mailto:${AGENCY.email}`}
                className={buttonClasses({ variant: "outline", size: "md" })}
              >
                <Mail className="size-4" />
                Escríbenos
              </a>
            </div>
            <div className="mt-3 flex items-center justify-between text-body-sm text-on-surface-variant">
              <span>Proxima Parada Tours · v0.1.0</span>
              <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1 text-error">
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-[22px] bg-primary-container p-4 text-white shadow-layer-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-sm uppercase tracking-[0.14em] text-mint">
                  Pase Viajero
                </p>
                <p className="text-headline-sm">Proxima Parada Tours</p>
              </div>
              <span className="rounded-full bg-secondary-container px-2 py-1 text-label-sm text-on-secondary-container">
                Activo
              </span>
            </div>
            <div className="mt-3 flex flex-col items-center">
              <QrCode value={profile.qrToken} size={156} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-body-sm text-mint/70">Titular</p>
                <p className="text-title-md">{profile.name}</p>
                <p className="mt-1 text-body-sm text-mint/70">
                  Saldo {formatMxn(available)}
                  {toDecimal(wallet?.held ?? 0).gt(0)
                    ? ` · Retenido ${formatMxn(wallet?.held ?? 0)}`
                    : ""}
                </p>
              </div>
              <p className="text-label-md tracking-[0.12em] text-mint">{passId}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void sharePass()}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-white/15 text-label-md text-white hover:bg-white/25"
              >
                <Share2 className="size-4" />
                Compartir
              </button>
              <button
                type="button"
                onClick={() => showToast("Guardar el pase como imagen estará disponible pronto.", "info")}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-white/15 text-label-md text-white hover:bg-white/25"
              >
                <Download className="size-4" />
                Guardar
              </button>
            </div>
          </div>

          <div className="rounded-card bg-white p-4 shadow-layer-1">
            <p className="inline-flex items-center gap-1.5 text-label-md text-on-surface">
              <Sparkles className="size-4 text-secondary" />
              Billeteras digitales
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Próximamente podrás agregar tu pase a Apple Wallet y Google Wallet.
            </p>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-surface-container px-3 py-2 text-label-sm text-outline">
                <Smartphone className="size-4" /> Apple Wallet
              </span>
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-surface-container px-3 py-2 text-label-sm text-outline">
                <Smartphone className="size-4" /> Google Wallet
              </span>
            </div>
          </div>

          <a
            href={AGENCY.instagram}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-card bg-white p-4 text-body-md text-on-surface shadow-layer-1 hover:text-primary-container"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-secondary" />
              Síguenos en Instagram
            </span>
            <ChevronRight className="size-4 text-outline" />
          </a>

          <div className="rounded-card bg-mint p-4">
            <p className="inline-flex items-center gap-1.5 text-label-md text-primary-container">
              <Ticket className="size-4" />
              Tu próximo viaje
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Revisa tus reservas y comparte tu QR en el abordaje.
            </p>
            <Link to="/bookings" className={cn(buttonClasses({ variant: "primary", size: "sm" }), "mt-2")}>
              Ver mis viajes
            </Link>
          </div>
        </aside>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar mis datos"
        description="Tu nombre y contacto de emergencia solo se usan para la operación del viaje."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" loading={updateMutation.isPending} onClick={saveProfile}>
              Guardar cambios
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <TextField
            label="Nombre completo"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Teléfono"
            type="tel"
            inputMode="tel"
            value={phone}
            placeholder="444 123 4567"
            hint="10 dígitos. Se usa para contactarte durante el viaje."
            onChange={(event) => setPhone(event.target.value)}
          />
          <TextField
            label="Contacto de emergencia"
            value={emergencyContact}
            maxLength={120}
            placeholder="Nombre y teléfono"
            onChange={(event) => setEmergencyContact(event.target.value)}
          />
          {editError ? (
            <p role="alert" className="text-body-sm text-error">
              {editError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
