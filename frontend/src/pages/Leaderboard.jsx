import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { leaderboardAPI, usersAPI } from '../services/api';
import './Leaderboard.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Visualizza il rank: emoji medaglia per i top-3, numero per gli altri
const displayRank = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

// Restituisce 80 celle tutte a zero — dati reali non disponibili per l'heatmap
const generaHeatmap = () =>
  Array.from({ length: 80 }, () => 0);

const HEATMAP_COLORS = [
  'var(--border2)',
  'rgba(92,206,138,.25)',
  'rgba(92,206,138,.5)',
  'rgba(92,206,138,.75)',
  'var(--mint)',
];

// Definizioni badge con soglie di sblocco calcolate a runtime
const BADGE_DEFS = [
  { emoji: '🔑', label: 'First Blood',   check: (p, rank) => (p.solvedCount ?? p.solved ?? (p.solvedChallenges?.length ?? 0)) >= 1 },
  { emoji: '💎', label: 'Gem Collector', check: (p)       => (p.solvedCount ?? p.solved ?? (p.solvedChallenges?.length ?? 0)) >= 20 },
  { emoji: '⚡', label: 'Speed Run',     check: (p)       => (p.points ?? 0) >= 5000 },
  { emoji: '🔥', label: 'On Fire',       check: (p)       => (p.streak ?? 0) >= 7 },
  { emoji: '👑', label: 'Champion',      check: (p, rank) => rank > 0 && rank <= 3 },
  { emoji: '🕵️', label: 'Ghost',         check: (p)       => (p.points ?? 0) >= 1000 && (p.streak ?? 0) === 0 },
];

// Categorie profilo con pct a 0 — non abbiamo dati per-categoria dall'API utente
const CATEGORIE_PROFILO_BASE = [
  { nome: 'Web',       colore: '#7C6FEA' },
  { nome: 'Crypto',    colore: '#5BC4D4' },
  { nome: 'Forensics', colore: '#5CCE8A' },
  { nome: 'Rev/Pwn',   colore: '#F6C652' },
  { nome: 'OSINT',     colore: '#E870B8' },
];

const radarPoint = (values, idx, cx, cy, r) => {
  const a = (Math.PI / 3) * idx - Math.PI / 2;
  return `${cx + r * values[idx] * Math.cos(a)},${cy + r * values[idx] * Math.sin(a)}`;
};

// ── Componente principale ─────────────────────────────────────────────────────

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Dati classifica
  const [classifica, setClassifica]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [errore, setErrore]             = useState(null);
  const [pagina, setPagina]             = useState(1);
  const [totalePagine, setTotalePagine] = useState(1);
  const [totale, setTotale]             = useState(0);

  // Profilo modale
  const [profiloAperto, setProfiloAperto]   = useState(null);
  const [profiloLoading, setProfiloLoading] = useState(false);

  // UI
  const [filterAttivo, setFilterAttivo] = useState('global');
  const [ricerca, setRicerca]           = useState('');
  const [compareIdx, setCompareIdx]     = useState(0);

  const heatmapCells = generaHeatmap();

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

  // Aggiornamento automatico ogni 60 secondi
  useEffect(() => {
    if (authLoading) return;
    const interval = setInterval(() => caricaClassifica(1, filterAttivo), 60000);
    return () => clearInterval(interval);
  }, [authLoading, caricaClassifica, filterAttivo]);

  // Re-fetch page 1 when returning to this tab (e.g. after a CTF solve)
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

  // ── Chiusura modale con tasto ESC ───────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleCloseProfile();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gestione profilo ────────────────────────────────────────────────────────

  const handleOpenProfile = async (item) => {
    document.body.style.overflow = 'hidden';
    setProfiloAperto(item);
    setProfiloLoading(true);
    try {
      const { data } = await usersAPI.getById(item.id ?? item._id);
      setProfiloAperto((prev) => ({ ...prev, ...data }));
    } catch {
      // Mostra i dati già disponibili dalla riga classifica
    } finally {
      setProfiloLoading(false);
    }
  };

  const handleCloseProfile = () => {
    document.body.style.overflow = '';
    setProfiloAperto(null);
    setProfiloLoading(false);
  };

  // ── Tema ────────────────────────────────────────────────────────────────────

  // ── Dati derivati ───────────────────────────────────────────────────────────

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

  // Giocatori disponibili per compare (esclude il #1)
  const comparePool     = classifica.slice(1);
  const compareCorrente = comparePool[compareIdx] ?? comparePool[0];

  // Badge calcolati dai dati reali del profilo aperto
  const BADGES = BADGE_DEFS.map(def => ({
    emoji:    def.emoji,
    label:    def.label,
    unlocked: profiloAperto ? def.check(profiloAperto, rankProfilo) : false,
  }));

  // Categorie: mostriamo 0% perché l'API utente non espone breakdown per-categoria
  const CATEGORIE_PROFILO = CATEGORIE_PROFILO_BASE.map(cat => ({ ...cat, pct: 0 }));

  // Calcola valori radar [0‥1] da metriche aggregate disponibili in classifica
  const calcRadar = (giocatore) => {
    if (!giocatore) return [0, 0, 0, 0, 0, 0];
    const maxPts     = classifica[0]?.points || 1;
    const maxSolved  = Math.max(...classifica.map(u => u.solved ?? 0), 1);
    const maxStreak  = Math.max(...classifica.map(u => u.streak ?? 0), 1);
    const rankGio    = classifica.findIndex(u => (u.id ?? u._id) === (giocatore.id ?? giocatore._id)) + 1;
    const rankPct    = classifica.length > 0 ? (classifica.length - (rankGio || classifica.length)) / classifica.length : 0;
    const pts        = Math.min((giocatore.points  ?? 0) / maxPts, 1);
    const solved     = Math.min((giocatore.solved   ?? 0) / maxSolved, 1);
    const streak     = Math.min((giocatore.streak   ?? 0) / Math.max(maxStreak, 1), 1);
    const efficiency = giocatore.solved > 0 ? Math.min((giocatore.points ?? 0) / (giocatore.solved * 300), 1) : 0;
    return [pts, solved, streak, rankPct, efficiency, giocatore.streak > 0 ? 0.8 : 0.2];
  };

  const RADAR_P1 = calcRadar(top3[0]);
  const RADAR_P2 = calcRadar(compareCorrente);

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Elementi decorativi di sfondo */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ── Modale profilo ── */}
      {profiloAperto && (
        <div className="profile-overlay" onClick={handleCloseProfile}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-topbar" />
            <button className="pm-close" onClick={handleCloseProfile}>✕</button>

            <div className="pm-body">
              {/* Colonna sinistra: identità utente */}
              <div className="pm-left">
                <div className="pm-avatar-wrap">
                  <div
                    className="pm-avatar"
                    style={{ background: getAvatarGradient(rankProfilo || 4) }}
                  >
                    {getInitials(profiloAperto.username)}
                  </div>
                  {rankProfilo > 0 && (
                    <div
                      className="pm-rank-pill"
                      style={{
                        background:
                          rankProfilo === 1 ? 'var(--amber-bg)'
                          : rankProfilo === 2 ? 'rgba(176,184,204,.2)'
                          : rankProfilo === 3 ? 'rgba(200,124,58,.2)'
                          : 'var(--violet-bg)',
                        color:
                          rankProfilo === 1 ? 'var(--gold)'
                          : rankProfilo === 2 ? 'var(--silver)'
                          : rankProfilo === 3 ? 'var(--bronze)'
                          : 'var(--violet)',
                      }}
                    >
                      {displayRank(rankProfilo)}
                    </div>
                  )}
                </div>

                <div className="pm-name">{profiloAperto.username}</div>
                <div className="pm-handle">@{(profiloAperto.username ?? '').toLowerCase()}</div>

                {profiloAperto.bio && (
                  <div className="pm-bio">{profiloAperto.bio}</div>
                )}

                <div className="pm-stats-grid">
                  <div className="pmsg-item">
                    <div className="pmsg-val" style={{ color: 'var(--violet)' }}>
                      {profiloAperto.points ?? 0}
                    </div>
                    <div className="pmsg-lbl">Punti</div>
                  </div>
                  <div className="pmsg-item">
                    <div className="pmsg-val" style={{ color: 'var(--mint)' }}>
                      {profiloAperto.solvedCount ?? profiloAperto.solved ?? 0}
                    </div>
                    <div className="pmsg-lbl">Flag</div>
                  </div>
                  <div className="pmsg-item">
                    <div className="pmsg-val" style={{ color: 'var(--amber)' }}>
                      {rankProfilo > 0 ? `#${rankProfilo}` : '–'}
                    </div>
                    <div className="pmsg-lbl">Rank</div>
                  </div>
                  <div className="pmsg-item">
                    <div className="pmsg-val" style={{ color: 'var(--cyan)' }}>
                      {profiloAperto.streak ?? '–'}
                    </div>
                    <div className="pmsg-lbl">Streak</div>
                  </div>
                </div>

                <div className="pm-socials">
                  {isMe(profiloAperto) ? (
                    <button
                      className="pm-social-btn primary"
                      onClick={() => { handleCloseProfile(); navigate('/dashboard'); }}
                    >
                      Vai alla dashboard
                    </button>
                  ) : (
                    <>
                      {profiloAperto.github && (
                        <button className="pm-social-btn">GitHub</button>
                      )}
                      {profiloAperto.twitter && (
                        <button className="pm-social-btn">Twitter</button>
                      )}
                      {!profiloAperto.github && !profiloAperto.twitter && (
                        <span className="pm-empty">Nessun social collegato</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Colonna destra: statistiche dettagliate */}
              <div className="pm-right">
                {profiloLoading ? (
                  <div className="lb-loading" style={{ padding: '40px 0' }}>
                    <div className="lb-spinner" />
                    <span>Caricamento dati…</span>
                  </div>
                ) : (
                  <>
                    {/* Heatmap attività */}
                    <div>
                      <div className="pm-section-title">Attività</div>
                      <div className="pm-heatmap">
                        <div className="pmh-header">
                          <span className="pmh-title">Ultimi 80 giorni</span>
                          <span className="pmh-streak">
                            🔥 {profiloAperto.streak ?? 0} giorni
                          </span>
                        </div>
                        <div className="pm-hm-grid">
                          {heatmapCells.map((livello, i) => (
                            <div
                              key={i}
                              className="pm-hm-cell"
                              style={{ background: HEATMAP_COLORS[livello] }}
                              title={`Giorno ${i + 1}: ${livello} solve`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Distribuzione per categoria */}
                    <div>
                      <div className="pm-section-title">Categorie</div>
                      <div className="pm-cats">
                        {CATEGORIE_PROFILO.map((cat) => (
                          <div key={cat.nome} className="pm-cat-row">
                            <div className="pm-cat-dot" style={{ background: cat.colore }} />
                            <div className="pm-cat-name">{cat.nome}</div>
                            <div className="pm-cat-bar">
                              <div
                                className="pm-cat-fill"
                                style={{ width: `${cat.pct}%`, background: cat.colore }}
                              />
                            </div>
                            <div className="pm-cat-pct" style={{ color: cat.colore }}>
                              {cat.pct}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Badge */}
                    <div>
                      <div className="pm-section-title">Badge</div>
                      <div className="pm-badges-grid">
                        {BADGES.map((badge) => (
                          <div
                            key={badge.label}
                            className={`pm-badge ${badge.unlocked ? 'unlocked' : 'locked'}`}
                            title={badge.label}
                          >
                            {badge.emoji}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Navbar />

      {/* ── Corpo pagina ── */}
      <main className="page">

        {/* Header pagina */}
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
                { id: 'global',  label: 'Globale'      },
                { id: 'weekly',  label: 'Settimanale'  },
                { id: 'friends', label: 'Amici'        },
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

        {/* Stato di caricamento */}
        {loading && (
          <div className="lb-loading">
            <div className="lb-spinner" />
            <span>Caricamento classifica…</span>
          </div>
        )}

        {/* Stato di errore */}
        {errore && !loading && (
          <div className="lb-error">{errore}</div>
        )}

        {/* Contenuto principale */}
        {!loading && !errore && classifica.length > 0 && (
          <>
            {/* Griglia: podio + pannello compare */}
            <div className="lb-main ai d2">

              {/* Sezione podio */}
              <div className="podium-section">
                <div className="ps-label">
                  Podio
                  <span className="ps-live">
                    <span className="ps-live-dot" /> Live
                  </span>
                </div>
                <div className="podium-stage">

                  {/* 2° posto — a sinistra del primo */}
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

                  {/* 1° posto — al centro e più alto */}
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

                  {/* 3° posto — a destra */}
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

              {/* Pannello destra: mini-stats + compare */}
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

                {/* Compare card con radar SVG statico */}
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

                    {/* Radar chart SVG statico */}
                    <div className="radar-wrap">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        {/* Griglie esagonali */}
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
                        {/* Assi */}
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
                        {/* Dati giocatore 1 */}
                        <polygon
                          points={RADAR_P1.map((v, i) => radarPoint(RADAR_P1, i, 70, 70, 60)).join(' ')}
                          fill="rgba(124,111,234,.25)"
                          stroke="#7C6FEA"
                          strokeWidth="1.5"
                        />
                        {/* Dati giocatore 2 */}
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

            {/* Classifica completa */}
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

              {/* Righe top-3 con stili speciali */}
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

              {/* Separatore visivo tra top-3 e il resto */}
              {classificaFiltrata.length > 3 && (
                <div className="lb-separator">
                  <div className="lbs-line" />
                  <span className="lbs-text">altri giocatori</span>
                  <div className="lbs-line" />
                </div>
              )}

              {/* Righe dal 4° posto in poi */}
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

              {/* Pulsante per caricare la pagina successiva */}
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

              {/* Stato vuoto dopo ricerca */}
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
