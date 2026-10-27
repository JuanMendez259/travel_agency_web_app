import {
  Bell,
  Compass,
  Heart,
  LogOut,
  MapPinned,
  Trees,
  UserRound,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { BrandLockup } from "@/shared/components/brand/LogoMark";
import { cn } from "@/shared/lib/cn";

function tabIsActive(to: string, pathname: string, routeActive: boolean) {
  if (routeActive) return true;
  if (to === "/explore") {
    return pathname.startsWith("/trips/") && !pathname.endsWith("/rate");
  }
  if (to === "/bookings") {
    return pathname.endsWith("/rate");
  }
  return false;
}

const tabs = [
  { to: "/explore", label: "Explorar", icon: Compass },
  { to: "/bookings", label: "Mis Viajes", icon: MapPinned },
  { to: "/profile", label: "Perfil", icon: UserRound },
  { to: "/about", label: "Nosotros", icon: Trees },
  { to: "/notifications", label: "Avisos", icon: Bell },
];

const desktopLinks = [
  { to: "/explore", label: "Explorar" },
  { to: "/bookings", label: "Mis Viajes" },
  { to: "/favorites", label: "Favoritos" },
  { to: "/about", label: "Nosotros" },
  { to: "/notifications", label: "Avisos" },
];

export function ClientShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const initials = (session?.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 hidden border-b border-surface-container-high/70 bg-surface/90 backdrop-blur-md md:block">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
          <NavLink to="/explore" aria-label="Inicio">
            <BrandLockup />
          </NavLink>
          <nav className="flex flex-1 items-center gap-1" aria-label="Navegación principal">
            {desktopLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3.5 py-2 text-label-md transition",
                    tabIsActive(link.to, pathname, isActive)
                      ? "bg-mint text-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <NavLink
              to="/favorites"
              aria-label="Favoritos"
              className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-primary-container"
            >
              <Heart className="size-5" />
            </NavLink>
            <NavLink
              to="/profile"
              className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 shadow-layer-1"
              aria-label="Mi perfil"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary-container text-label-md text-white">
                {initials}
              </span>
              <span className="max-w-28 truncate text-label-md text-on-surface">
                {session?.name}
              </span>
            </NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Cerrar sesión"
              className="rounded-full p-2 text-outline transition hover:bg-error-container hover:text-error"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(92px+env(safe-area-inset-bottom))] md:px-6 md:pt-8 md:pb-14">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-container-high bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-layer-3 backdrop-blur-md md:hidden"
        aria-label="Navegación"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5 pb-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg py-1 text-label-sm transition",
                      tabIsActive(tab.to, pathname, isActive) ? "text-primary-container" : "text-outline",
                    )
                  }
                >
                  {({ isActive }) => {
                    const active = tabIsActive(tab.to, pathname, isActive);
                    return (
                      <>
                        <span
                          className={cn(
                            "grid h-7 w-10 place-items-center rounded-full transition",
                            active && "bg-mint",
                          )}
                        >
                          <Icon className={cn("size-[19px]", active && "stroke-[2.4]")} />
                        </span>
                        {tab.label}
                      </>
                    );
                  }}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
