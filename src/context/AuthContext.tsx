import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { get, post, onUnauthorized, setApiSession } from '../api/client';

interface User { id: string; email: string }
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, registrationCode?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const generation = useRef(0);
  const mounted = useRef(false);
  const applyUser = useCallback((next: User | null) => {
    setApiSession(next?.id ?? null);
    setUser(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const attempt = ++generation.current;
    const controller = new AbortController();
    const unsubscribe = onUnauthorized(() => {
      generation.current++;
      applyUser(null);
      setIsLoading(false);
    });
    void get<User>('auth/me', { signal: controller.signal }).then((restored) => {
      if (mounted.current && attempt === generation.current) applyUser(restored);
    }).catch(() => {
      if (mounted.current && attempt === generation.current) applyUser(null);
    }).finally(() => {
      if (mounted.current && attempt === generation.current) setIsLoading(false);
    });
    return () => {
      mounted.current = false;
      controller.abort();
      unsubscribe();
    };
  }, [applyUser]);

  const authenticate = useCallback(async (route: 'login' | 'register', email: string, password: string, registrationCode?: string): Promise<{ error?: string }> => {
    const attempt = ++generation.current;
    try {
      const authenticated = await post<User>(`auth/${route}`, {
        email: email.trim(), password,
        ...(route === 'register' && registrationCode !== undefined ? { registrationCode } : {}),
      });
      if (!mounted.current || attempt !== generation.current) return { error: 'La sesión cambió. Vuelve a intentarlo.' };
      // Ambas rutas del backend crean la cookie httpOnly y devuelven {id, email}.
      applyUser(authenticated);
      setIsLoading(false);
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' };
    }
  }, [applyUser]);

  const login = useCallback((email: string, password: string) => authenticate('login', email, password), [authenticate]);
  const register = useCallback((email: string, password: string, registrationCode?: string) => authenticate('register', email, password, registrationCode), [authenticate]);
  const logout = useCallback(async () => {
    const attempt = ++generation.current;
    await post('auth/logout', {});
    if (mounted.current && attempt === generation.current) {
      applyUser(null);
      setIsLoading(false);
    }
  }, [applyUser]);

  return <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
