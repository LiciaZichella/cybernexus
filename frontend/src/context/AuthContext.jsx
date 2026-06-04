import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, authAPI, setMemoryToken, setRefreshCallback } from '../services/api';

const AuthContext = createContext(null);

// ─── Refresh token storage ────────────────────────────────────────────────────

const RT_KEY = 'refreshToken';

const leggiRefreshToken = () => {
  const cookieMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith('refreshToken='));
  return cookieMatch ? cookieMatch.split('=')[1] : localStorage.getItem(RT_KEY);
};

const salvaRefreshToken = (token) => {
  // Fallback localStorage — per httpOnly vero il server deve usare Set-Cookie
  localStorage.setItem(RT_KEY, token);
};

const cancellaRefreshToken = () => {
  localStorage.removeItem(RT_KEY);
  document.cookie = 'refreshToken=; Max-Age=0; path=/';
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading]         = useState(true);

  // Sincronizza stato React e variabile di modulo in api.js
  const impostaToken = (token) => {
    setMemoryToken(token);
    setAccessToken(token);
  };

  // Rinnova l'access token usando il refresh token salvato
  const refreshToken = useCallback(async () => {
    const rt = leggiRefreshToken();
    if (!rt) { setLoading(false); return false; }

    try {
      // authAPI.refresh usa axios diretto — bypassa l'interceptor 401 (evita loop)
      const { data } = await authAPI.refresh(rt);
      impostaToken(data.accessToken);
      salvaRefreshToken(data.refreshToken);
      // Il refresh endpoint non restituisce user: ripristina il profilo (incluso role)
      const { data: me } = await api.get('/users/me');
      setUser(me.user);
      return true;
    } catch {
      impostaToken(null);
      cancellaRefreshToken();
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Registra il callback di refresh in api.js per l'interceptor 401
  useEffect(() => {
    setRefreshCallback(refreshToken);
  }, [refreshToken]);

  // Al montaggio: ripristina la sessione se esiste un refresh token
  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  // Login: chiama l'API, aggiorna token e stato utente
  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    impostaToken(data.accessToken);
    salvaRefreshToken(data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  // Ricarica il profilo utente dal backend e aggiorna lo stato
  const aggiornaUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me');
      const updated = data.user ?? data;
      setUser(updated);
      return updated;
    } catch {
      return null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Logout: revoca il token lato server e pulisce lo stato locale
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Pulizia locale anche se il server non risponde
    } finally {
      impostaToken(null);
      cancellaRefreshToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshToken, aggiornaUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook per accedere al context nelle pagine e nei componenti
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
};

export default AuthContext;
