import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiHttpError,
  getStoredJwt,
  setCookieAuthMode,
  setStoredJwt,
} from '../api/client';
import { api } from '../api/endpoints';
import { AuthConfigResponse, AuthUser, HealthResponse } from '../api/types';

export type AuthModalMode = 'sign-in' | 'sign-up';

interface AuthContextValue {
  health: HealthResponse | undefined;
  healthLoading: boolean;
  backendOnline: boolean;
  authConfig: AuthConfigResponse | undefined;
  user: AuthUser | null;
  authEnabled: boolean;
  authRequired: boolean;
  isAuthenticated: boolean;
  checkingSession: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshHealthAndSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function looksLikeJwt(val: unknown): val is string {
  return typeof val === 'string' && val.split('.').length === 3 && val.length > 20;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('sign-in');

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    retry: 0,
    staleTime: 25_000,
    refetchOnWindowFocus: false,
  });

  const authConfigQuery = useQuery({
    queryKey: ['auth-config'],
    queryFn: api.getAuthConfig,
    retry: 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const backendOnline = Boolean(healthQuery.data?.ok);
  const authEnabled = Boolean(
    authConfigQuery.data?.enabled ?? healthQuery.data?.auth?.enabled ?? false,
  );
  const authRequired =
    backendOnline &&
    Boolean(authConfigQuery.data?.required ?? healthQuery.data?.auth?.required ?? false);

  const meQuery = useQuery({
    queryKey: ['me', Boolean(getStoredJwt())],
    queryFn: async () => {
      try {
        return await api.getMe();
      } catch (err) {
        if (err instanceof ApiHttpError && err.status === 401) {
          setStoredJwt(null);
          return { authenticated: false, auth_enabled: authEnabled, user: null };
        }
        throw err;
      }
    },
    enabled: backendOnline && (authEnabled || Boolean(getStoredJwt())),
    retry: 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const user = meQuery.data?.authenticated ? meQuery.data.user : null;
  const isAuthenticated = Boolean(user);

  const tryFinalizeAuthToken = useCallback(async (authRes: Record<string, unknown>) => {
    if (getStoredJwt()) {
      return;
    }
    if (looksLikeJwt(authRes?.token)) {
      setStoredJwt(authRes.token);
      return;
    }
    if (looksLikeJwt(authRes?.jwt)) {
      setStoredJwt(authRes.jwt);
      return;
    }
    // Try Better Auth token endpoint with cookie credentials if proxy set a cookie
    try {
      setCookieAuthMode(true);
      const tokenRes = await api.getAuthToken();
      if (looksLikeJwt(tokenRes?.token)) {
        setStoredJwt(tokenRes.token);
      } else if (looksLikeJwt(tokenRes?.jwt)) {
        setStoredJwt(tokenRes.jwt);
      }
    } catch {
      // Cookie session remains active if server supports CORS credentials
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.signInEmail(email.trim(), password);
      await tryFinalizeAuthToken(res);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.refetchQueries({ queryKey: ['me'] });
    },
    [queryClient, tryFinalizeAuthToken],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.signUpEmail(name.trim(), email.trim(), password);
      await tryFinalizeAuthToken(res);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.refetchQueries({ queryKey: ['me'] });
    },
    [queryClient, tryFinalizeAuthToken],
  );

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch {
      // Clear local credentials regardless of remote response
    }
    setStoredJwt(null);
    setCookieAuthMode(false);
    queryClient.setQueryData(['me', false], {
      authenticated: false,
      auth_enabled: authEnabled,
      user: null,
    });
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await queryClient.invalidateQueries({ queryKey: ['projects'] });
  }, [authEnabled, queryClient]);

  const refreshHealthAndSession = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['health'] }),
      queryClient.invalidateQueries({ queryKey: ['auth-config'] }),
      queryClient.invalidateQueries({ queryKey: ['me'] }),
    ]);
  }, [queryClient]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'coupled-api-base-url') {
        void refreshHealthAndSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshHealthAndSession]);

  return (
    <AuthContext.Provider
      value={{
        health: healthQuery.data,
        healthLoading: healthQuery.isLoading,
        backendOnline,
        authConfig: authConfigQuery.data,
        user,
        authEnabled,
        authRequired,
        isAuthenticated,
        checkingSession: meQuery.isLoading,
        authModalOpen,
        authModalMode,
        openAuthModal: (mode = 'sign-in') => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        },
        closeAuthModal: () => setAuthModalOpen(false),
        signIn,
        signUp,
        signOut,
        refreshHealthAndSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
