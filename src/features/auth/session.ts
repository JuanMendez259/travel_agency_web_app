import type { AuthResponse, UserRole } from "@/shared/api/types";

const SESSION_KEY = "ppt.session";
const REMEMBER_EMAIL_KEY = "ppt.rememberEmail";

export type Session = {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: UserRole;
};

export function sessionFromAuth(auth: AuthResponse): Session {
  return {
    token: auth.token,
    userId: auth.userId,
    name: auth.name,
    email: auth.email,
    role: auth.role,
  };
}

export function getSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}

export function setRememberedEmail(email: string | null): void {
  if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
  else localStorage.removeItem(REMEMBER_EMAIL_KEY);
}

export function homePathForRole(role: UserRole): string {
  if (role === "Client") return "/explore";
  return "/staff/trips";
}

export function isStaffRole(role: UserRole | undefined | null): boolean {
  return role === "Admin" || role === "Coordinador";
}

export function isAdminRole(role: UserRole | undefined | null): boolean {
  return role === "Admin";
}
