import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ProfiloModal from '../components/ProfiloModal';
import { leaderboardAPI } from '../services/api';
import './Leaderboard.css';



const getInitials = (username = '') =>
  username.slice(0, 2).toUpperCase();

// Gradiente deterministico in base alla posizione in classifica
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#F6C652,#E870B8)',
  'linear-gradient(135deg,#b0b8cc,#7C6FEA)',
  'linear-gradient(135deg,#c87c3a,#F07060)',
  'linear-gradient(135deg,#7C6FEA,#5BC4D4)',
  'linear-gradient(135deg,#5CCE8A,#5BC4D4)',
  'linear-gradient(135deg,#E870B8,#7C6FEA)',
  'linear-gradient(135deg,#F07060,#F6C652)',
  'linear-gradient(135deg,#5BC4D4,#5CCE8A)',
];
const getAvatarGradient = (rank) =>
  AVATAR_GRADIENTS[(rank - 1) % AVATAR_GRADIENTS.length];

// Badge/colore in base al ruolo
const getRoleStyle = (role) => {
  switch ((role || '').toLowerCase()) {
    case 'admin': return { bg: 'rgba(240,112,96,.15)', color: '#F07060', label: 'Admin' };
    case 'pro':   return { bg: 'rgba(246,198,82,.15)', color: '#F6C652', label: 'PRO'   };
    default:      return { bg: 'rgba(124,111,234,.12)', color: '#7C6FEA', label: 'Player'};
  }
};


const displayRank = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};


const radarPoint = (values, idx, cx, cy, r) => {
  const a = (Math.PI / 3) * idx - Math.PI / 2;
  return `${cx + r * values[idx] * Math.cos(a)},${cy + r * values[idx] * Math.sin(a)}`;
};



export default function Leaderboard() {
  const { user, loading: authLoading } = useAuth();

  
  const [classifica, setClassifica]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [errore, setErrore]             = useState(null);
  const [pagina, setPagina]             = useState(1);
  const [totalePagine, setTotalePagine] = useState(1);
  const [totale, setTotale]             = useState(0);

  
  const [profiloAperto, setProfiloAperto] = useState(null);

  
  const [filterAttivo, setFilterAttivo] = useState('global');
  const [ricerca, setRicerca]           = useState('');
  const [compareIdx, setCompareIdx]     = useState(0);


  // ── Caricamento classifica ──────────────────────────────────────────────────

  const caricaClassifica = useCallback(async (pg, filter = 'global') => {
    try {
      if (pg === 1) setLoading(true);
      setErrore(null);
      const params = { page: pg, limit: 20 };
      if (filter !== 'global') params.filter = filter;
      const { data } = await leaderboardAPI.get(params);
      setClassifica((prev) =>
        pg === 1 ? data.classifica : [...prev, ...data.classifica]
      );
      setTotalePagine(data.pages ?? 1);
      setTotale(data.total ?? 0);
    } catch (err) {
      setErrore(err.response?.data?.message ?? 'Impossibile caricare la classifica.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    caricaClassifica(pagina, filterAttivo);
  }, [pagina, caricaClassifica, authLoading, filterAttivo]);

  
  useEffect(() => {
    if (authLoading) return;
    const interval = setInterval(() => caricaClassifica(1, filterAttivo), 60000);
    return () => clearInterval(interval);
  }, [authLoading, caricaClassifica, filterAttivo]);

  
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setPagina(1);
        caricaClassifica(1, filterAttivo);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [caricaClassifica, filterAttivo]);

  

  
  const handleOpenProfile = (item) => setProfiloAperto(item);

  
  const handleCloseProfile = () => setProfiloAperto(null);

  

  

  const classificaFiltrata = classifica.filter((c) =>
    c.username?.toLowerCase().includes(ricerca.toLowerCase())
  );

  const top3     = classifica.slice(0, 3);
  const maxPunti = classifica[0]?.points || 1;

  const rankProfilo = profiloAperto
    ? classifica.findIndex(
        (c) => (c.id ?? c._id) === (profiloAperto.id ?? profiloAperto._id)
      ) + 1
    : 0;

  const isMe = (item) =>
    user && (item.id ?? item._id) === (user.id ?? user._id);

  
  const comparePool     = classifica.slice(1);
  const compareCorrente = comparePool[compareIdx] ?? comparePool[0];


  
  const calcRadar = (giocatore) => {
    if (!giocatore) return [0, 0, 0, 0, 0, 0];
    const maxPts     = classifica[0]?.points || 1;
    const maxSolved  = Math.max(...classifica.map(u => u.solvedCount ?? 0), 1);
    const maxStreak  = Math.max(...classifica.map(u => u.streak ?? 0), 1);
    const rankGio    = classifica.findIndex(u => (u.id ?? u._id) === (giocatore.id ?? giocatore._id)) + 1;
    const rankPct    = classifica.length > 0 ? (classifica.length - (rankGio || classifica.length)) / classifica.length : 0;
    const pts        = Math.min((giocatore.points       ?? 0) / maxPts, 1);
    const solved     = Math.min((giocatore.solvedCount  ?? 0) / maxSolved, 1);
    const streak     = Math.min((giocatore.streak       ?? 0) / Math.max(maxStreak, 1), 1);
    const efficiency = giocatore.solvedCount > 0 ? Math.min((giocatore.points ?? 0) / (giocatore.solvedCount * 300), 1) : 0;
    return [pts, solved, streak, rankPct, efficiency, giocatore.streak > 0 ? 0.8 : 0.2];
  };

  const RADAR_P1 = calcRadar(top3[0]);
  const RADAR_P2 = calcRadar(compareCorrente);

  

  return (
    <>
      
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      
      <ProfiloModal
        open={!!profiloAperto}
        onClose={handleCloseProfile}
        userId={profiloAperto?.id ?? profiloAperto?._id}
        rank={rankProfilo}
      />

      <Navbar />

      
      <main className="page">

        
        <header className="lb-page-header ai d1">
          <div>
            <div className="lbph-eyebrow">🏆 Stagione 1 — Global Ranking</div>
            <h1 className="lbph-title">
              <span className="lbph-title-gold">Leaderboard</span>
            </h1>
            <p className="lbph-sub">
              {totale > 0
                ? `${totale} giocatori in competizione`
                : 'Classifica globale CyberNexus'}
            </p>
          </div>
          <div className="lbph-right">
            <div className="lb-season-badge">
              <div>
                <div className="lbs-label">Stagione</div>
                <div className="lbs-val">S1 · 2025</div>
              </div>
            </div>
            <div className="lb-filter">
              {[
                { id: 'global', label: 'Globale' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={`lbf-btn ${filterAttivo === id ? 'active' : ''}`}
                  onClick={() => { setFilterAttivo(id); setPagina(1); }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        
        {loading && (
          <div className="lb-loading">
            <div className="lb-spinner" />
            <span>Caricamento classifica…</span>
          </div>
        )}

        
        {errore && !loading && (
          <div className="lb-error">{errore}</div>
        )}

        
        {!loading && !errore && classifica.length > 0 && (
          <>
            
            <div className="lb-main ai d2">

              
              <div className="podium-section">
                <div className="ps-label">
                  Podio
                  <span className="ps-live">
                    <span className="ps-live-dot" /> Live
                  </span>
                </div>
                <div className="podium-stage">

                  
                  {top3[1] && (
                    <div
                      className="podium-player place-2"
                      onClick={() => handleOpenProfile(top3[1])}
                    >
                      <div
                        className="pp-avatar"
                        style={{ background: getAvatarGradient(2) }}
                      >
                        {getInitials(top3[1].username)}
                      </div>
                      <div className="pp-name">{top3[1].username}</div>
                      <div className="pp-pts">{top3[1].points} pt</div>
                      <div className="pp-block">2</div>
                    </div>
                  )}

                  
                  {top3[0] && (
                    <div
                      className="podium-player place-1"
                      onClick={() => handleOpenProfile(top3[0])}
                    >
                      <div className="pp-crown">👑</div>
                      <div
                        className="pp-avatar"
                        style={{ background: getAvatarGradient(1) }}
                      >
                        {getInitials(top3[0].username)}
                      </div>
                      <div className="pp-name">{top3[0].username}</div>
                      <div className="pp-pts">{top3[0].points} pt</div>
                      <div className="pp-block">1</div>
                    </div>
                  )}

                  
                  {top3[2] && (
                    <div
                      className="podium-player place-3"
                      onClick={() => handleOpenProfile(top3[2])}
                    >
                      <div
                        className="pp-avatar"
                        style={{ background: getAvatarGradient(3) }}
                      >
                        {getInitials(top3[2].username)}
                      </div>
                      <div className="pp-name">{top3[2].username}</div>
                      <div className="pp-pts">{top3[2].points} pt</div>
                      <div className="pp-block">3</div>
                    </div>
                  )}
                </div>
              </div>

              
              <div className="compare-panel">
                <div className="lb-stats-mini">
                  <div className="lbsm-card">
                    <div className="lbsm-lbl">Giocatori</div>
                    <div className="lbsm-val" style={{ color: 'var(--violet)' }}>
                      {totale}
                    </div>
                    <div className="lbsm-sub">registrati</div>
                  </div>
                  <div className="lbsm-card">
                    <div className="lbsm-lbl">Flag totali</div>
                    <div className="lbsm-val" style={{ color: 'var(--mint)' }}>
                      {classifica.reduce((s, c) => s + (c.solvedCount ?? 0), 0)}
                    </div>
                    <div className="lbsm-sub">nella stagione</div>
                  </div>
                  <div className="lbsm-card">
                    <div className="lbsm-lbl">Punteggio max</div>
                    <div className="lbsm-val" style={{ color: 'var(--gold)' }}>
                      {classifica[0]?.points ?? 0}
                    </div>
                    <div className="lbsm-sub">punti del leader</div>
                  </div>
                  <div className="lbsm-card">
                    <div className="lbsm-lbl">Solve leader</div>
                    <div className="lbsm-val" style={{ color: 'var(--cyan)' }}>
                      {classifica[0]?.solvedCount ?? 0}
                    </div>
                    <div className="lbsm-sub">challenge risolte</div>
                  </div>
                </div>

                
                {top3[0] && compareCorrente && (
                  <div className="compare-card">
                    <div className="cc-title">Confronto</div>
                    <div className="cc-vs">
                      <div className="cc-player">
                        <div
                          className="cc-av"
                          style={{ background: getAvatarGradient(1) }}
                        >
                          {getInitials(top3[0].username)}
                        </div>
                        <span>{top3[0].username}</span>
                      </div>
                      <span className="cc-sep">VS</span>
                      <div className="cc-player">
                        <div
                          className="cc-av"
                          style={{ background: getAvatarGradient(compareIdx + 2) }}
                        >
                          {getInitials(compareCorrente.username)}
                        </div>
                        <span>{compareCorrente.username}</span>
                      </div>
                      <button
                        className="cc-change"
                        onClick={() =>
                          setCompareIdx((i) => (i + 1) % comparePool.length)
                        }
                      >
                        cambia →
                      </button>
                    </div>

                    
                    <div className="radar-wrap">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        
                        {[0.25, 0.5, 0.75, 1].map((r) => (
                          <polygon
                            key={r}
                            points={[0,1,2,3,4,5].map((i) => {
                              const a = (Math.PI / 3) * i - Math.PI / 2;
                              return `${70 + 60 * r * Math.cos(a)},${70 + 60 * r * Math.sin(a)}`;
                            }).join(' ')}
                            fill="none"
                            stroke="rgba(255,255,255,0.07)"
                            strokeWidth="0.5"
                          />
                        ))}
                        
                        {[0,1,2,3,4,5].map((i) => {
                          const a = (Math.PI / 3) * i - Math.PI / 2;
                          return (
                            <line
                              key={i}
                              x1="70" y1="70"
                              x2={70 + 60 * Math.cos(a)}
                              y2={70 + 60 * Math.sin(a)}
                              stroke="rgba(255,255,255,0.07)"
                              strokeWidth="0.5"
                            />
                          );
                        })}
                        
                        <polygon
                          points={RADAR_P1.map((v, i) => radarPoint(RADAR_P1, i, 70, 70, 60)).join(' ')}
                          fill="rgba(124,111,234,.25)"
                          stroke="#7C6FEA"
                          strokeWidth="1.5"
                        />
                        
                        <polygon
                          points={RADAR_P2.map((v, i) => radarPoint(RADAR_P2, i, 70, 70, 60)).join(' ')}
                          fill="rgba(91,196,212,.2)"
                          stroke="#5BC4D4"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>

                    <div className="radar-legend">
                      <div className="rl-item">
                        <div className="rl-line" style={{ background: '#7C6FEA' }} />
                        {top3[0].username}
                      </div>
                      <div className="rl-item">
                        <div className="rl-line" style={{ background: '#5BC4D4' }} />
                        {compareCorrente.username}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            
            <div className="ranked-section ai d3">
              <div className="rs-header">
                <div className="rs-title">Classifica completa</div>
                <div className="rs-search">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="var(--text3)" strokeWidth="1.2" />
                    <line x1="9" y1="9" x2="12" y2="12" stroke="var(--text3)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Cerca giocatore…"
                    value={ricerca}
                    onChange={(e) => setRicerca(e.target.value)}
                  />
                </div>
              </div>

              
              {classificaFiltrata.slice(0, 3).map((item, idx) => {
                const rank      = idx + 1;
                const pct       = Math.round((item.points / maxPunti) * 100);
                const roleStyle = getRoleStyle(item.role);
                const ptsColor  = rank === 1 ? 'var(--gold)' : rank === 2 ? 'var(--silver)' : 'var(--bronze)';
                return (
                  <div
                    key={item.id ?? item._id}
                    className={`lb-row top-${rank} ${isMe(item) ? 'me' : ''}`}
                    onClick={() => handleOpenProfile(item)}
                  >
                    <div className="lb-r-rank">{displayRank(rank)}</div>
                    <div
                      className="lb-r-av"
                      style={{ background: getAvatarGradient(rank) }}
                    >
                      {getInitials(item.username)}
                    </div>
                    <div className="lb-r-info">
                      <div className="lb-r-name">
                        {item.username}
                        {isMe(item) && <span className="lb-r-you">tu</span>}
                      </div>
                      <div className="lb-r-cats">
                        <span
                          className="lb-r-cat"
                          style={{ background: roleStyle.bg, color: roleStyle.color }}
                        >
                          {roleStyle.label}
                        </span>
                      </div>
                    </div>
                    <div className="lb-r-bar">
                      <div className="lb-r-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="lb-r-flags">{item.solvedCount ?? 0} flag</div>
                    <div className="lb-r-pts" style={{ color: ptsColor }}>
                      {item.points} pt
                    </div>
                  </div>
                );
              })}

              
              {classificaFiltrata.length > 3 && (
                <div className="lb-separator">
                  <div className="lbs-line" />
                  <span className="lbs-text">altri giocatori</span>
                  <div className="lbs-line" />
                </div>
              )}

              
              {classificaFiltrata.slice(3).map((item, idx) => {
                const rank      = idx + 4;
                const pct       = Math.round((item.points / maxPunti) * 100);
                const roleStyle = getRoleStyle(item.role);
                return (
                  <div
                    key={item.id ?? item._id}
                    className={`lb-row ${isMe(item) ? 'me' : ''}`}
                    onClick={() => handleOpenProfile(item)}
                  >
                    <div className="lb-r-rank">#{rank}</div>
                    <div
                      className="lb-r-av"
                      style={{ background: getAvatarGradient(rank) }}
                    >
                      {getInitials(item.username)}
                    </div>
                    <div className="lb-r-info">
                      <div className="lb-r-name">
                        {item.username}
                        {isMe(item) && <span className="lb-r-you">tu</span>}
                      </div>
                      <div className="lb-r-cats">
                        <span
                          className="lb-r-cat"
                          style={{ background: roleStyle.bg, color: roleStyle.color }}
                        >
                          {roleStyle.label}
                        </span>
                      </div>
                    </div>
                    <div className="lb-r-bar">
                      <div className="lb-r-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="lb-r-flags">{item.solvedCount ?? 0} flag</div>
                    <div className="lb-r-pts" style={{ color: 'var(--violet)' }}>
                      {item.points} pt
                    </div>
                  </div>
                );
              })}

              
              {pagina < totalePagine && (
                <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <button
                    className="lbf-btn"
                    style={{
                      border: '0.5px solid var(--border2)',
                      borderRadius: '8px',
                      padding: '9px 24px',
                    }}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Carica altri
                  </button>
                </div>
              )}

              
              {classificaFiltrata.length === 0 && (
                <div
                  className="pm-empty"
                  style={{ padding: '32px 20px', textAlign: 'center' }}
                >
                  Nessun giocatore trovato per &ldquo;{ricerca}&rdquo;
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
