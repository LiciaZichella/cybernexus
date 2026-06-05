import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import NavDropdown from './NavDropdown';
import './Navbar.css';

// Voci di navigazione — Dashboard è protetta (solo utenti loggati)
const VOCI = [
  {
    path: '/', label: 'Home',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>,
    pubblica: true,
  },
  {
    path: '/leaderboard', label: 'Classifica',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>,
    pubblica: true,
  },
  {
    path: '/ctf', label: 'CTF Arena',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5a5 5 0 017 0 5 5 0 007 0v9a5 5 0 01-7 0 5 5 0 00-7 0V5z"/><line x1="5" y1="21" x2="5" y2="14"/>
    </svg>,
    pubblica: true,
  },
  {
    path: '/warroom', label: 'War Room',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a12 12 0 008.5 3A12 12 0 0112 21 12 12 0 013.5 6 12 12 0 0012 3"/>
    </svg>,
    pubblica: true,
  },
  {
    path: '/dashboard', label: 'Dashboard',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>,
    pubblica: false, // nascosta se non loggato
  },
];

/**
 * Navbar condivisa — usata da tutte le pagine dell'app.
 *
 * Props:
 *   centerContent — nodo React opzionale per contenuto centrale (es. War Room incident info)
 *   rightExtra    — nodo React opzionale aggiunto prima del toggle (es. avatar online)
 */
export default function Navbar({ centerContent, rightExtra }) {
  const { user } = useAuth();
  const { notifiche = [], segnaLetta, segnaLetteTutte, nonLette = 0 } = useNotifications() ?? {};
  const location  = useLocation();
  const bellRef   = useRef(null);

  // Legge il tema corrente dal documento per mostrare lo stato corretto sin dall'inizio
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark'
  );
  const [bellOpen, setBellOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Chiude il dropdown notifiche al click esterno
  useEffect(() => {
    if (!bellOpen) return;
    const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [bellOpen]);

  // Voce attiva: corrispondenza esatta per Home, startsWith per le altre
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const initials = (user?.username || 'US').slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="cn-navbar">
        {/* Logo */}
        <Link to="/" className="cn-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="cn-nlg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C6FEA"/>
                <stop offset="100%" stopColor="#5BC4D4"/>
              </linearGradient>
            </defs>
            <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"
              fill="rgba(124,111,234,0.15)" stroke="url(#cn-nlg)" strokeWidth="1.5"/>
          </svg>
          CyberNexus
        </Link>

        {/* Voci di navigazione */}
        <div className="cn-items">
          {VOCI
            .filter(v => v.pubblica || !!user)
            .map(v => (
              <Link
                key={v.path}
                to={v.path}
                className={`cn-item ${isActive(v.path) ? 'active' : ''}`}
              >
                {v.icon}
                {v.label}
              </Link>
            ))
          }
        </div>

        {/* Contenuto centrale opzionale (War Room: titolo incidente + timer) */}
        {centerContent && <div className="cn-center">{centerContent}</div>}

        {/* Lato destro */}
        <div className="cn-right">
          {/* Extra destro opzionale (War Room: avatar membri online) */}
          {rightExtra}

          {/* Toggle dark/light */}
          <div className="cn-toggle" onClick={toggleTheme}>
            <div className="cn-track">
              <div className={`cn-thumb${theme === 'light' ? ' light' : ''}`}/>
            </div>
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </div>

          {/* Campanella notifiche — solo se loggato */}
          {user && (
            <div ref={bellRef} className="cn-bell-wrap">
              <div className="cn-bell-btn" onClick={() => setBellOpen(o => !o)}>
                {nonLette > 0 && (
                  <div className="cn-bell-badge">{nonLette > 9 ? '9+' : nonLette}</div>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
              </div>
              {bellOpen && (
                <div className="cn-bell-drop">
                  <div className="cn-bell-hdr">
                    <div className="cn-bell-title">
                      Notifiche {nonLette > 0 && `(${nonLette})`}
                    </div>
                    {nonLette > 0 && (
                      <button className="cn-bell-mark" onClick={segnaLetteTutte}>
                        Segna tutte lette
                      </button>
                    )}
                  </div>
                  <div className="cn-bell-items">
                    {notifiche.length === 0 ? (
                      <div className="cn-bell-empty">Nessuna notifica</div>
                    ) : notifiche.slice(0, 8).map(n => (
                      <div
                        key={n.id}
                        className={`cn-bell-item${n.letta ? '' : ' unread'}`}
                        onClick={() => segnaLetta(n.id)}
                      >
                        <div className="cn-bell-ico">{n.icon || '🔔'}</div>
                        <div className="cn-bell-body">
                          <div className="cn-bell-text">{n.testo}</div>
                          {n.sub && <div className="cn-bell-sub">{n.sub}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin pill — visibile solo agli Admin */}
          {user?.role === 'Admin' && (
            <Link to="/admin" className="cn-admin-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              Admin
            </Link>
          )}

          {/* Avatar con dropdown (loggato) oppure link Accedi (ospite) */}
          {user ? (
            <NavDropdown user={user} initials={initials}/>
          ) : (
            <Link to="/login" className="cn-item cn-accedi">Accedi →</Link>
          )}
        </div>
      </nav>

      {/* Striscia cromatica sotto la navbar */}
      <div className="cn-grad-strip"/>
    </>
  );
}
