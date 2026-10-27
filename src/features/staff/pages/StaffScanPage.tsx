import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import jsQR from "jsqr";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Keyboard,
  QrCode,
  RotateCcw,
  ScanLine,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { checkinByToken } from "@/features/bookings/api";
import { listManageTrips } from "@/features/trips/api";
import type { CheckinTokenResult } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime, formatTripDetailDate } from "@/shared/lib/dates";

export function StaffScanPage() {
  const { id } = useParams();
  const tripId = Number(id);
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const tripsQuery = useQuery({ queryKey: ["manageTrips"], queryFn: listManageTrips });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  useDocumentTitle("Escanear QR");

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [result, setResult] = useState<CheckinTokenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const verifyRef = useRef<(value: string) => void>(() => undefined);

  const mutation = useMutation({
    mutationFn: (qrToken: string) => checkinByToken(qrToken, tripId),
    onSuccess: (data) => {
      processingRef.current = false;
      setResult(data);
      setError(null);
      setManualOpen(false);
      setToken("");
      void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
      void queryClient.invalidateQueries({ queryKey: ["booking"] });
      showToast(
        data.alreadyCheckedIn
          ? "Este boleto ya tenía check-in."
          : `Check-in registrado para ${data.name ?? "el pasajero"}.`,
        data.alreadyCheckedIn ? "info" : "success",
      );
    },
    onError: (mutationError) => {
      processingRef.current = false;
      const message = errorMessage(mutationError);
      setError(message);
      showToast(message, "error");
    },
  });

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  const verifyToken = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) {
      setError("Escribe o escanea un código QR.");
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    setError(null);
    setResult(null);
    mutation.mutate(cleaned);
  };
  verifyRef.current = verifyToken;

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este navegador no permite usar la cámara. Usa la verificación manual.");
      setManualOpen(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const tick = () => {
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2 || !streamRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        context.drawImage(video, 0, 0, width, height);
        const image = context.getImageData(0, 0, width, height);
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          stopCamera();
          verifyRef.current(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (cameraFailure) {
      const message =
        cameraFailure instanceof DOMException && cameraFailure.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilítalo o usa la verificación manual."
          : "No se pudo abrir la cámara. Usa la verificación manual.";
      setCameraError(message);
      setScanning(false);
      setManualOpen(true);
    }
  };

  useEffect(() => stopCamera, [stopCamera]);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Acceso restringido"
        description="El escaneo de QR está reservado al administrador en la API actual."
        action={<Link to={`/staff/trips/${tripId}`} className={buttonClasses({ variant: "secondary" })}>Volver al viaje</Link>}
      />
    );
  }
  if (!Number.isFinite(tripId)) {
    return <EmptyState title="Viaje no encontrado" description="El enlace no es válido." />;
  }
  if (tripsQuery.isLoading) return <PageLoader label="Cargando escáner…" />;
  if (!trip) {
    return <EmptyState title="Viaje no encontrado" description="Puede que se haya eliminado." />;
  }

  const reset = () => {
    setResult(null);
    setError(null);
    setToken("");
    processingRef.current = false;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        backTo={`/staff/trips/${tripId}/checkin`}
        backLabel="Volver al check-in"
        eyebrow="Control de acceso"
        title="Escanear QR"
        subtitle={`${trip.title} · ${formatTripDetailDate(trip.startDate)}`}
      />

      {trip.departureCompleted ? (
        <div className="rounded-card bg-error-container p-4 text-on-error-container">
          <p className="flex items-center gap-2 text-title-md">
            <AlertTriangle className="size-5" />
            Salida completada
          </p>
          <p className="mt-1 text-body-sm">El check-in está cerrado para este viaje.</p>
        </div>
      ) : !trip.checkInOpen ? (
        <div className="rounded-card bg-pending p-4 text-[#78350F]">
          <p className="flex items-center gap-2 text-title-md">
            <AlertTriangle className="size-5" />
            Check-in cerrado
          </p>
          <p className="mt-1 text-body-sm">
            Abre el check-in desde la pantalla de Check-in / Salida antes de escanear boletos.
          </p>
        </div>
      ) : null}

      <div className="rounded-card bg-white p-4 shadow-layer-1">
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[20px] bg-slate">
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full object-cover"
            aria-label="Vista de la cámara"
          />
          {!scanning ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate/85 p-6 text-center text-white">
              <CameraOff className="size-8 text-mint/70" />
              <p className="text-label-md text-mint">Cámara apagada</p>
              <Button variant="secondary" size="sm" onClick={() => void startCamera()}>
                <Camera className="size-4" />
                Activar cámara
              </Button>
            </div>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-8 rounded-[16px] border-2 border-mint/80 shadow-[0_0_0_9999px_rgba(15,23,42,.35)]" />
              <div className="absolute inset-x-0 bottom-3 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/80 px-3 py-1 text-label-sm text-white">
                  <span className="size-2 animate-pulse rounded-full bg-mint" />
                  Buscando código QR…
                </span>
              </div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {scanning ? (
            <Button variant="outline" size="sm" onClick={stopCamera}>
              <CameraOff className="size-4" />
              Detener cámara
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void startCamera()} disabled={mutation.isPending}>
              <ScanLine className="size-4" />
              Escanear con cámara
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setManualOpen((open) => !open)}>
            <Keyboard className="size-4" />
            Verificación manual
          </Button>
        </div>
        {cameraError ? (
          <p role="alert" className="mt-2 rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
            {cameraError}
          </p>
        ) : null}
      </div>

      {manualOpen ? (
        <SectionCard title="Verificación manual" icon={<Keyboard className="size-5" />}>
          <p className="text-body-sm text-on-surface-variant">
            Pega el token del QR (32 caracteres) o el código completo del pase.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <TextField
                label="Token del QR"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="p.ej. LE-ccG6g2R3P5mOlDdVoHgQYB8QGKKZq"
              />
            </div>
            <Button
              className="sm:mt-6"
              variant="primary"
              size="md"
              loading={mutation.isPending}
              onClick={() => verifyToken(token)}
            >
              Verificar
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {result ? (
        <div
          className={`rounded-card p-5 shadow-layer-1 ${
            result.alreadyCheckedIn ? "bg-pending" : "bg-confirmed"
          }`}
        >
          <p className="flex items-center gap-2 text-title-md text-on-surface">
            {result.alreadyCheckedIn ? (
              <AlertTriangle className="size-5 text-[#78350F]" />
            ) : (
              <CheckCircle2 className="size-5 text-secondary" />
            )}
            {result.alreadyCheckedIn ? "Ya tenía check-in" : "Check-in registrado"}
          </p>
          <p className="mt-1 text-headline-sm text-on-surface">{result.name ?? "Pasajero"}</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {result.kind === "passenger" ? "Acompañante" : "Titular"}
            {result.seats ? ` · ${result.seats} asiento(s)` : ""}
            {result.checkedInAt ? ` · ${formatDateTime(result.checkedInAt)}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                reset();
                void startCamera();
              }}
            >
              <RotateCcw className="size-4" />
              Escanear otro pasajero
            </Button>
            <Link to={`/staff/trips/${tripId}/checkin`} className={buttonClasses({ variant: "outline", size: "md" })}>
              Volver al check-in
            </Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-card bg-error-container p-4 text-on-error-container">
          <p className="flex items-center gap-2 text-title-md">
            <XCircle className="size-5" />
            No se pudo registrar el check-in
          </p>
          <p className="mt-1 text-body-sm">{error}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={reset}>
            Intentar de nuevo
          </Button>
        </div>
      ) : null}

      <div className="rounded-card bg-white p-4 text-body-sm text-on-surface-variant shadow-layer-1">
        <p className="inline-flex items-center gap-1.5 text-label-md text-on-surface">
          <QrCode className="size-4 text-secondary" />
          Consejos para escanear
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Apunta la cámara al código del pase del pasajero.</li>
          <li>El escáner se detiene al detectar el primer código.</li>
          <li>Si la cámara no funciona, usa el token en la verificación manual.</li>
          <li>El servidor rechaza el check-in si está cerrado o la salida se completó.</li>
        </ul>
      </div>
    </div>
  );
}
