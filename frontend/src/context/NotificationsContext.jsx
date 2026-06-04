import { createContext, useContext, useState, useCallback } from 'react';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifiche, setNotifiche] = useState([]);

  const aggiungiNotifica = useCallback((notifica) => {
    setNotifiche(prev => [
      { id: Date.now() + Math.random(), letta: false, timestamp: new Date(), ...notifica },
      ...prev,
    ].slice(0, 50));
  }, []);

  const segnaLetta = useCallback((id) => {
    setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letta: true } : n));
  }, []);

  const segnaLetteTutte = useCallback(() => {
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })));
  }, []);

  const nonLette = notifiche.filter(n => !n.letta).length;

  return (
    <NotificationsContext.Provider value={{ notifiche, aggiungiNotifica, segnaLetta, segnaLetteTutte, nonLette }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications deve essere usato dentro <NotificationsProvider>');
  return ctx;
}
