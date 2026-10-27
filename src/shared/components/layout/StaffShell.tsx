import {
  BarChart3,
  Bell,
  ClipboardList,
  LogOut,
  MapPinned,
  Menu,
  Receipt,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { BrandLockup } from "@/shared/components/brand/LogoMark";
import { cn } from "@/shared/lib/cn";

type NavItem = {
  to: string;
  label: string;
  icon: typeof MapPinned;
  adminOnly?: boolean;
};

const operation: NavItem[] = [
  { to: "/staff/trips", label: "Viajes", icon: MapPinned },
  { to: "/staff/bookings", label: "Reservas", icon: ClipboardList, adminOnly: true },
  { to: "/staff/stats", label: "Estadísticas", icon: BarChart3, adminOnly: true },
];

const management: NavItem[] = [
  { to: "/staff/coordinators", label: "Coordinadores", icon: Users, adminOnly: true },
  { to: "/staff/discounts", label: "Descuentos", icon: Tag, adminOnly: true },
  { to: "/staff/payouts", label: "Reembolsos", icon: Wallet, adminOnly: true },
  { to: "/staff/expenses", label: "Gastos", icon: Receipt, adminOnly: true },
];

export function StaffShell() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = session?.role === "Admin";

  const filter = (items: NavItem[]) => items.filter((item) => !item.adminOnly || isAdmin);
  const opItems = filter(operation);
  const manageItems = filter(management);

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-label-md transition",
      isActive
        ? "bg-white text-primary-container shadow-layer-1"
        : "text-mint/90 hover:bg-white/10 hover:text-white",
    );

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-primary-container lg:flex">
        <div className="px-5 py-5">
          <BrandLockup invert />
          <p className="mt-3 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-label-sm text-mint">
            Panel {isAdmin ? "administrador" : "coordinador"}
          </p>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Panel staff">
          <div>
            <p className="px-3 pb-1.5 text-label-sm uppercase tracking-[0.12em] text-mint/60">
              Operación
            </p>
            <ul className="space-y-1">
              {opItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={linkClass}>
                    <item.icon className="size-[18px]" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          {manageItems.length ? (
            <div>
              <p className="px-3 pb-1.5 text-label-sm uppercase tracking-[0.12em] text-mint/60">
                Gestión
              </p>
              <ul className="space-y-1">
                {manageItems.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={linkClass}>
                      <item.icon className="size-[18px]" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="px-3 pb-1.5 text-label-sm uppercase tracking-[0.12em] text-mint/60">
              Comunicación
            </p>
            <ul className="space-y-1">
              <li>
                <NavLink to="/staff/notifications" className={linkClass}>
                  <Bell className="size-[18px]" />
                  Avisos
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-label-lg text-white">{session?.name}</p>
          <p className="truncate text-body-sm text-mint/70">{session?.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-white/10 py-2 text-label-md text-white transition hover:bg-white/20"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-primary-container px-4 py-2.5 lg:hidden">
        <BrandLockup invert />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-white hover:bg-white/10"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Cerrar sesión"
            className="rounded-lg p-2 text-white hover:bg-white/10"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <nav className="border-b border-white/10 bg-primary-container px-3 py-3 lg:hidden" aria-label="Menú staff">
          <ul className="grid grid-cols-2 gap-1">
            {[...opItems, ...manageItems, { to: "/staff/notifications", label: "Avisos", icon: Bell }].map(
              (item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-label-md",
                        isActive ? "bg-white text-primary-container" : "text-white hover:bg-white/10",
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>
      ) : null}

      <main className="px-4 py-5 pb-24 lg:ml-64 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-container-high bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-layer-3 backdrop-blur lg:hidden"
        aria-label="Navegación staff"
      >
        <ul className="mx-auto flex max-w-md justify-around px-2 py-1.5">
          {[
            { to: "/staff/trips", label: "Viajes", icon: MapPinned },
            ...(isAdmin
              ? [{ to: "/staff/bookings", label: "Reservas", icon: ClipboardList }]
              : []),
            { to: "/staff/notifications", label: "Avisos", icon: Bell },
          ].map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-lg py-1 text-label-sm",
                    isActive ? "text-primary-container" : "text-outline",
                  )
                }
              >
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
