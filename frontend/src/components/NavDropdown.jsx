import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfiloModal from './ProfiloModal';

const ROLE_COLORS = {
  Admin:   { bg: 'rgba(240,112,96,.18)',  c: '#F07060', b: 'rgba(240,112,96,.4)'  },

  Analyst: { bg: 'rgba(91,196,212,.18)',  c: '#5BC4D4', b: 'rgba(91,196,212,.4)'  },
  Player:  { bg: 'rgba(124,111,234,.15)', c: '#7C6FEA', b: 'rgba(124,111,234,.4)' },
  Guest:   { bg: 'rgba(138,150,176,.12)', c: '#8a96b0', b: 'rgba(138,150,176,.4)' },
};

const DROP_CSS = `
@keyframes ndFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.nd-wrap{position:relative;flex-shrink:0}
.nd-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#7C6FEA,#E870B8);
  display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;
  cursor:pointer;border:2px solid rgba(124,111,234,.3);transition:transform .2s,box-shadow .2s;flex-shrink:0}
.nd-av:hover{transform:scale(1.08);box-shadow:0 4px 12px rgba(124,111,234,.35)}
.nd-drop{position:absolute;top:42px;right:0;z-index:950;
  background:var(--bg2,#1a2235);border:0.5px solid var(--border2,rgba(255,255,255,.13));
  border-radius:13px;padding:10px;min-width:200px;
  box-shadow:0 20px 60px rgba(0,0,0,.45);
  animation:ndFadeIn .18s ease both}
.nd-header{display:flex;gap:10px;align-items:center;margin-bottom:10px;padding-bottom:10px;
  border-bottom:0.5px solid var(--border,rgba(255,255,255,.06))}
.nd-hav{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#7C6FEA,#E870B8);
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
.nd-info{min-width:0;flex:1}
.nd-name{font-weight:600;font-size:13px;color:var(--text1,#f0f4ff);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:1px}
.nd-email{font-size:10px;color:var(--text3,#4a5568);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'JetBrains Mono',monospace}
.nd-role{margin-bottom:10px}
.nd-role-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;
  font-family:'JetBrains Mono',monospace;display:inline-block}
.nd-btn{width:100%;padding:8px 10px;border-radius:8px;border:none;background:transparent;
  font-size:13px;text-align:left;cursor:pointer;transition:background .15s,color .15s;
  font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px}
.nd-btn:hover{background:var(--bg3,#1e2a3a)}
.nd-btn-text{color:var(--text2,#8a96b0)}
.nd-btn-text:hover{color:var(--text1,#f0f4ff)}
.nd-btn-logout{color:#F07060}
.nd-btn-logout:hover{background:rgba(240,112,96,.1)!important;color:#F07060}
`;

export default function NavDropdown({ initials, user: userProp }) {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const user = userProp ?? authUser;
  const ini  = initials ?? (user?.username || 'US').slice(0, 2).toUpperCase();

  // Stato per il modal profilo
  const [profiloAperto, setProfiloAperto] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.Player;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <>
      <style>{DROP_CSS}</style>
      {/* Modal profilo — si apre al click "Il mio profilo" */}
      <ProfiloModal
        open={profiloAperto}
        onClose={() => setProfiloAperto(false)}
        userId={user?._id || user?.id}
      />
      <div ref={ref} className="nd-wrap">
        <div className="nd-av" onClick={() => setOpen(o => !o)} title={user?.username}>
          {ini}
        </div>
        {open && (
          <div className="nd-drop">
            <div className="nd-header">
              <div className="nd-hav">{ini}</div>
              <div className="nd-info">
                <div className="nd-name">{user?.username || '–'}</div>
                <div className="nd-email">{user?.email || ''}</div>
              </div>
            </div>
            <div className="nd-role">
              <span className="nd-role-badge" style={{ background: roleStyle.bg, color: roleStyle.c, border: `0.5px solid ${roleStyle.b}` }}>
                {user?.role || 'Player'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button className="nd-btn nd-btn-text" onClick={() => { setOpen(false); setProfiloAperto(true); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Il mio profilo
              </button>
              <button className="nd-btn nd-btn-logout" onClick={handleLogout}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
