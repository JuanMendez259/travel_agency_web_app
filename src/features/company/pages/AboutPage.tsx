import {
  ArrowRight,
  Compass,
  HeartHandshake,
  Instagram,
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Mountain,
  Share2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandLockup } from "@/shared/components/brand/LogoMark";
import { Button, buttonClasses } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { PageHeader } from "@/shared/components/ui/Section";
import { useToast } from "@/shared/components/ui/Toast";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AGENCY } from "@/shared/lib/agency";

const pillars = [
  {
    icon: Leaf,
    title: "Naturaleza primero",
    text: "Rutas que respetan los ecosistemas y temporadas de cada destino.",
  },
  {
    icon: HeartHandshake,
    title: "Comunidad local",
    text: "Trabajamos con guías, cocineras y anfitriones de cada región.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad operativa",
    text: "Unidades revisadas, seguro de viajero y protocolos de salida claros.",
  },
  {
    icon: Sparkles,
    title: "Transparencia",
    text: "Precios claros, cupo real y políticas de cancelación visibles antes de reservar.",
  },
];

const commitments = [
  "Reducir residuos en cada salida y pedir a nuestros viajeros que se lleven su basura.",
  "Respetar la flora, fauna y las comunidades que visitamos.",
  "Compartir el valor del viaje con proveedores y guías locales.",
];

export function AboutPage() {
  const { showToast } = useToast();
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  useDocumentTitle("Nosotros");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Proxima Parada Tours",
          text: "Escapadas, aventuras y viajes locales con Proxima Parada Tours.",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Enlace copiado.", "success");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") showToast("No se pudo compartir.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nosotros"
        title="Viajamos cerca para llegar lejos"
        subtitle="Una agencia de turismo local que cree en las escapadas bien hechas."
        action={
          <Button variant="outline" size="sm" onClick={() => void share()}>
            <Share2 className="size-4" />
            Compartir
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-[28px] bg-primary-container p-6 text-white sm:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 80% 10%, rgba(108,248,187,.25), transparent 40%), radial-gradient(circle at 10% 100%, rgba(150,213,163,.18), transparent 48%)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-2xl">
          <BrandLockup invert />
          <h2 className="mt-5 text-[32px] leading-[1.12] font-extrabold tracking-[-0.02em] sm:text-[40px]">
            La naturaleza no es el escenario.
            <br />
            Es la razón del viaje.
          </h2>
          <p className="mt-3 max-w-xl text-body-lg text-mint/85">
            Nacimos en Guadalajara con una idea simple: que cualquier persona pueda descubrir
            ríos, cascadas, montañas y pueblos mágicos con una operación cuidada, cercana y
            honesta.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/explore" className={buttonClasses({ variant: "secondary", size: "md" })}>
              <Compass className="size-4" />
              Explorar próximas salidas
            </Link>
            <Button
              variant="outline"
              size="md"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => setCommitmentOpen(true)}
            >
              <Leaf className="size-4" />
              Nuestro compromiso
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card bg-white p-5 shadow-layer-1">
          <p className="text-label-sm uppercase tracking-[0.12em] text-secondary">
            Manifiesto verde
          </p>
          <blockquote className="mt-2 text-headline-sm leading-snug text-on-surface">
            “Queremos que nuestros viajeros regresen con barro en los zapatos, fotos en la memoria
            y la certeza de que viajar cerca también cambia el mundo.”
          </blockquote>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Equipo Proxima Parada Tours
          </p>
        </div>
        <div className="rounded-card bg-mint p-5">
          <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.12em] text-secondary">
            <Mountain className="size-3.5" />
            Nuestro punto de partida
          </p>
          <p className="mt-2 text-body-md text-on-surface">
            Salimos desde Guadalajara y su zona metropolitana hacia destinos de Jalisco, Nayarit,
            Michoacán, Guanajuato y más.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
            <MapPin className="size-3.5" />
            Operación local, grupos pequeños
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-headline-md text-on-surface">Nuestros 4 pilares</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-card bg-white p-4 shadow-layer-1">
              <span className="grid size-10 place-items-center rounded-full bg-mint text-primary-container">
                <pillar.icon className="size-4" />
              </span>
              <h3 className="mt-2 text-title-md text-on-surface">{pillar.title}</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-white p-5 shadow-layer-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-headline-md text-on-surface">Impacto en el camino</h2>
            <p className="text-body-sm text-on-surface-variant">
              Cifras de muestra del programa de turismo responsable.
            </p>
          </div>
          <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-outline">
            Contenido de muestra
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { value: "1,240", label: "Árboles nativos plantados", icon: Sprout },
            { value: "38", label: "Familias locales colaborando", icon: Users },
            { value: "12", label: "Destinos con operación propia", icon: MapPin },
          ].map((item) => (
            <div key={item.label} className="rounded-[14px] bg-surface-container-low p-4">
              <item.icon className="size-4 text-secondary" />
              <p className="mt-2 text-headline-md text-primary-container">{item.value}</p>
              <p className="text-body-sm text-on-surface-variant">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card bg-white p-5 shadow-layer-1">
          <h2 className="text-headline-sm text-on-surface">Compromisos de operación</h2>
          <ul className="mt-3 space-y-2">
            {[
              "Unidades con mantenimiento y seguro vigente.",
              "Guías con conocimiento local y primeros auxilios.",
              "Itinerarios claros y puntos de encuentro confirmados.",
              "Atención por WhatsApp antes, durante y después del viaje.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card bg-primary-container p-5 text-white shadow-layer-1">
          <h2 className="text-headline-sm">Hablemos de tu próximo viaje</h2>
          <p className="mt-1 text-body-sm text-mint/80">
            Escríbenos para cotizaciones grupales, viajes privados o dudas sobre una salida.
          </p>
          <div className="mt-3 space-y-2 text-body-sm">
            <a href={`mailto:${AGENCY.email}`} className="flex items-center gap-2 text-mint hover:text-white">
              <Mail className="size-4" />
              {AGENCY.email}
            </a>
            <a
              href={`https://wa.me/${AGENCY.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-mint hover:text-white"
            >
              <MessageCircle className="size-4" />
              WhatsApp {AGENCY.phone}
            </a>
            <a
              href={AGENCY.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-mint hover:text-white"
            >
              <Instagram className="size-4" />
              @proxima_parada_tours
            </a>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-white/10 px-3 py-2 text-label-sm text-mint">
            <span className="size-2 rounded-full bg-secondary-container" />
            Atención activa · Lun a sáb, 9:00 a 19:00
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-mint p-6 text-center">
        <h2 className="text-headline-md text-primary-container">¿Listo para la próxima parada?</h2>
        <p className="mx-auto mt-1 max-w-xl text-body-md text-on-surface-variant">
          Consulta las salidas disponibles, elige tu asiento y vive una escapada sin complicaciones.
        </p>
        <Link
          to="/explore"
          className={`${buttonClasses({ variant: "primary", size: "lg" })} mt-4`}
        >
          Explorar viajes
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-container-high pt-4 text-body-sm text-on-surface-variant">
        <BrandLockup compact />
        <p>© {new Date().getFullYear()} Proxima Parada Tours. Turismo responsable en México.</p>
      </footer>

      <Modal
        open={commitmentOpen}
        onClose={() => setCommitmentOpen(false)}
        title="Nuestro compromiso verde"
        description="Tres compromisos que guían cada salida."
        footer={
          <Button className="w-full" onClick={() => setCommitmentOpen(false)}>
            Entendido
          </Button>
        }
      >
        <ol className="space-y-3">
          {commitments.map((commitment, index) => (
            <li key={commitment} className="flex gap-3 rounded-[14px] bg-surface-container-low p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-container text-label-md text-white">
                {index + 1}
              </span>
              <p className="text-body-md text-on-surface-variant">{commitment}</p>
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  );
}
