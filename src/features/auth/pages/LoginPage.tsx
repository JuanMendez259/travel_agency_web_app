import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Instagram, Leaf, Mail, Phone, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { login, register as registerAccount } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthContext";
import {
  getRememberedEmail,
  homePathForRole,
  setRememberedEmail,
} from "@/features/auth/session";
import {
  loginSchema,
  registerSchema,
  type LoginValues,
  type RegisterValues,
} from "@/features/auth/schemas";
import { errorMessage } from "@/shared/api/client";
import { BrandLockup, LogoMark } from "@/shared/components/brand/LogoMark";
import { Button } from "@/shared/components/ui/Button";
import { TextField } from "@/shared/components/ui/TextField";
import { useToast } from "@/shared/components/ui/Toast";
import { cn } from "@/shared/lib/cn";

type Mode = "login" | "register";

const DEMO_ACCOUNTS = {
  admin: { email: "admin@travelagency.com", password: "Admin123!" },
  client: { email: "cliente@travelagency.com", password: "Cliente123!" },
};

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<"admin" | "client" | null>(null);

  const returnTo = params.get("returnTo");

  const finish = (role: Parameters<typeof homePathForRole>[0]) => {
    const target = returnTo && returnTo.startsWith("/") ? returnTo : homePathForRole(role);
    navigate(target, { replace: true });
  };

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: getRememberedEmail(), password: "", remember: true },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      phone: "",
      emergencyContact: "",
      email: "",
      password: "",
      remember: true,
    },
  });

  const onLogin = async (values: LoginValues) => {
    setServerError(null);
    try {
      const auth = await login({ email: values.email.trim(), password: values.password });
      setRememberedEmail(values.remember ? auth.email : null);
      signIn(auth);
      showToast(`Bienvenido de nuevo, ${auth.name.split(" ")[0]}.`, "success");
      finish(auth.role);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  const onRegister = async (values: RegisterValues) => {
    setServerError(null);
    try {
      const auth = await registerAccount({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone?.trim() || null,
        emergencyContact: values.emergencyContact?.trim() || null,
      });
      setRememberedEmail(values.remember ? auth.email : null);
      signIn(auth);
      showToast("Tu cuenta está lista. ¡Buen viaje!", "success");
      finish(auth.role);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  const quickLogin = async (kind: "admin" | "client") => {
    setServerError(null);
    setDemoLoading(kind);
    try {
      const auth = await login(DEMO_ACCOUNTS[kind]);
      signIn(auth);
      finish(auth.role);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setDemoLoading(null);
    }
  };

  const loginErrors = loginForm.formState.errors;
  const registerErrors = registerForm.formState.errors;

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary-container p-10 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(108,248,187,.28), transparent 42%), radial-gradient(circle at 85% 70%, rgba(150,213,163,.22), transparent 45%), radial-gradient(circle at 55% 110%, rgba(0,0,0,.35), transparent 55%)",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-1 flex-col">
          <BrandLockup invert />
          <div className="mt-auto max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-label-md text-mint">
              <Sparkles className="size-3.5" />
              Escapadas locales, recuerdos para siempre
            </p>
            <h1 className="mt-5 text-[44px] leading-[1.08] font-extrabold tracking-[-0.03em]">
              La próxima parada
              <br />
              está más cerca
              <br />
              de lo que crees.
            </h1>
            <p className="mt-4 max-w-sm text-body-lg text-mint/80">
              Ríos, cascadas, pueblos mágicos y aventuras curadas por guías locales. Reserva
              tu asiento y vive el viaje completo desde tu teléfono.
            </p>
            <div className="mt-8 grid gap-3 text-label-md text-white/90">
              <span className="inline-flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-secondary-container" />
                Salidas garantizadas y seguro de viaje incluido
              </span>
              <span className="inline-flex items-center gap-2.5">
                <Leaf className="size-4 text-secondary-container" />
                Turismo de naturaleza con operación local
              </span>
              <span className="inline-flex items-center gap-2.5">
                <Sparkles className="size-4 text-secondary-container" />
                Pago flexible: aparta y liquida antes de la salida
              </span>
            </div>
          </div>
          <p className="relative z-10 mt-10 text-body-sm text-mint/50">
            Proxima Parada Tours · México
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-8 lg:justify-center lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <BrandLockup />
            <a
              href="https://www.instagram.com/proxima_parada_tours/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"
              aria-label="Instagram de Proxima Parada Tours"
            >
              <Instagram className="size-5" />
            </a>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-layer-1 sm:p-7">
            <div className="mb-5">
              <p className="text-label-sm uppercase tracking-[0.12em] text-secondary">
                {mode === "login" ? "Bienvenido a casa" : "Crea tu cuenta"}
              </p>
              <h2 className="mt-1 text-headline-lg text-on-surface">
                {mode === "login" ? "Inicia sesión" : "Empieza tu próxima aventura"}
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {mode === "login"
                  ? "Consulta tus reservas, paga tu saldo y muestra tu QR en el abordaje."
                  : "Regístrate para reservar asientos, guardar favoritos y recibir avisos."}
              </p>
            </div>

            {serverError ? (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-body-md text-on-error-container"
              >
                {serverError}
              </div>
            ) : null}

            {mode === "login" ? (
              <form className="space-y-4" onSubmit={loginForm.handleSubmit(onLogin)} noValidate>
                <TextField
                  label="Correo electrónico"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  error={loginErrors.email?.message}
                  trailing={<Mail className="size-4 text-outline" aria-hidden="true" />}
                  {...loginForm.register("email")}
                />
                <TextField
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  error={loginErrors.password?.message}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="rounded p-2 text-outline hover:text-primary-container"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                  {...loginForm.register("password")}
                />

                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-body-md text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => {
                        setRemember(event.target.checked);
                        loginForm.setValue("remember", event.target.checked);
                      }}
                      className="size-4 rounded border-input-border accent-primary-container"
                    />
                    Recordar mi cuenta
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      showToast("La recuperación de contraseña estará disponible pronto.", "info")
                    }
                    className="text-label-md text-secondary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={loginForm.formState.isSubmitting}
                >
                  Entrar
                </Button>

                <p className="text-center text-body-md text-on-surface-variant">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setServerError(null);
                    }}
                    className="font-semibold text-primary-container hover:underline"
                  >
                    Crea una
                  </button>
                </p>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={registerForm.handleSubmit(onRegister)} noValidate>
                <TextField
                  label="Nombre completo"
                  autoComplete="name"
                  placeholder="Ana Martínez"
                  error={registerErrors.name?.message}
                  trailing={<UserRound className="size-4 text-outline" aria-hidden="true" />}
                  {...registerForm.register("name")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Celular (opcional)"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="444 123 4567"
                    error={registerErrors.phone?.message}
                    trailing={<Phone className="size-4 text-outline" aria-hidden="true" />}
                    {...registerForm.register("phone")}
                  />
                  <TextField
                    label="Contacto de emergencia"
                    placeholder="Nombre y teléfono"
                    error={registerErrors.emergencyContact?.message}
                    {...registerForm.register("emergencyContact")}
                  />
                </div>
                <TextField
                  label="Correo electrónico"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  error={registerErrors.email?.message}
                  trailing={<Mail className="size-4 text-outline" aria-hidden="true" />}
                  {...registerForm.register("email")}
                />
                <TextField
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  error={registerErrors.password?.message}
                  hint="Usa al menos 6 caracteres."
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="rounded p-2 text-outline hover:text-primary-container"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                  {...registerForm.register("password")}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={registerForm.formState.isSubmitting}
                >
                  Crear mi cuenta
                </Button>
                <p className="text-center text-body-md text-on-surface-variant">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setServerError(null);
                    }}
                    className="font-semibold text-primary-container hover:underline"
                  >
                    Inicia sesión
                  </button>
                </p>
              </form>
            )}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-surface-container-high" />
              <span className="text-label-sm uppercase tracking-wide text-outline">
                O continúa con
              </span>
              <span className="h-px flex-1 bg-surface-container-high" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["Google", "Apple", "Facebook"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() =>
                    showToast(
                      `El acceso con ${provider} se habilitará al configurar Supabase OAuth.`,
                      "info",
                    )
                  }
                  className="h-11 rounded-[12px] border-[1.5px] border-input-border bg-white text-label-md text-on-surface transition hover:border-emerald disabled:opacity-60"
                >
                  {provider}
                </button>
              ))}
            </div>

            {import.meta.env.DEV ? (
              <div className="mt-6 rounded-xl border border-dashed border-secondary/40 bg-surface-container-low p-3">
                <p className="text-label-sm uppercase tracking-wide text-secondary">
                  Acceso rápido de pruebas
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={demoLoading === "admin"}
                    onClick={() => void quickLogin("admin")}
                  >
                    Admin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={demoLoading === "client"}
                    onClick={() => void quickLogin("client")}
                  >
                    Cliente demo
                  </Button>
                </div>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Solo en desarrollo. Las cuentas demo viven en el seed de la API.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1 text-body-sm text-on-surface-variant">
            <Link to="/about" className="inline-flex items-center gap-1.5 hover:text-primary-container">
              <LogoMark className="size-4 rounded" />
              Nosotros
            </Link>
            <a
              href="https://www.instagram.com/proxima_parada_tours/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary-container"
            >
              <Instagram className="size-4" />
              @proxima_parada_tours
            </a>
            <span className={cn("inline-flex items-center gap-1", "text-secondary")}>
              <Leaf className="size-3.5" />
              Turismo responsable
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
