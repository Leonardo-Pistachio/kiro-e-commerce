import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken, setUnauthorizedHandler, type AuthResult, type User } from './api';

const TOKEN_KEY = 'pc-store-token';

interface SessionValue {
  user: User | null;
  /** False until a stored token has been checked with the server. */
  ready: boolean;
  cartCount: number;
  signIn: (result: AuthResult) => void;
  signOut: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private mode); the session then lasts for this tab only.
  }
  setAuthToken(token);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const clearSession = useCallback(() => {
    storeToken(null);
    setUser(null);
    setCartCount(0);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setCartCount((await api.cart()).count);
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    const token = readStoredToken();
    if (!token) {
      setReady(true);
      return;
    }
    setAuthToken(token);
    api
      .me()
      .then((me) => {
        setUser(me);
        return refreshCart();
      })
      .catch(() => clearSession())
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, [clearSession, refreshCart]);

  const signIn = useCallback(
    (result: AuthResult) => {
      storeToken(result.token);
      setUser(result.user);
      void refreshCart();
    },
    [refreshCart],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The local session is cleared either way.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ user, ready, cartCount, signIn, signOut, refreshCart }), [user, ready, cartCount, signIn, signOut, refreshCart]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
