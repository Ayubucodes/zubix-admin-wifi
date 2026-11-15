import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, login as loginRequest, logoutRemote } from "../../lib/api";
import { clearSession, getSession } from "../../lib/session";
import type { AuthUser, PermissionCode } from "../../types/api";

interface AuthContextValue {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (code: PermissionCode) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const loadCurrentUser = useCallback(async () => {
    try {
      const me = await apiFetch<AuthUser>("/auth/me");
      setUser(me);
      setStatus("authenticated");
    } catch {
      clearSession();
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    if (getSession()) {
      void loadCurrentUser();
    } else {
      setStatus("anonymous");
    }
  }, [loadCurrentUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      await loginRequest(email, password);
      await loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const logout = useCallback(async () => {
    await logoutRemote();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = new Set(user?.permissions ?? []);
    const isSuperAdmin = user?.roles.includes("SUPER_ADMIN") ?? false;
    return {
      user,
      status,
      login,
      logout,
      hasPermission: (code) => isSuperAdmin || permissions.has(code),
    };
  }, [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
