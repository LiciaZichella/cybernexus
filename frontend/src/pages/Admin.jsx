import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, usersAPI, challengesAPI, warroomAPI, leaderboardAPI } from '../services/api';
import Navbar from '../components/Navbar';
import './Admin.css';

// ── Helper: SHA-256 via Web Crypto API ───────────────────────────────────────
const calcolaHash = async (testo) => {
  if (!testo || testo.length < 3) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo.trim()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

// Dati statici per il feed attività (nessun endpoint dedicato nel backend)
const FEED_INIZIALE = [
  { ico: '🚩', bg: 'var(--v1)',               testo: 'shadow_k1ng',  azione: 'ha catturato la flag di "Buffer Overflow 101"', tempo: '2 min fa · +500 pts' },
  { ico: '🚨', bg: 'rgba(240,112,96,.1)',      testo: 'giulia_b',     azione: 'ha aperto War Room #006 — DDoS Mitigation',    tempo: '7 min fa' },
  { ico: '👤', bg: 'var(--v1)',               testo: null,           azione: 'Nuovo utente: h4xx0r_99 registrato da Bari, IT', tempo: '14 min fa' },
  { ico: '⚠️', bg: 'rgba(246,198,82,.1)',     testo: 'n3x7_g3n',    azione: 'ha raggiunto il rate limit su "Elliptic Curve Massacre"', tempo: '22 min fa · 8 tentativi' },
  { ico: '🚩', bg: 'var(--v1)',               testo: 'm4tr1x',       azione: 'ha catturato "Ghost Identity" — First Blood!',  tempo: '31 min fa · +300 pts' },
];
const LIVE_POOL = [
  { ico: '🚩', bg: 'var(--v1)',          testo: 'n3x7_g3n', azione: 'ha catturato "Dark Web Hunter"',     tempo: 'ora · +500 pts' },
  { ico: '👤', bg: 'var(--v1)',          testo: null,        azione: 'Nuovo utente: cyb3r_w0lf da Milano, IT', tempo: 'ora' },
  { ico: '🚨', bg: 'rgba(240,112,96,.1)', testo: 'alex_l',  azione: 'ha aperto War Room #007 — Zero-Day', tempo: 'ora' },
];

// Stato iniziale webhook
const WEBHOOK_INIZIALE = {
  discord: { url: 'https://discord.com/api/webhooks/123456/abcdef...', toggles: { warroom: true, utente: true, flag: false, rateLimit: true } },
  slack:   { url: '', toggles: { warroom: false, utente: false, flag: false, rateLimit: false } },
  email:   { email: 'admin@cybernexus.io', frequenza: 'daily', toggles: { critici: true, report: true } },
  custom:  { url: '', headers: '', toggles: { tutti: false } },
};

// ── Componente toggler riutilizzabile ────────────────────────────────────────
function Toggler({ on, onClick }) {
  return (
    <div className={`toggler ${on ? 'on' : 'off'}`} onClick={onClick}>
      <div className="toggler-thumb" />
    </div>
  );
}

// ── Componente principale ────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Guard: redirect se non Admin
  useEffect(() => {
    if (user !== null && user?.role !== 'Admin') navigate('/dashboard');
  }, [user, navigate]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [sezione, setSezione]   = useState('stats');
  const [theme, setTheme]       = useState('dark');

  // Dati utenti
  const [utenti, setUtenti]               = useState([]);
  const [utentiLoading, setUtentiLoading] = useState(false);
  const [utentiErrore, setUtentiErrore]   = useState(null);

  // Dati sfide CTF
  const [sfide, setSfide]               = useState([]);
  const [sfideLoading, setSfideLoading] = useState(false);
  const [sfideErrore, setSfideErrore]   = useState(null);

  // Dati War Room
  const [warrooms, setWarrooms]               = useState([]);
  const [warroomsLoading, setWarroomsLoading] = useState(false);
  const [warroomsErrore, setWarroomsErrore]   = useState(null);

  // Statistiche dashboard
  const [dashStats, setDashStats] = useState({ utenti: 1248, flag: 847, warroom: 3, sfide: 380 });

  // Form crea sfida
  const [formCTF, setFormCTF] = useState({
    titolo: '', categoria: 'Web', difficolta: 'Easy', punti: 150, descrizione: '', flag: '', file: '',
  });
  const [flagHashPreview, setFlagHashPreview] = useState('');
  const [invioSfida, setInvioSfida]           = useState(false);

  // Form crea War Room
  const [formWR, setFormWR] = useState({
    nome: '', tipo: 'Ransomware', severita: 'Critical', punti: 1500, briefing: '', playbook: '',
  });
  const [invioWR, setInvioWR] = useState(false);

  // Feed attività
  const [feedAttivita, setFeedAttivita] = useState(FEED_INIZIALE);

  // Webhook
  const [webhooks, setWebhooks]           = useState(WEBHOOK_INIZIALE);
  const [webhookTesting, setWebhookTesting] = useState({});

  // Modali
  const [roleModal, setRoleModal]       = useState({ aperto: false, username: '', userId: '', ruolo: 'Player' });
  const [confirmModal, setConfirmModal] = useState({ aperto: false, titolo: '', testo: '', onConferma: null });

  // Ricerca e modifica sfide
  const [searchQuery, setSearchQuery]       = useState('');
  const [sfidaInModifica, setSfidaInModifica] = useState(null);

  // Toast
  const [toasts, setToasts] = useState([]);

  // Refs per animazioni imperative
  const contatoriRef = useRef([]);
  const barreRef     = useRef([]);
  const sparkRef     = useRef([]);
  const liveIdxRef   = useRef(0);

  // ── Overflow body: previene lo scroll esterno nel layout full-height ────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── ESC chiude modali ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setRoleModal((m) => ({ ...m, aperto: false }));
      setConfirmModal((m) => ({ ...m, aperto: false }));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Caricamento dati al cambio sezione ──────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (sezione === 'stats')    caricaStats();
    if (sezione === 'users')    caricaUtenti();
    if (sezione === 'ctf')      caricaSfide();
    if (sezione === 'warroom')  caricaWarrooms();
  }, [sezione, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animazioni dashboard: counters + barre ───────────────────────────────────
  useEffect(() => {
    if (sezione !== 'stats') return;
    const targets = [dashStats.utenti, dashStats.flag, dashStats.warroom, dashStats.sfide];
    targets.forEach((target, i) => {
      const el = contatoriRef.current[i];
      if (!el) return;
      const dur = 1200;
      const t0 = performance.now();
      requestAnimationFrame(function step(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.floor(target * e).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString();
      });
    });
    const timer = setTimeout(() => {
      barreRef.current.forEach((el) => { if (el) el.style.width = el.dataset.w; });
    }, 200);
    return () => clearTimeout(timer);
  }, [sezione, dashStats]);

  // ── Spark bars (animazione altezze) ─────────────────────────────────────────
  useEffect(() => {
    if (sezione !== 'stats') return;
    const regData = [4, 8, 6, 12, 9, 15, 11];
    const maxV = Math.max(...regData);
    sparkRef.current.forEach((el, i) => {
      if (!el) return;
      el.style.height = '0%';
      el.style.background = i === 6 ? 'var(--v)' : 'rgba(124,111,234,0.4)';
      setTimeout(() => { el.style.height = `${(regData[i] / maxV) * 100}%`; }, 300 + i * 70);
    });
  }, [sezione]);

  // ── Feed attività live ───────────────────────────────────────────────────────
  useEffect(() => {
    const intervallo = setInterval(() => {
      const item = LIVE_POOL[liveIdxRef.current % LIVE_POOL.length];
      liveIdxRef.current++;
      setFeedAttivita((prev) => [{ ...item, fresh: true }, ...prev].slice(0, 8));
    }, 8000);
    return () => clearInterval(intervallo);
  }, []);

  // ── Chiamate API ─────────────────────────────────────────────────────────────

  const caricaStats = async () => {
    try {
      const [lb, ch, wr] = await Promise.allSettled([
        leaderboardAPI.get({ page: 1, limit: 1 }),
        challengesAPI.getAll(),
        warroomAPI.getAll(),
      ]);
      setDashStats({
        utenti:  lb.status === 'fulfilled' ? (lb.value.data.total ?? 1248) : 1248,
        flag:    847,
        warroom: wr.status === 'fulfilled'
          ? (wr.value.data?.rooms ?? wr.value.data ?? []).filter((r) => r.status === 'open' || r.isActive).length
          : 3,
        sfide:   ch.status === 'fulfilled'
          ? (ch.value.data?.challenges ?? ch.value.data ?? []).length
          : 380,
      });
    } catch { /* usa i valori di default già nello stato */ }
  };

  const caricaUtenti = async () => {
    setUtentiLoading(true);
    setUtentiErrore(null);
    try {
      const { data } = await usersAPI.getAll({ page: 1, limit: 20 });
      setUtenti(data.users ?? data ?? []);
    } catch (err) {
      setUtentiErrore(err.response?.data?.message ?? 'Impossibile caricare gli utenti.');
    } finally {
      setUtentiLoading(false);
    }
  };

  const caricaSfide = async () => {
    setSfideLoading(true);
    setSfideErrore(null);
    try {
      const { data } = await challengesAPI.getAll();
      setSfide(data.challenges ?? data ?? []);
    } catch (err) {
      setSfideErrore(err.response?.data?.message ?? 'Impossibile caricare le sfide.');
    } finally {
      setSfideLoading(false);
    }
  };

  const caricaWarrooms = async () => {
    setWarroomsLoading(true);
    setWarroomsErrore(null);
    try {
      const { data } = await warroomAPI.getAll();
      setWarrooms(data.rooms ?? data ?? []);
    } catch (err) {
      setWarroomsErrore(err.response?.data?.message ?? 'Impossibile caricare le War Room.');
    } finally {
      setWarroomsLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const mostraToast = (messaggio, tipo = '') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, messaggio, tipo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const handleFlagInput = async (valore) => {
    setFormCTF((f) => ({ ...f, flag: valore }));
    if (valore.length > 3) {
      const hash = await calcolaHash(valore);
      setFlagHashPreview(hash ? `SHA-256: ${hash.slice(0, 20)}…` : '');
    } else {
      setFlagHashPreview('');
    }
  };

  const handleCreaSfida = async () => {
    if (!formCTF.titolo || (!sfidaInModifica && !formCTF.flag)) {
      mostraToast('Titolo e flag sono obbligatori', 'terr'); return;
    }
    setInvioSfida(true);
    try {
      if (sfidaInModifica) {
        const payload = {
          title: formCTF.titolo, description: formCTF.descrizione,
          category: formCTF.categoria, difficulty: formCTF.difficolta,
          points: Number(formCTF.punti),
        };
        if (formCTF.flag) payload.flag = formCTF.flag;
        await api.patch(`/challenges/${sfidaInModifica._id ?? sfidaInModifica.id}`, payload);
        mostraToast('Sfida aggiornata ✓', 'tok');
        setSfidaInModifica(null);
      } else {
        await challengesAPI.create({
          title: formCTF.titolo, description: formCTF.descrizione,
          category: formCTF.categoria, difficulty: formCTF.difficolta,
          points: Number(formCTF.punti), flag: formCTF.flag,
        });
        mostraToast('Sfida creata! Flag SHA-256 salvata ✓', 'tok');
      }
      setFormCTF({ titolo: '', categoria: 'Web', difficolta: 'Easy', punti: 150, descrizione: '', flag: '', file: '' });
      setFlagHashPreview('');
      caricaSfide();
    } catch (err) {
      mostraToast(err.response?.data?.message ?? 'Errore nell\'operazione', 'terr');
    } finally {
      setInvioSfida(false);
    }
  };

  const handleCreaWarRoom = async () => {
    if (!formWR.nome) { mostraToast('Nome incidente obbligatorio', 'terr'); return; }
    setInvioWR(true);
    try {
      await warroomAPI.create({
        title: formWR.nome, type: formWR.tipo, severity: formWR.severita,
        points: Number(formWR.punti), briefing: formWR.briefing,
        playbook: formWR.playbook.split('\n').filter(Boolean),
      });
      mostraToast('War Room creata! Playbook generato ✓', 'tok');
      setFormWR({ nome: '', tipo: 'Ransomware', severita: 'Critical', punti: 1500, briefing: '', playbook: '' });
      caricaWarrooms();
    } catch (err) {
      mostraToast(err.response?.data?.message ?? 'Errore nella creazione della War Room', 'terr');
    } finally {
      setInvioWR(false);
    }
  };

  const handleSalvaRuolo = async () => {
    try {
      await api.patch(`/users/${roleModal.userId}/role`, { role: roleModal.ruolo });
      mostraToast(`Ruolo di ${roleModal.username} → "${roleModal.ruolo}" ✓`, 'tok');
      setRoleModal((m) => ({ ...m, aperto: false }));
      caricaUtenti();
    } catch {
      mostraToast('Errore nel cambio ruolo', 'terr');
    }
  };

  const handleTestWebhook = (chiave, nome) => {
    setWebhookTesting((w) => ({ ...w, [chiave]: 'testing' }));
    setTimeout(() => {
      setWebhookTesting((w) => ({ ...w, [chiave]: 'ok' }));
      mostraToast(`Webhook ${nome} OK ✓`, 'tok');
      setTimeout(() => setWebhookTesting((w) => ({ ...w, [chiave]: '' })), 3000);
    }, 1400);
  };

  const toggleWebhookVoce = (wh, voce) =>
    setWebhooks((prev) => ({
      ...prev,
      [wh]: { ...prev[wh], toggles: { ...prev[wh].toggles, [voce]: !prev[wh].toggles[voce] } },
    }));

  const isMe = (u) => (u._id ?? u.id) === (user?.id ?? user?._id);

  // ── Render sezioni ────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <>
      <div className="sec-eyebrow ai d1">
        <div className="se-icon">📊</div>
        <div className="se-info">
          <div className="se-title">Panoramica piattaforma</div>
          <div className="se-sub">Dati aggiornati in tempo reale · Stagione 01/2026</div>
        </div>
        <div className="se-badge badge-ok" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="dot-live" style={{ background: '#5CCE8A' }} />Sistema online
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid ai d2">
        {[
          { ico: '👥', trend: '↑ +34',  cls: 'badge-ok',   lbl: 'Utenti registrati'  },
          { ico: '🚩', trend: '↑ +12%', cls: 'badge-ok',   lbl: 'Flag catturate oggi' },
          { ico: '🛡️', trend: 'live',   cls: 'badge-warn',  lbl: 'War Room attive'    },
          { ico: '⚑',  trend: '+5 sett',cls: 'badge-v',    lbl: 'Sfide CTF totali'   },
        ].map((c, i) => (
          <div className="stat-card" key={i}>
            <div className="sc-icon-row">
              <div className="sc-icon" style={{ background: 'var(--v1)' }}>{c.ico}</div>
              <span className={`sc-trend ${c.cls}`}>
                {c.trend === 'live'
                  ? <><span className="dot-live" style={{ background: '#F6C652' }} />live</>
                  : c.trend}
              </span>
            </div>
            <div className="sc-val sc-val-shimmer" ref={(el) => { contatoriRef.current[i] = el; }}>0</div>
            <div className="sc-lbl">{c.lbl}</div>
          </div>
        ))}
      </div>

      {/* Grafici */}
      <div className="two-col ai d3">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Registrazioni — ultimi 7 giorni</div>
            <div className="card-sub">nuovi utenti per giorno</div>
          </div>
          <div className="card-body">
            <div className="spark-wrap">
              {[4, 8, 6, 12, 9, 15, 11].map((_, i) => (
                <div key={i} className="spark-b" ref={(el) => { sparkRef.current[i] = el; }} />
              ))}
            </div>
            <div className="spark-labels">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((g) => <span key={g}>{g}</span>)}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Flag per categoria</div>
            <div className="card-sub">% risolte sul totale</div>
          </div>
          <div className="card-body">
            {[
              { nome: 'Web Exploit', pct: '88%' }, { nome: 'Cryptography', pct: '72%' },
              { nome: 'OSINT', pct: '61%' },        { nome: 'Forensics', pct: '44%' },
              { nome: 'Reverse Eng.', pct: '28%' },
            ].map(({ nome, pct }, i) => (
              <div className="bar-h-row" key={nome}>
                <div className="bar-h-lbl">{nome}</div>
                <div className="bar-h-track">
                  <div className="bar-h-fill" data-w={pct} ref={(el) => { barreRef.current[i] = el; }} />
                </div>
                <div className="bar-h-val">{pct}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feed attività */}
      <div className="card ai d4">
        <div className="card-hdr">
          <div className="card-title">Attività recente</div>
          <div className="live-pill"><div className="live-dot" />live</div>
        </div>
        <div className="act-feed">
          {feedAttivita.map((item, i) => (
            <div key={i} className={`act-item${item.fresh ? ' fresh' : ''}`}>
              <div className="act-ico" style={{ background: item.bg }}>{item.ico}</div>
              <div className="act-main">
                <div className="act-text">
                  {item.testo && <strong>{item.testo}</strong>}
                  {item.testo ? ' ' : ''}{item.azione}
                </div>
                <div className="act-time">{item.tempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderUsers = () => (
    <>
      <div className="sec-eyebrow ai d1">
        <div className="se-icon">👥</div>
        <div className="se-info">
          <div className="se-title">Gestione utenti</div>
          <div className="se-sub">{utenti.length} utenti caricati · 3 azioni in attesa</div>
        </div>
        <div className="se-badge badge-err" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="dot-live" style={{ background: '#F07060' }} />da moderare
        </div>
      </div>

      {utentiLoading && <div className="a-loading"><div className="a-spinner" />Caricamento utenti…</div>}
      {utentiErrore  && <div className="a-errore">{utentiErrore}</div>}

      {!utentiLoading && !utentiErrore && (
        <div className="card ai d2">
          <div className="card-hdr">
            <div className="card-title">Tutti gli utenti</div>
            <div className="card-sub">{utenti.length} caricati</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Utente</th><th>Ruolo</th><th>Punti</th><th>Stato</th><th>Azioni</th></tr></thead>
              <tbody>
                {utenti.filter(u => !searchQuery || u.username?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map((u) => {
                  const bannato = u.isBanned ?? u.status === 'banned';
                  const me      = isMe(u);
                  return (
                    <tr key={u._id ?? u.id} style={{ opacity: bannato ? 0.5 : 1 }}>
                      <td>
                        <div className="td-user">
                          <div className="td-av" style={{ background: 'linear-gradient(135deg,var(--v),#9d93f0)' }}>
                            {(u.username ?? '').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="td-name">
                              {u.username}
                              {me && <span className="badge badge-v" style={{ fontSize: 9, padding: '1px 6px', marginLeft: 4 }}>tu</span>}
                            </div>
                            <div className="td-handle">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-v">{u.role}</span></td>
                      <td><span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--v)' }}>{u.points ?? 0}</span></td>
                      <td>
                        <div className="wr-status">
                          <div className="wr-dot" style={{ background: bannato ? '#F07060' : '#5CCE8A' }} />
                          <span style={{ color: bannato ? '#F07060' : '#5CCE8A', fontSize: 12 }}>
                            {bannato ? 'Bannato' : 'Attivo'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {me ? (
                          <span className="text-sm" style={{ opacity: 0.4 }}>—</span>
                        ) : (
                          <div className="act-btns">
                            <button
                              className="act-btn"
                              onClick={() => setRoleModal({ aperto: true, username: u.username, userId: u._id ?? u.id, ruolo: u.role ?? 'Player' })}
                            >
                              Ruolo
                            </button>
                            {bannato ? (
                              <button
                                className="act-btn"
                                onClick={() => setConfirmModal({
                                  aperto: true, titolo: 'Sbanna utente', testo: `Riabilitare ${u.username}?`,
                                  onConferma: () => {
                                    mostraToast('Funzionalità non disponibile', '');
                                  },
                                })}
                              >
                                Sbanna
                              </button>
                            ) : (
                              <button
                                className="act-btn danger"
                                onClick={() => setConfirmModal({
                                  aperto: true, titolo: 'Banna utente', testo: `Vuoi bannare ${u.username}?`,
                                  onConferma: () => {
                                    mostraToast('Funzionalità non disponibile', '');
                                  },
                                })}
                              >
                                Banna
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  const renderCTF = () => (
    <>
      <div className="sec-eyebrow ai d1">
        <div className="se-icon">⚑</div>
        <div className="se-info">
          <div className="se-title">Gestione sfide CTF</div>
          <div className="se-sub">{sfide.length} sfide totali · le flag vengono hashate SHA-256 prima del salvataggio</div>
        </div>
        <div className="se-badge badge-ok">🔒 SHA-256 attivo</div>
      </div>

      {/* Form crea sfida */}
      <div className="form-card ai d2">
        <div className="fc-hdr">
          <div className="fc-icon">⚑</div>
          <div className="fc-title">{sfidaInModifica ? `Modifica sfida: ${sfidaInModifica.title}` : 'Crea nuova sfida CTF'}</div>
        </div>
        <div className="fc-body">
          <div className="form-grid">
            <div className="fg">
              <div className="fg-lbl">Nome sfida</div>
              <input className="fg-input" type="text" placeholder="es. RSA Baby Steps"
                value={formCTF.titolo} onChange={(e) => setFormCTF((f) => ({ ...f, titolo: e.target.value }))} />
            </div>
            <div className="fg">
              <div className="fg-lbl">Categoria</div>
              <select className="fg-input" value={formCTF.categoria} onChange={(e) => setFormCTF((f) => ({ ...f, categoria: e.target.value }))}>
                {['Web', 'Crypto', 'Forensics', 'Pwn', 'Reverse', 'OSINT', 'Misc'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg">
              <div className="fg-lbl">Difficoltà</div>
              <select className="fg-input" value={formCTF.difficolta} onChange={(e) => setFormCTF((f) => ({ ...f, difficolta: e.target.value }))}>
                {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="fg">
              <div className="fg-lbl">Punti</div>
              <input className="fg-input" type="number" min="50" step="50"
                value={formCTF.punti} onChange={(e) => setFormCTF((f) => ({ ...f, punti: e.target.value }))} />
            </div>
            <div className="fg full">
              <div className="fg-lbl">Descrizione</div>
              <textarea className="fg-input" placeholder="Descrivi la sfida e il contesto..."
                value={formCTF.descrizione} onChange={(e) => setFormCTF((f) => ({ ...f, descrizione: e.target.value }))} />
            </div>
            <div className="fg full">
              <div className="fg-lbl">Flag (testo in chiaro — verrà hashata SHA-256)</div>
              <div className="flag-wrap">
                <input className="fg-input" type="text" placeholder="FLAG{...}" style={{ paddingRight: 110 }}
                  value={formCTF.flag} onChange={(e) => handleFlagInput(e.target.value)} />
                <div className="flag-badge">🔒 SHA-256</div>
              </div>
              <div className="fg-note" style={{ color: flagHashPreview ? '#5CCE8A' : '' }}>
                {flagHashPreview || "Il backend salverà solo l'hash — la flag in chiaro non viene mai memorizzata"}
              </div>
            </div>
            <div className="fg full">
              <div className="fg-lbl">File allegati</div>
              <input className="fg-input" type="text" placeholder="es. challenge.zip — max 10MB"
                value={formCTF.file} onChange={(e) => setFormCTF((f) => ({ ...f, file: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button className="tb-btn tb-primary" onClick={handleCreaSfida} disabled={invioSfida}>
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {invioSfida ? 'Salvataggio…' : (sfidaInModifica ? 'Salva modifiche' : 'Crea sfida')}
            </span>
          </button>
          {sfidaInModifica && (
            <button className="tb-btn tb-ghost" onClick={() => { setSfidaInModifica(null); setFormCTF({ titolo: '', categoria: 'Web', difficolta: 'Easy', punti: 150, descrizione: '', flag: '', file: '' }); setFlagHashPreview(''); }}>Annulla</button>
          )}
          {!sfidaInModifica && (
            <button className="tb-btn tb-ghost" onClick={() => mostraToast('Anteprima — funzionalità in sviluppo', '')}>Anteprima</button>
          )}
        </div>
      </div>

      {/* Tabella sfide */}
      {sfideLoading && <div className="a-loading"><div className="a-spinner" />Caricamento sfide…</div>}
      {sfideErrore  && <div className="a-errore">{sfideErrore}</div>}
      {!sfideLoading && (
        <div className="card ai d3">
          <div className="card-hdr">
            <div className="card-title">Sfide esistenti</div>
            <div className="card-sub">{sfide.length} totali</div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Nome</th><th>Categoria</th><th>Difficoltà</th><th>Punti</th><th>Risolte da</th><th>Azioni</th></tr></thead>
              <tbody>
                {sfide.filter(s => !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.category?.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => (
                  <tr key={s._id ?? s.id}>
                    <td style={{ color: 'var(--text1)', fontWeight: 500 }}>{s.title}</td>
                    <td><span style={{ color: 'var(--v)', fontSize: 12 }}>{s.category}</span></td>
                    <td>
                      <span className={`badge ${s.difficulty === 'Easy' ? 'badge-ok' : s.difficulty === 'Medium' ? 'badge-warn' : 'badge-err'}`}>
                        {s.difficulty}
                      </span>
                    </td>
                    <td><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{s.points}</span></td>
                    <td><span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>{s.solveCount ?? 0}</span></td>
                    <td>
                      <div className="act-btns">
                        <button className="act-btn" onClick={() => {
                          setSfidaInModifica(s);
                          setFormCTF({ titolo: s.title, categoria: s.category, difficolta: s.difficulty, punti: s.points, descrizione: s.description || '', flag: '', file: '' });
                          setSezione('ctf');
                          setTimeout(() => document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth' }), 50);
                        }}>Modifica</button>
                        <button
                          className="act-btn danger"
                          onClick={() => setConfirmModal({
                            aperto: true, titolo: 'Elimina sfida', testo: `Eliminare "${s.title}"?`,
                            onConferma: async () => {
                              try {
                                await api.delete(`/challenges/${s._id ?? s.id}`);
                                mostraToast('Sfida eliminata', 'tok');
                                caricaSfide();
                              } catch { mostraToast('Eliminazione non disponibile', 'terr'); }
                            },
                          })}
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  const renderWarRoom = () => {
    const liveCount = warrooms.filter((w) => w.status === 'open' || w.isActive).length;
    return (
      <>
        <div className="sec-eyebrow ai d1">
          <div className="se-icon">🛡️</div>
          <div className="se-info">
            <div className="se-title">Gestione War Room</div>
            <div className="se-sub">{liveCount} incidenti live · {warrooms.length} scenari totali</div>
          </div>
          <div className="se-badge badge-err" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="dot-live" style={{ background: '#F07060' }} />{liveCount} live ora
          </div>
        </div>

        {/* Form crea War Room */}
        <div className="form-card ai d2">
          <div className="fc-hdr">
            <div className="fc-icon">🛡️</div>
            <div className="fc-title">Crea nuovo scenario War Room</div>
          </div>
          <div className="fc-body">
            <div className="form-grid">
              <div className="fg">
                <div className="fg-lbl">Nome incidente</div>
                <input className="fg-input" type="text" placeholder="es. Ransomware Attack #006"
                  value={formWR.nome} onChange={(e) => setFormWR((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="fg">
                <div className="fg-lbl">Tipo incidente</div>
                <select className="fg-input" value={formWR.tipo} onChange={(e) => setFormWR((f) => ({ ...f, tipo: e.target.value }))}>
                  {['Ransomware', 'DDoS', 'Phishing', 'Data Breach', 'Supply Chain', 'Zero-Day'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="fg">
                <div className="fg-lbl">Severità</div>
                <select className="fg-input" value={formWR.severita} onChange={(e) => setFormWR((f) => ({ ...f, severita: e.target.value }))}>
                  {['Critical', 'High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg">
                <div className="fg-lbl">Punti ricompensa</div>
                <input className="fg-input" type="number" min="500" step="100"
                  value={formWR.punti} onChange={(e) => setFormWR((f) => ({ ...f, punti: e.target.value }))} />
              </div>
              <div className="fg full">
                <div className="fg-lbl">Briefing incidente</div>
                <textarea className="fg-input" placeholder="Descrivi lo scenario — cosa è successo, sistemi coinvolti..."
                  value={formWR.briefing} onChange={(e) => setFormWR((f) => ({ ...f, briefing: e.target.value }))} />
              </div>
              <div className="fg full">
                <div className="fg-lbl">Passi playbook (uno per riga)</div>
                <textarea className="fg-input" rows="5"
                  placeholder={'Analizzare alert SIEM\nAprire War Room e assegnare ruoli\nDump memoria sistemi affetti\nIsolare sistemi dalla rete'}
                  value={formWR.playbook} onChange={(e) => setFormWR((f) => ({ ...f, playbook: e.target.value }))} />
                <div className="fg-note">Ogni riga = un passo del playbook. Generati automaticamente come obiettivi.</div>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button className="tb-btn tb-primary" onClick={handleCreaWarRoom} disabled={invioWR}>
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {invioWR ? 'Creazione…' : 'Crea War Room'}
              </span>
            </button>
            <button className="tb-btn tb-ghost" onClick={() => mostraToast('Salva bozza — funzionalità in sviluppo', '')}>Salva bozza</button>
          </div>
        </div>

        {warroomsLoading && <div className="a-loading"><div className="a-spinner" />Caricamento War Room…</div>}
        {warroomsErrore  && <div className="a-errore">{warroomsErrore}</div>}
        {!warroomsLoading && (
          <div className="card ai d3">
            <div className="card-hdr">
              <div className="card-title">Scenari recenti</div>
              <div className="card-sub">{warrooms.length} totali</div>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Tipo</th><th>Severità</th><th>Stato</th><th>Partecipanti</th><th>Azioni</th></tr></thead>
                <tbody>
                  {warrooms.map((wr) => {
                    const isLive = wr.status === 'open' || wr.isActive;
                    return (
                      <tr key={wr._id ?? wr.id} style={{ opacity: !isLive ? 0.6 : 1 }}>
                        <td style={{ color: 'var(--text1)', fontWeight: 500 }}>{wr.title}</td>
                        <td><span className="text-sm">{wr.type ?? '—'}</span></td>
                        <td>
                          <span className={`badge ${wr.severity === 'Critical' ? 'badge-err' : wr.severity === 'High' ? 'badge-warn' : 'badge-ok'}`}>
                            {wr.severity ?? '—'}
                          </span>
                        </td>
                        <td>
                          <div className="wr-status">
                            <div className="wr-dot" style={{ background: isLive ? '#F07060' : 'var(--text3)', animation: isLive ? 'liveBlip 1s infinite' : 'none' }} />
                            <span style={{ color: isLive ? '#F07060' : 'var(--text2)', fontSize: 12 }}>{isLive ? 'Live' : 'Completata'}</span>
                          </div>
                        </td>
                        <td><span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text2)' }}>{(wr.participants ?? wr.members ?? []).length}</span></td>
                        <td>
                          <div className="act-btns">
                            <button className="act-btn" onClick={() => isLive ? navigate(`/warroom/${wr._id ?? wr.id}`) : mostraToast('Report War Room — funzionalità in sviluppo', '')}>{isLive ? 'Osserva' : 'Report'}</button>
                            {isLive && (
                              <button
                                className="act-btn danger"
                                onClick={() => setConfirmModal({
                                  aperto: true, titolo: 'Chiudi War Room', testo: `Chiudere forzatamente "${wr.title}"?`,
                                  onConferma: async () => {
                                    try { await warroomAPI.resolve(wr._id ?? wr.id); mostraToast('War Room chiusa', 'tok'); caricaWarrooms(); }
                                    catch { mostraToast('Operazione non riuscita', 'terr'); }
                                  },
                                })}
                              >
                                Chiudi
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderWebhooks = () => {
    const wCards = [
      { chiave: 'discord', ico: '💬', nome: 'Discord', canale: '#cybernexus-alerts',
        voci: ['warroom', 'utente', 'flag', 'rateLimit'], etichette: ['War Room risolta', 'Nuovo utente', 'Flag catturata', 'Rate limit hit'] },
      { chiave: 'slack',   ico: '📨', nome: 'Slack',   canale: '#incidents',
        voci: ['warroom', 'utente', 'flag', 'rateLimit'], etichette: ['War Room risolta', 'Nuovo utente', 'Flag catturata', 'Rate limit hit'] },
      { chiave: 'email',   ico: '📧', nome: 'Email',   canale: 'Digest giornaliero admin',
        voci: ['critici', 'report'], etichette: ['Alert critici', 'Report giornaliero'] },
      { chiave: 'custom',  ico: '🔗', nome: 'Custom endpoint', canale: 'POST su URL personalizzato',
        voci: ['tutti'], etichette: ['Tutti gli eventi'] },
    ];

    const getBadgeStato = (chiave) => {
      const w = webhooks[chiave];
      const haUrl = !!(w.url || w.email);
      if (!haUrl) return { cls: 'badge-gray', txt: '○ Disabilitato' };
      return haUrl ? { cls: 'badge-ok', txt: '● Attivo' } : { cls: 'badge-warn', txt: '○ Non configurato' };
    };

    return (
      <>
        <div className="sec-eyebrow ai d1">
          <div className="se-icon">🔔</div>
          <div className="se-info">
            <div className="se-title">Configurazione Webhook</div>
            <div className="se-sub">Notifiche automatiche verso Discord, Slack, Email e endpoint custom</div>
          </div>
          <div className="se-badge badge-v">2 / 4 attivi</div>
        </div>

        <div className="wh-grid ai d2">
          {wCards.map(({ chiave, ico, nome, canale, voci, etichette }) => {
            const st = getBadgeStato(chiave);
            const ts = webhookTesting[chiave];
            return (
              <div className="wh-card" key={chiave}>
                <div className="wh-hdr">
                  <div className="wh-ico">{ico}</div>
                  <div>
                    <div className="wh-name">{nome}</div>
                    <div className="text-sm" style={{ fontSize: 10, marginTop: 1 }}>{canale}</div>
                  </div>
                  <span className={`wh-status ${st.cls}`}>{st.txt}</span>
                </div>

                <input
                  className="fg-input" type="text" style={{ marginBottom: 10, fontSize: 11 }}
                  placeholder={chiave === 'email' ? 'admin@esempio.io' : 'https://...'}
                  value={webhooks[chiave].url ?? webhooks[chiave].email ?? ''}
                  onChange={(e) => setWebhooks((prev) => ({
                    ...prev,
                    [chiave]: { ...prev[chiave], [chiave === 'email' ? 'email' : 'url']: e.target.value },
                  }))}
                />

                {chiave === 'email' && (
                  <select className="fg-input" style={{ marginBottom: 10, fontSize: 11 }}
                    value={webhooks.email.frequenza}
                    onChange={(e) => setWebhooks((prev) => ({ ...prev, email: { ...prev.email, frequenza: e.target.value } }))}>
                    <option value="daily">Digest giornaliero (08:00)</option>
                    <option value="realtime">In tempo reale</option>
                    <option value="critical">Solo alert critici</option>
                  </select>
                )}
                {chiave === 'custom' && (
                  <input className="fg-input" type="text" placeholder='{"Authorization":"Bearer TOKEN"}'
                    style={{ marginBottom: 10, fontSize: 10, fontFamily: 'monospace' }} />
                )}

                {voci.map((voce, i) => (
                  <div key={voce} className="toggle-row">
                    <Toggler on={webhooks[chiave].toggles[voce]} onClick={() => toggleWebhookVoce(chiave, voce)} />
                    {etichette[i]}
                  </div>
                ))}

                <button
                  className={`wh-test${ts === 'testing' ? ' testing' : ts === 'ok' ? ' ok' : ''}`}
                  onClick={() => handleTestWebhook(chiave, nome)}
                >
                  {ts === 'testing' ? 'Testing…' : ts === 'ok' ? `✓ ${nome} connesso` : 'Testa connessione →'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 10 }} className="ai d3">
          <span className="text-sm">Salva la configurazione webhook — le modifiche sono attive immediatamente.</span>
          <button className="tb-btn tb-primary" onClick={() => mostraToast('Configurazione webhook salvata ✓', 'tok')}>
            <span>Salva configurazione</span>
          </button>
        </div>
      </>
    );
  };

  // ── Dati navigazione sidebar ─────────────────────────────────────────────────
  const SIDEBAR_GRUPPI = [
    { label: 'Panoramica', voci: [{ id: 'stats', ico: '⊞', etichetta: 'Dashboard', badge: null }] },
    { label: 'Gestione',   voci: [
      { id: 'users',   ico: '👥', etichetta: 'Utenti',    badge: utenti.length > 0 ? utenti.length : null },
      { id: 'ctf',     ico: '⚑',  etichetta: 'Sfide CTF', badge: null },
      { id: 'warroom', ico: '🛡️', etichetta: 'War Room',  badge: null },
    ]},
    { label: 'Sistema', voci: [{ id: 'webhooks', ico: '🔔', etichetta: 'Webhook', badge: null }] },
  ];

  const TITOLI_SEZIONE = { stats: 'Dashboard', users: 'Gestione utenti', ctf: 'Sfide CTF', warroom: 'War Room', webhooks: 'Webhook' };
  const LABEL_BTN_TOP  = { stats: '+ Crea sfida', users: '+ Invita utente', ctf: '+ Crea sfida', warroom: '+ Crea War Room', webhooks: 'Salva tutto' };

  if (!user) return null;

  return (
    <div className="admin-app">
      {/* ── Toast ── */}
      <div className="toast-wrap">
        {toasts.map(({ id, messaggio, tipo }) => (
          <div key={id} className={`toast ${tipo}`}>
            <span style={{ fontSize: 16 }}>{tipo === 'tok' ? '✓' : tipo === 'terr' ? '✗' : 'ℹ'}</span>
            <span>{messaggio}</span>
          </div>
        ))}
      </div>

      {/* ── Modale cambio ruolo ── */}
      {roleModal.aperto && (
        <div className="modal-overlay" onClick={() => setRoleModal((m) => ({ ...m, aperto: false }))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top" />
            <div className="modal-hdr">
              <div className="modal-title">Cambia ruolo — <span className="text-v">{roleModal.username}</span></div>
              <div className="modal-close" onClick={() => setRoleModal((m) => ({ ...m, aperto: false }))}>✕</div>
            </div>
            <div className="modal-body">
              <div className="fg">
                <div className="fg-lbl">Nuovo ruolo</div>
                <select className="fg-input" value={roleModal.ruolo} onChange={(e) => setRoleModal((m) => ({ ...m, ruolo: e.target.value }))}>
                  {['Guest', 'Player', 'Analyst', 'Manager', 'Admin'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="act-btn" onClick={() => setRoleModal((m) => ({ ...m, aperto: false }))}>Annulla</button>
              <button className="tb-btn tb-primary" onClick={handleSalvaRuolo}><span>Salva ruolo</span></button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale conferma ── */}
      {confirmModal.aperto && (
        <div className="modal-overlay" onClick={() => setConfirmModal((m) => ({ ...m, aperto: false }))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top" />
            <div className="modal-hdr">
              <div className="modal-title">{confirmModal.titolo}</div>
              <div className="modal-close" onClick={() => setConfirmModal((m) => ({ ...m, aperto: false }))}>✕</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{confirmModal.testo}</p>
            </div>
            <div className="modal-footer">
              <button className="act-btn" onClick={() => setConfirmModal((m) => ({ ...m, aperto: false }))}>Annulla</button>
              <button
                className="tb-btn tb-primary"
                onClick={() => { setConfirmModal((m) => ({ ...m, aperto: false })); confirmModal.onConferma?.(); }}
              >
                <span>Conferma</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar condivisa — fissa in cima */}
      <Navbar />

      {/* ── Layout app ── */}
      <div className="app" style={{ paddingTop: '60px' }}>

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-name">CyberNexus</div>
            <div className="sb-logo-sub">Admin Panel</div>
          </div>

          <nav className="sb-nav">
            {SIDEBAR_GRUPPI.map(({ label, voci }) => (
              <div key={label}>
                <div className="sb-grp-label">{label}</div>
                {voci.map(({ id, ico, etichetta, badge }) => (
                  <div key={id} className={`sb-item ${sezione === id ? 'active' : ''}`} onClick={() => setSezione(id)}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{ico}</span>
                    <span>{etichetta}</span>
                    {badge && <span className="sb-badge">{badge}</span>}
                  </div>
                ))}
              </div>
            ))}
            <div className="sb-item" onClick={() => navigate('/dashboard')}>
              <span style={{ fontSize: 15 }}>↩</span>
              <span>↩ App utente</span>
            </div>
          </nav>

          <div className="sb-footer">
            <div className="sb-av">{(user?.username ?? 'AD').slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="sb-user-name">{user?.username ?? 'admin'}</div>
              <div className="sb-user-role">Admin</div>
            </div>
            <div className="mode-btn" onClick={toggleTheme} title="Toggle dark/light">
              {theme === 'dark' ? '☀️' : '🌙'}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="tb-title">
              {sezione === 'stats'
                ? <>Dashboard <span>Admin</span></>
                : TITOLI_SEZIONE[sezione]}
            </div>
            <div className="tb-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text2)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Cerca nella piattaforma..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {sezione === 'users' && (
              <button className="tb-btn tb-ghost" onClick={() => mostraToast(`Export CSV generato · ${utenti.length} utenti`, 'tok')}>
                Esporta CSV
              </button>
            )}
            <button
              className="tb-btn tb-primary"
              onClick={() => {
                if (sezione === 'stats' || sezione === 'ctf')   setSezione('ctf');
                else if (sezione === 'warroom')                  setSezione('warroom');
                else if (sezione === 'users')                    mostraToast('Invito email — disponibile nel backend', 'tok');
                else if (sezione === 'webhooks')                 mostraToast('Configurazione salvata ✓', 'tok');
              }}
            >
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {LABEL_BTN_TOP[sezione]}
              </span>
            </button>
          </div>

          <div className="content">
            {sezione === 'stats'    && renderDashboard()}
            {sezione === 'users'    && renderUsers()}
            {sezione === 'ctf'      && renderCTF()}
            {sezione === 'warroom'  && renderWarRoom()}
            {sezione === 'webhooks' && renderWebhooks()}
          </div>
        </div>

      </div>
    </div>
  );
}
