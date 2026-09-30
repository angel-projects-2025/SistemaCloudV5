import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

interface AuthUser {
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'cloudops-session';
const VALID_EMAIL = 'admin@gmail.com';
const VALID_PASSWORD = 'admin321';

function readSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed && typeof parsed.email === 'string' && parsed.email) {
      return { email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSession);

  const login = useCallback((email: string, password: string) => {
    const ok = email.trim().toLowerCase() === VALID_EMAIL && password === VALID_PASSWORD;
    if (ok) {
      const session: AuthUser = { email: VALID_EMAIL };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser(session);
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
