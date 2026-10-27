import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearSession,
  getSession,
  saveSession,
  sessionFromAuth,
  type Session,
} from "@/features/auth/session";
import type { AuthResponse } from "@/shared/api/types";

type AuthContextValue = {
  session: Session | null;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());

  useEffect(() => {
    const onUnauthorized = () => {
      setSession(null);
    };
    window.addEventListener("ppt:unauthorized", onUnauthorized);
    return () => window.removeEventListener("ppt:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: (auth) => {
        const next = sessionFromAuth(auth);
        saveSession(next);
        setSession(next);
      },
      signOut: () => {
        clearSession();
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
