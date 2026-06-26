import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, authAPI, setMemoryToken, setRefreshCallback } from '../services/api';

const AuthContext = createContext(null);



const RT_KEY = 'refreshToken';

const leggiRefreshToken = () => {
  const cookieMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith('refreshToken='));
  return cookieMatch ? cookieMatch.split('=')[1] : localStorage.getItem(RT_KEY);
};

const salvaRefreshToken = (token) => {
  
  localStorage.setItem(RT_KEY, token);
};

const cancellaRefreshToken = () => {
  localStorage.removeItem(RT_KEY);
  document.cookie = 'refreshToken=; Max-Age=0; path=/';
};



export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading]         = useState(true);

  
  const impostaToken = (token) => { //aggiorna il token in api.js e lo stato React
    setMemoryToken(token);
    setAccessToken(token);
  }; //sempre sincronizzati 

  
  const refreshToken = useCallback(async () => {
    const rt = leggiRefreshToken();
    if (!rt) { setLoading(false); return false; }

    try {
      
      const { data } = await authAPI.refresh(rt);
      impostaToken(data.accessToken);
      salvaRefreshToken(data.refreshToken);
      
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
  }, []); 

  
  useEffect(() => {
    setRefreshCallback(refreshToken);
  }, [refreshToken]);

  
  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  
  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    impostaToken(data.accessToken);
    salvaRefreshToken(data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  
  const loginWithOAuth = useCallback(async (at, rt) => {
    try {
      impostaToken(at);
      salvaRefreshToken(rt);
      
      const { data: me } = await api.get('/users/me');
      setUser(me.user ?? me);
      return true;
    } catch {
      impostaToken(null);
      cancellaRefreshToken();
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []); 

  
  const aggiornaUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me');
      const updated = data.user ?? data;
      setUser(updated);
      return updated;
    } catch {
      return null;
    }
  }, []); 

  
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      
    } finally {
      impostaToken(null);
      cancellaRefreshToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout, refreshToken, aggiornaUser, loginWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
};

export default AuthContext;
