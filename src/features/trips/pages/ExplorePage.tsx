import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  Heart,
  Leaf,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useFavorites, useToggleFavorite } from "@/features/favorites/hooks";
import { listTrips } from "@/features/trips/api";
import { BrandLockup } from "@/shared/components/brand/LogoMark";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ErrorState } from "@/shared/components/feedback/ErrorState";
import { TripCard } from "@/shared/components/trips/TripCard";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Chip } from "@/shared/components/ui/Chip";
import { CardSkeleton } from "@/shared/components/ui/Media";
import { useToast } from "@/shared/components/ui/Toast";
import { AGENCY } from "@/shared/lib/agency";
import { cn } from "@/shared/lib/cn";

const CATEGORY_ORDER = [
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

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const trust = [
  { icon: ShieldCheck, title: "Salidas garantizadas", text: "Operación local y segura" },
  { icon: Leaf, title: "Guías certificados", text: "Conocen cada rincón" },
  { icon: Users, title: "Grupos pequeños", text: "Viajes con trato cercano" },
];

export function ExplorePage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");

  const tripsQuery = useQuery({ queryKey: ["trips"], queryFn: listTrips });
  const favoritesQuery = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const favoriteIds = useMemo(
    () => new Set((favoritesQuery.data ?? []).map((trip) => trip.id)),
    [favoritesQuery.data],
  );

  const trips = tripsQuery.data ?? [];

  const categories = useMemo(() => {
    const found = new Set(trips.map((trip) => trip.category).filter(Boolean) as string[]);
    const ordered = CATEGORY_ORDER.filter((name) => found.has(name));
    const extra = [...found]
      .filter((name) => !CATEGORY_ORDER.includes(name))
      .sort((a, b) => a.localeCompare(b, "es"));
    return ["Todas", ...ordered, ...extra];
  }, [trips]);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return trips.filter((trip) => {
      const matchesCategory =
        category === "Todas" || (trip.category ?? "").toLowerCase() === category.toLowerCase();
      if (!matchesCategory) return false;
      if (!term) return true;
      const haystack = normalize(
        `${trip.title} ${trip.destination} ${trip.category ?? ""} ${trip.description ?? ""}`,
      );
      return haystack.includes(term);
    });
  }, [trips, search, category]);

  const onToggleFavorite = (tripId: number) => {
    const favorite = favoriteIds.has(tripId);
    toggleFavorite.mutate(
      { tripId, favorite },
      {
        onError: (error) =>
          showToast(
            error instanceof Error ? error.message : "No se pudo actualizar favoritos.",
            "error",
          ),
        onSuccess: () =>
          showToast(favorite ? "Viaje quitado de favoritos." : "Viaje guardado en favoritos.", "success"),
      },
    );
  };

  const initials = (session?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <BrandLockup />
        <div className="flex items-center gap-1">
          <Link
            to="/favorites"
            aria-label="Favoritos"
            className="relative rounded-full p-2 text-primary-container hover:bg-mint"
          >
            <Heart className="size-5" />
            {favoriteIds.size ? (
              <span className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-secondary text-[9px] font-bold text-white">
                {favoriteIds.size}
              </span>
            ) : null}
          </Link>
          <Link
            to="/profile"
            aria-label="Mi perfil"
            className="grid size-9 place-items-center rounded-full bg-primary-container text-label-md text-white"
          >
            {initials}
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[28px] bg-primary-container px-5 py-6 text-white shadow-layer-1 sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 88% 18%, rgba(108,248,187,.22), transparent 38%), radial-gradient(circle at 10% 100%, rgba(150,213,163,.16), transparent 45%)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-label-md text-mint">
            <Sparkles className="size-3.5" />
            {greeting()}, {session?.name.split(" ")[0] ?? "aventurero"}
          </p>
          <h1 className="mt-3 max-w-2xl text-[30px] leading-[1.12] font-extrabold tracking-[-0.02em] sm:text-[38px]">
            Tu próximo fin de semana tiene otro destino.
          </h1>
          <p className="mt-2 max-w-xl text-body-md text-mint/80 sm:text-body-lg">
            Ríos, cascadas y pueblos mágicos con salidas desde la ciudad. Elige tu asiento y
            nosotros nos encargamos del resto.
          </p>

          <label className="mt-5 flex max-w-2xl items-center gap-3 rounded-[16px] bg-white p-1.5 pl-4 shadow-layer-2">
            <Search className="size-5 shrink-0 text-outline" aria-hidden="true" />
            <span className="sr-only">Buscar viajes</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ríos, cascadas, pueblos mágicos…"
              className="h-11 min-w-0 flex-1 bg-transparent text-title-md text-on-surface outline-none placeholder:text-outline"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-lg px-3 py-2 text-label-md text-secondary hover:bg-mint"
              >
                Limpiar
              </button>
            ) : (
              <span className="hidden shrink-0 rounded-[12px] bg-mint px-3 py-2 text-label-md text-primary-container sm:inline-flex">
                Explorar
              </span>
            )}
          </label>
        </div>
      </section>

      <section aria-label="Categorías" className="-mx-1 overflow-x-auto pb-1">
        <div className="flex gap-2 px-1">
          {categories.map((name) => (
            <Chip
              key={name}
              selected={category === name}
              onClick={() => setCategory(name)}
              className={cn(
                category === name &&
                  "border-primary-container bg-primary-container text-white hover:bg-primary",
              )}
              aria-pressed={category === name}
            >
              {name}
            </Chip>
          ))}
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-3" aria-label="Por qué viajar con nosotros">
        {trust.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-[16px] border border-white bg-white/70 px-4 py-3 shadow-layer-1 backdrop-blur"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-primary-container">
              <item.icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-label-md text-on-surface">{item.title}</p>
              <p className="truncate text-body-sm text-on-surface-variant">{item.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-headline-md text-on-surface">Próximas salidas locales</h2>
            <p className="text-body-sm text-on-surface-variant">
              {tripsQuery.isLoading
                ? "Cargando experiencias…"
                : `${filtered.length} experiencia${filtered.length === 1 ? "" : "s"} disponible${filtered.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tripsQuery.isFetching ? (
              <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                <RefreshCw className="size-3.5 animate-spin" /> Actualizando
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void tripsQuery.refetch()}
              aria-label="Actualizar viajes"
            >
              <RefreshCw className="size-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {tripsQuery.isError ? (
          <ErrorState
            message={
              tripsQuery.error instanceof Error
                ? tripsQuery.error.message
                : "No pudimos cargar los viajes."
            }
            onRetry={() => void tripsQuery.refetch()}
          />
        ) : tripsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={trips.length === 0 ? "Aún no hay salidas publicadas" : "Sin resultados para tu búsqueda"}
            description={
              trips.length === 0
                ? "Estamos preparando las próximas expediciones. Vuelve pronto o escríbenos por WhatsApp."
                : "Prueba con otro destino, categoría o limpia el buscador."
            }
            action={
              trips.length === 0 ? (
                <a
                  href={`https://wa.me/${AGENCY.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                >
                  <MessageCircle className="size-4" />
                  Escríbenos
                </a>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setCategory("Todas");
                  }}
                >
                  Limpiar filtros
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                favorite={favoriteIds.has(trip.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[24px] bg-mint p-5 sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.1em] text-secondary">
              <Compass className="size-3.5" />
              Viaje a tu medida
            </p>
            <h2 className="mt-1 text-headline-md text-primary-container">
              ¿Grupo privado o cotización especial?
            </h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Armamos rutas para familias, escuelas y empresas. Cuéntanos cuántos son y qué
              quieren vivir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${AGENCY.whatsapp}?text=${encodeURIComponent(
                "Hola, quiero cotizar un viaje privado con Proxima Parada Tours.",
              )}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              <MessageCircle className="size-4" />
              Cotizar por WhatsApp
            </a>
            <Link to="/about" className={buttonClasses({ variant: "outline", size: "md" })}>
              Conócenos
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-dashed border-outline-variant/60 px-4 py-3 text-body-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 text-secondary" />
          Salidas desde Guadalajara y zona metropolitana
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Leaf className="size-3.5 text-secondary" />
          Operación con proveedores locales
        </span>
      </div>
    </div>
  );
}
