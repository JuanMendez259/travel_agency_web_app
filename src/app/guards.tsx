import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { homePathForRole } from "@/features/auth/session";
import type { UserRole } from "@/shared/api/types";

export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <Outlet />;
}

export function RequireGuest() {
  const { session } = useAuth();
  if (session) return <Navigate to={homePathForRole(session.role)} replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!roles.includes(session.role)) {
    return <Navigate to={homePathForRole(session.role)} replace />;
  }
  return <Outlet />;
}
