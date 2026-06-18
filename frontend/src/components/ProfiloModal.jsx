import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
// Riusa esattamente gli stili del modal già presente in Leaderboard
import '../pages/Leaderboard.css';

// ── Helpers identici a quelli in Leaderboard.jsx ─────────────────────────────

const getInitials = (username = '') => username.slice(0, 2).toUpperCase();

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

const displayRank = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const HEATMAP_COLORS = [
  'var(--border2)',
  'rgba(92,206,138,.25)',
  'rgba(92,206,138,.5)',
  'rgba(92,206,138,.75)',
  'var(--mint)',
];

const BADGE_DEFS = [
  { emoji: '🔑', label: 'First Blood',   check: (p)       => (p.solvedCount ?? (p.solvedChallenges?.length ?? 0)) >= 1 },
  { emoji: '💎', label: 'Gem Collector', check: (p)       => (p.solvedCount ?? (p.solvedChallenges?.length ?? 0)) >= 20 },
  { emoji: '⚡', label: 'Speed Run',     check: (p)       => (p.points ?? 0) >= 5000 },
  { emoji: '🔥', label: 'On Fire',       check: (p)       => (p.streak ?? 0) >= 7 },
  { emoji: '👑', label: 'Champion',      check: (p, rank) => rank > 0 && rank <= 3 },
  { emoji: '🕵️', label: 'Ghost',         check: (p)       => (p.points ?? 0) >= 1000 && (p.streak ?? 0) === 0 },
];

const CATEGORIE_BASE = [
  { nome: 'Web',       colore: '#7C6FEA' },
  { nome: 'Crypto',    colore: '#5BC4D4' },
  { nome: 'Forensics', colore: '#5CCE8A' },
  { nome: 'Rev/Pwn',   colore: '#F6C652' },
  { nome: 'OSINT',     colore: '#E870B8' },
];

const COLORI_CAT = {
  'Web':          '#7C6FEA',
  'Crypto':       '#5BC4D4',
  'Cryptography': '#5BC4D4',
  'Forensics':    '#5CCE8A',
  'Reverse':      '#F6C652',
  'OSINT':        '#E870B8',
  'Misc':         '#F07060',
};

// ── Componente ────────────────────────────────────────────────────────────────
// Props:
//   open     — boolean, controlla la visibilità
//   onClose  — callback alla chiusura
//   userId   — _id dell'utente da mostrare
//   rank     — posizione in classifica (opzionale, default 0 = non mostrato)
export default function ProfiloModal({ open, onClose, userId, rank = 0 }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profilo, setProfilo]   = useState(null);
  const [loading, setLoading]   = useState(false);

  // Carica dati profilo + attività ogni volta che il modal si apre
  useEffect(() => {
    if (!open || !userId) return;
    document.body.style.overflow = 'hidden';

    const carica = async () => {
      setLoading(true);
      try {
        const [profiloRes, activityRes] = await Promise.allSettled([
          usersAPI.getById(userId),
          usersAPI.getActivityById(userId),
        ]);

        let dati = {};
        if (profiloRes.status === 'fulfilled') dati = { ...profiloRes.value.data };
        if (activityRes.status === 'fulfilled') {
          dati._activity  = activityRes.value.data.activity  ?? [];
          dati._categorie = activityRes.value.data.categorie ?? [];
        }
        setProfilo(dati);
      } finally {
        setLoading(false);
      }
    };

    carica();

    return () => { document.body.style.overflow = ''; };
  }, [open, userId]);

  // Chiusura con ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    document.body.style.overflow = '';
    setProfilo(null);
    onClose();
  };

  if (!open || !userId) return null;

  const p = profilo ?? {};

  // Badge calcolati dai dati reali
  const badges = BADGE_DEFS.map(def => ({
    emoji:    def.emoji,
    label:    def.label,
    unlocked: profilo ? def.check(profilo, rank) : false,
  }));

  // Categorie: dati reali se disponibili, altrimenti base con pct 0
  const categorie = profilo?._categorie?.length
    ? profilo._categorie.map(cat => ({
        nome:   cat.nome,
        colore: COLORI_CAT[cat.nome] || '#7C6FEA',
        pct:    cat.pct,
      }))
    : CATEGORIE_BASE.map(cat => ({ ...cat, pct: 0 }));

  // Controlla se il profilo aperto appartiene all'utente loggato
  const isMe = user && userId &&
    userId.toString() === (user._id ?? user.id)?.toString();

  return (
    <div className="profile-overlay" onClick={handleClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-topbar" />
        <button className="pm-close" onClick={handleClose}>✕</button>

        {loading ? (
          <div className="lb-loading" style={{ padding: '80px 0' }}>
            <div className="lb-spinner" />
            <span>Caricamento profilo…</span>
          </div>
        ) : (
          <div className="pm-body">
            {/* Colonna sinistra: identità utente */}
            <div className="pm-left">
              <div className="pm-avatar-wrap">
                <div
                  className="pm-avatar"
                  style={{ background: getAvatarGradient(rank || 4) }}
                >
                  {getInitials(p.username)}
                </div>
                {rank > 0 && (
                  <div
                    className="pm-rank-pill"
                    style={{
                      background:
                        rank === 1 ? 'var(--amber-bg)'
                        : rank === 2 ? 'rgba(176,184,204,.2)'
                        : rank === 3 ? 'rgba(200,124,58,.2)'
                        : 'var(--violet-bg)',
                      color:
                        rank === 1 ? 'var(--gold)'
                        : rank === 2 ? 'var(--silver)'
                        : rank === 3 ? 'var(--bronze)'
                        : 'var(--violet)',
                    }}
                  >
                    {displayRank(rank)}
                  </div>
                )}
              </div>

              <div className="pm-name">{p.username}</div>
              <div className="pm-handle">@{(p.username ?? '').toLowerCase()}</div>

              {p.bio && <div className="pm-bio">{p.bio}</div>}

              <div className="pm-stats-grid">
                <div className="pmsg-item">
                  <div className="pmsg-val" style={{ color: 'var(--violet)' }}>
                    {p.points ?? 0}
                  </div>
                  <div className="pmsg-lbl">Punti</div>
                </div>
                <div className="pmsg-item">
                  <div className="pmsg-val" style={{ color: 'var(--mint)' }}>
                    {p.solvedCount ?? p.solved ?? 0}
                  </div>
                  <div className="pmsg-lbl">Flag</div>
                </div>
                <div className="pmsg-item">
                  <div className="pmsg-val" style={{ color: 'var(--amber)' }}>
                    {rank > 0 ? `#${rank}` : '–'}
                  </div>
                  <div className="pmsg-lbl">Rank</div>
                </div>
                <div className="pmsg-item">
                  <div className="pmsg-val" style={{ color: 'var(--cyan)' }}>
                    {p.streak ?? '–'}
                  </div>
                  <div className="pmsg-lbl">Streak</div>
                </div>
              </div>

              <div className="pm-socials">
                {isMe ? (
                  <button
                    className="pm-social-btn primary"
                    onClick={() => { handleClose(); navigate('/dashboard'); }}
                  >
                    Vai alla dashboard
                  </button>
                ) : (
                  <>
                    {p.github  && <button className="pm-social-btn">GitHub</button>}
                    {p.twitter && <button className="pm-social-btn">Twitter</button>}
                    {!p.github && !p.twitter && (
                      <span className="pm-empty">Nessun social collegato</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Colonna destra: statistiche dettagliate */}
            <div className="pm-right">
              {/* Heatmap attività */}
              <div>
                <div className="pm-section-title">Attività</div>
                <div className="pm-heatmap">
                  <div className="pmh-header">
                    <span className="pmh-title">Ultimi 80 giorni</span>
                    <span className="pmh-streak">🔥 {p.streak ?? 0} giorni</span>
                  </div>
                  <div className="pm-hm-grid">
                    {(() => {
                      const cells = profilo?._activity?.length
                        ? profilo._activity.map(a => Math.min(a.count, 4))
                        : Array.from({ length: 60 }, () => 0);
                      return cells.map((livello, i) => (
                        <div
                          key={i}
                          className="pm-hm-cell"
                          style={{ background: HEATMAP_COLORS[livello] }}
                          title={`Giorno ${i + 1}: ${livello} solve`}
                        />
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Distribuzione per categoria */}
              <div>
                <div className="pm-section-title">Categorie</div>
                <div className="pm-cats">
                  {categorie.map((cat) => (
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
                  {badges.map((badge) => (
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
