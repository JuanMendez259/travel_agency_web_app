import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Save, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  createTrip,
  listManageTrips,
  updateTrip,
  uploadTripImage,
} from "@/features/trips/api";
import type { Trip, TripUpsertInput } from "@/shared/api/types";
import { errorMessage } from "@/shared/api/client";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Select, Switch, TextArea, TextField } from "@/shared/components/ui/Form";
import { PageLoader } from "@/shared/components/ui/Media";
import { PageHeader, SectionCard } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { isTripCancelled } from "@/shared/lib/trip";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import {
  fromDateInputValue,
  fromDateTimeLocalValue,
  toDateInputValue,
  toDateTimeLocalValue,
} from "@/shared/lib/dates";

const CATEGORIES = [
  "Playa",
  "Montaña",
  "Aventura",
  "Cultural",
  "Familiar",
  "Lujo",
  "Bienestar",
  "Negocios",
  "Eventos",
  "Ecoturismo",
];

type FormState = {
  title: string;
  destination: string;
  description: string;
  category: string;
  transportType: "Camion" | "Camioneta";
  startDate: string;
  endDate: string;
  price: string;
  childPrice: string;
  capacity: string;
  cancellationDaysLimit: string;
  bookingDeadlineEnabled: boolean;
  bookingDeadline: string;
  isActive: boolean;
  hasTwoFloors: boolean;
  floor1Capacity: string;
  floor2Capacity: string;
  includesHotel: boolean;
  hotelName: string;
  hotelCapacity: string;
};

function defaultStart(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  date.setHours(8, 0, 0, 0);
  return toDateTimeLocalValue(date.toISOString());
}

function defaultEnd(start: string): string {
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(18, 0, 0, 0);
  return toDateTimeLocalValue(date.toISOString());
}

const emptyForm = (): FormState => {
  const start = defaultStart();
  return {
    title: "",
    destination: "",
    description: "",
    category: "",
    transportType: "Camion",
    startDate: start,
    endDate: defaultEnd(start),
    price: "",
    childPrice: "",
    capacity: "",
    cancellationDaysLimit: "3",
    bookingDeadlineEnabled: false,
    bookingDeadline: start.slice(0, 10),
    isActive: true,
    hasTwoFloors: false,
    floor1Capacity: "",
    floor2Capacity: "",
    includesHotel: false,
    hotelName: "",
    hotelCapacity: "",
  };
};

function fromTrip(trip: Trip): FormState {
  return {
    title: trip.title,
    destination: trip.destination,
    description: trip.description ?? "",
    category: trip.category ?? "",
    transportType: trip.transportType,
    startDate: toDateTimeLocalValue(trip.startDate),
    endDate: toDateTimeLocalValue(trip.endDate),
    price: String(trip.price),
    childPrice: trip.childPrice != null ? String(trip.childPrice) : "",
    capacity: String(trip.capacity),
    cancellationDaysLimit: String(trip.cancellationDaysLimit ?? 3),
    bookingDeadlineEnabled: Boolean(trip.bookingDeadline),
    bookingDeadline: toDateInputValue(trip.bookingDeadline ?? trip.startDate).slice(0, 10),
    isActive: trip.isActive,
    hasTwoFloors: trip.hasTwoFloors,
    floor1Capacity: trip.floor1Capacity != null ? String(trip.floor1Capacity) : "",
    floor2Capacity: trip.floor2Capacity != null ? String(trip.floor2Capacity) : "",
    includesHotel: trip.includesHotel,
    hotelName: trip.hotelName ?? "",
    hotelCapacity: trip.hotelCapacity != null ? String(trip.hotelCapacity) : "",
  };
}

export function StaffTripFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const tripId = Number(id);
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const initialized = useRef<number | null>(null);

  const tripsQuery = useQuery({
    queryKey: ["manageTrips"],
    queryFn: listManageTrips,
    enabled: editing && isAdmin,
  });
  const trip = (tripsQuery.data ?? []).find((item) => item.id === tripId) ?? null;
  useDocumentTitle(editing ? "Editar viaje" : "Nuevo viaje");

  useEffect(() => {
    if (!trip) return;
    if (initialized.current === trip.id) return;
    initialized.current = trip.id;
    setForm(fromTrip(trip));
  }, [trip]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const saved = editing ? await updateTrip(tripId, payload) : await createTrip(payload);
      if (imageFile) {
        try {
          await uploadTripImage(saved.id, imageFile);
        } catch {
          showToast("El viaje se guardó, pero la imagen no se pudo subir.", "error");
        }
      }
      return saved;
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["manageTrips"] });
      void queryClient.invalidateQueries({ queryKey: ["trips"] });
      void queryClient.invalidateQueries({ queryKey: ["trip", saved.id] });
      showToast(editing ? "Cambios guardados." : "Viaje creado.", "success");
      navigate(`/staff/trips/${saved.id}`);
    },
    onError: (error) => {
      const message = errorMessage(error);
      setServerError(message);
      showToast(message, "error");
    },
  });

  const update = (patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors([]);
  };

  const buildPayload = (): TripUpsertInput => {
    const twoFloors = form.transportType === "Camion" && form.hasTwoFloors;
    const floor1 = Number(form.floor1Capacity) || 0;
    const floor2 = Number(form.floor2Capacity) || 0;
    return {
      title: form.title.trim(),
      destination: form.destination.trim(),
      description: form.description.trim() || null,
      startDate: fromDateTimeLocalValue(form.startDate),
      endDate: fromDateTimeLocalValue(form.endDate),
      price: Number(form.price) || 0,
      childPrice: form.childPrice.trim() ? Number(form.childPrice) : null,
      capacity: twoFloors ? floor1 + floor2 : Number(form.capacity) || 0,
      transportType: form.transportType,
      imageUrl: trip?.imageUrl ?? null,
      isActive: form.isActive,
      category: form.category || null,
      bookingDeadline:
        form.bookingDeadlineEnabled && form.bookingDeadline
          ? fromDateInputValue(form.bookingDeadline)
          : null,
      cancellationDaysLimit: Number(form.cancellationDaysLimit) || 0,
      includesHotel: form.includesHotel,
      hotelName: form.includesHotel ? form.hotelName.trim() || null : null,
      hotelCapacity: form.includesHotel ? Number(form.hotelCapacity) || null : null,
      hasTwoFloors: twoFloors,
      floor1Capacity: twoFloors ? floor1 : null,
      floor2Capacity: twoFloors ? floor2 : null,
      originLatitude: trip?.originLatitude ?? null,
      originLongitude: trip?.originLongitude ?? null,
      destinationLatitude: trip?.destinationLatitude ?? null,
      destinationLongitude: trip?.destinationLongitude ?? null,
    };
  };

  const validate = (): string[] => {
    const result: string[] = [];
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!form.title.trim()) result.push("El título es obligatorio.");
    if (!form.destination.trim()) result.push("El destino es obligatorio.");
    if (!form.startDate || Number.isNaN(start.getTime())) result.push("Indica una fecha de salida válida.");
    else if (start.getTime() < today.getTime()) result.push("La salida no puede estar en el pasado.");
    if (!form.endDate || Number.isNaN(end.getTime())) result.push("Indica una fecha de regreso válida.");
    else if (!Number.isNaN(start.getTime()) && end.getTime() <= start.getTime())
      result.push("El regreso debe ser posterior a la salida.");

    if (form.transportType === "Camion" && form.hasTwoFloors) {
      if ((Number(form.floor1Capacity) || 0) < 1) result.push("El piso 1 debe tener al menos 1 asiento.");
      if ((Number(form.floor2Capacity) || 0) < 1) result.push("El piso 2 debe tener al menos 1 asiento.");
    } else if ((Number(form.capacity) || 0) < 1) {
      result.push("La capacidad debe ser de al menos 1 asiento.");
    }

    if (form.price.trim() === "" || Number(form.price) < 0) result.push("El precio debe ser mayor o igual a 0.");
    if (form.childPrice.trim() !== "" && Number(form.childPrice) < 0)
      result.push("El precio de niño no puede ser negativo.");
    if (form.cancellationDaysLimit.trim() === "" || Number(form.cancellationDaysLimit) < 0)
      result.push("El límite de cancelación debe ser 0 o más días.");
    if (form.includesHotel) {
      if (!form.hotelName.trim()) result.push("Indica el nombre del hotel.");
      if ((Number(form.hotelCapacity) || 0) < 1) result.push("El cupo del hotel debe ser al menos 1.");
    }
    if (form.bookingDeadlineEnabled) {
      if (!form.bookingDeadline) result.push("Indica la fecha límite de reserva.");
      else if (!Number.isNaN(start.getTime()) && new Date(form.bookingDeadline) > start)
        result.push("La fecha límite de reserva no puede ser posterior a la salida.");
    }
    return result;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setServerError(null);
    const validation = validate();
    setErrors(validation);
    if (validation.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    saveMutation.mutate();
  };

  if (!isAdmin) {
    return (
      <EmptyState
        title="Acceso restringido"
        description="Solo los administradores pueden crear o editar viajes."
        action={
          <Link to="/staff/trips" className={buttonClasses({ variant: "secondary" })}>
            Volver a viajes
          </Link>
        }
      />
    );
  }

  if (editing && tripsQuery.isLoading) return <PageLoader label="Cargando viaje…" />;
  if (editing && !tripsQuery.isLoading && !trip) {
    return <EmptyState title="Viaje no encontrado" description="Puede que se haya eliminado." />;
  }
  if (editing && trip && isTripCancelled(trip)) {
    return (
      <EmptyState
        title="Este viaje está cancelado"
        description="Los viajes cancelados conservan su historial y no se pueden editar."
        action={
          <Link to={`/staff/trips/${tripId}`} className={buttonClasses({ variant: "secondary" })}>
            Volver al detalle
          </Link>
        }
      />
    );
  }

  const twoFloors = form.transportType === "Camion" && form.hasTwoFloors;
  const computedCapacity = twoFloors
    ? (Number(form.floor1Capacity) || 0) + (Number(form.floor2Capacity) || 0)
    : Number(form.capacity) || 0;

  return (
    <form onSubmit={submit} className="space-y-5">
      <PageHeader
        backTo={editing ? `/staff/trips/${tripId}` : "/staff/trips"}
        backLabel="Cancelar"
        eyebrow={editing ? "Edición" : "Alta de viaje"}
        title={editing ? "Editar viaje" : "Nuevo viaje"}
        subtitle="Configura fechas, cupo, precios y publicación. La opción base se crea automáticamente."
        action={
          <Button type="submit" size="md" loading={saveMutation.isPending}>
            <Save className="size-4" />
            {editing ? "Guardar cambios" : "Guardar viaje"}
          </Button>
        }
      />

      {errors.length ? (
        <div role="alert" className="rounded-[16px] border border-error/20 bg-error-container p-4">
          <p className="flex items-center gap-2 text-title-md text-on-error-container">
            <ShieldAlert className="size-4" />
            Corrige estos detalles
          </p>
          <ul className="mt-1 list-disc pl-5 text-body-sm text-on-error-container">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {serverError ? (
        <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <SectionCard title="Datos del viaje">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField
                  label="Título"
                  value={form.title}
                  maxLength={200}
                  placeholder="Pumpkin Dash Monterrey"
                  onChange={(event) => update({ title: event.target.value })}
                />
              </div>
              <TextField
                label="Destino"
                value={form.destination}
                maxLength={150}
                placeholder="Monterrey, Nuevo León"
                onChange={(event) => update({ destination: event.target.value })}
              />
              <Select
                label="Categoría"
                value={form.category}
                onChange={(event) => update({ category: event.target.value })}
              >
                <option value="">Sin categoría</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
              <TextField
                label="Salida"
                type="datetime-local"
                value={form.startDate}
                onChange={(event) => {
                  const start = event.target.value;
                  update({
                    startDate: start,
                    endDate: form.endDate && new Date(form.endDate) > new Date(start) ? form.endDate : defaultEnd(start),
                  });
                }}
              />
              <TextField
                label="Regreso"
                type="datetime-local"
                value={form.endDate}
                onChange={(event) => update({ endDate: event.target.value })}
              />
              <TextField
                label="Precio adulto (MXN)"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.price}
                placeholder="1500"
                onChange={(event) => update({ price: event.target.value })}
              />
              <TextField
                label="Precio niño (opcional)"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.childPrice}
                placeholder="Igual al adulto"
                hint="Vacío = tarifa de adulto."
                onChange={(event) => update({ childPrice: event.target.value })}
              />
            </div>
          </SectionCard>

          <SectionCard title="Transporte y capacidad" subtitle="El cupo efectivo también considera el hotel">
            <Select
              label="Tipo de transporte"
              value={form.transportType}
              onChange={(event) =>
                update({
                  transportType: event.target.value as "Camion" | "Camioneta",
                  hasTwoFloors: event.target.value === "Camion" ? form.hasTwoFloors : false,
                })
              }
            >
              <option value="Camion">Autobús Panorámico</option>
              <option value="Camioneta">Camioneta Van VIP</option>
            </Select>

            {form.transportType === "Camion" ? (
              <div className="mt-3 rounded-[14px] bg-surface-container-low p-3">
                <Switch
                  checked={form.hasTwoFloors}
                  onChange={(value) => update({ hasTwoFloors: value })}
                  label="Autobús de dos pisos"
                  description="La capacidad total se calcula sumando ambos pisos."
                />
                {form.hasTwoFloors ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Asientos piso 1"
                      type="number"
                      min={1}
                      value={form.floor1Capacity}
                      onChange={(event) => update({ floor1Capacity: event.target.value })}
                    />
                    <TextField
                      label="Asientos piso 2"
                      type="number"
                      min={1}
                      value={form.floor2Capacity}
                      onChange={(event) => update({ floor2Capacity: event.target.value })}
                    />
                    <p className="text-body-sm text-soft sm:col-span-2 text-on-surface-variant">
                      Capacidad total: <strong>{computedCapacity}</strong> asientos.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!twoFloors ? (
              <div className="mt-3">
                <TextField
                  label="Capacidad de asientos"
                  type="number"
                  min={1}
                  value={form.capacity}
                  placeholder="50"
                  onChange={(event) => update({ capacity: event.target.value })}
                />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Hotel" subtitle="Solo si el viaje incluye hospedaje">
            <Switch
              checked={form.includesHotel}
              onChange={(value) =>
                update({
                  includesHotel: value,
                  hotelName: value ? form.hotelName : "",
                  hotelCapacity: value ? form.hotelCapacity : "",
                })
              }
              label="Este viaje incluye hotel"
              description="El cupo reservable será el mínimo entre transporte y hotel."
            />
            {form.includesHotel ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nombre del hotel"
                  value={form.hotelName}
                  maxLength={150}
                  onChange={(event) => update({ hotelName: event.target.value })}
                />
                <TextField
                  label="Cupo del hotel"
                  type="number"
                  min={1}
                  value={form.hotelCapacity}
                  onChange={(event) => update({ hotelCapacity: event.target.value })}
                />
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Reservas y cancelación">
            <Switch
              checked={form.bookingDeadlineEnabled}
              onChange={(value) => update({ bookingDeadlineEnabled: value })}
              label="Definir fecha límite de reserva"
              description="Si no se define, se usa la fecha de salida."
            />
            {form.bookingDeadlineEnabled ? (
              <div className="mt-3">
                <TextField
                  label="Fecha límite"
                  type="date"
                  value={form.bookingDeadline}
                  onChange={(event) => update({ bookingDeadline: event.target.value })}
                />
              </div>
            ) : null}
            <div className="mt-3">
              <TextField
                label="Días límite para cancelar con reembolso"
                type="number"
                min={0}
                value={form.cancellationDaysLimit}
                hint="Ej. 3 = reembolso del 100% hasta 3 días antes. Después se retiene 30%."
                onChange={(event) => update({ cancellationDaysLimit: event.target.value })}
              />
            </div>
          </SectionCard>

          <SectionCard title="Clasificación y descripción">
            <TextArea
              label="Descripción"
              value={form.description}
              maxLength={5000}
              rows={6}
              placeholder="Qué incluye, qué llevar, punto de encuentro…"
              onChange={(event) => update({ description: event.target.value })}
            />
          </SectionCard>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <SectionCard title="Imagen del viaje">
            <div className="overflow-hidden rounded-[14px] bg-surface-container-high">
              {imagePreview || trip?.imageUrl ? (
                <img
                  src={imagePreview ?? trip?.imageUrl ?? ""}
                  alt="Vista previa"
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] flex-col items-center justify-center gap-1 text-on-surface-variant">
                  <ImagePlus className="size-7" />
                  <span className="text-label-md">Sin imagen</span>
                </div>
              )}
            </div>
            <label className="mt-3 block text-label-md text-on-surface-variant">
              Subir imagen
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-body-sm text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:text-label-md file:text-primary-container"
              />
            </label>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              JPG, PNG o WebP · máximo 20 MB. Se optimiza automáticamente.
            </p>
          </SectionCard>

          <SectionCard title="Visibilidad">
            <Switch
              checked={form.isActive}
              onChange={(value) => update({ isActive: value })}
              label="Viaje activo"
              description="Pausado = no acepta reservas nuevas, pero las existentes siguen vigentes."
            />
            <div className="mt-3 rounded-[12px] bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
              <p>
                Capacidad efectiva: <strong className="text-on-surface">{computedCapacity || "—"}</strong>
              </p>
              <p>
                Precio adulto: <strong className="text-on-surface">{form.price ? `$${form.price}` : "—"}</strong>
              </p>
            </div>
          </SectionCard>

          <div className="space-y-2">
            <Button type="submit" size="lg" className="w-full" loading={saveMutation.isPending}>
              <Save className="size-4" />
              {editing ? "Guardar cambios" : "Guardar viaje"}
            </Button>
            <Link
              to={editing ? `/staff/trips/${tripId}` : "/staff/trips"}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-button border-[1.5px] border-input-border bg-white text-label-md text-on-surface hover:border-emerald"
            >
              <ArrowLeft className="size-4" />
              Cancelar
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}
