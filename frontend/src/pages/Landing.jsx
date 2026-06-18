import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { authAPI, api } from '../services/api';
import Navbar from '../components/Navbar';
import './Landing.css';

const FLAG_STR = 'FLAG{sql_1nj3ct10n_m4st3r}';

export default function Landing() {
  const navigate = useNavigate();
  const [typedFlag, setTypedFlag] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const idxRef = useRef(0);

  const [regForm, setRegForm] = useState({ username: '', email: '', password: '' });
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [modalLegale, setModalLegale] = useState(null);

  // Statistiche reali dalla piattaforma
  const [statsData, setStatsData] = useState({ utenti: 0, sfide: 0, warroom: 0 });
  const [topUtenti, setTopUtenti] = useState([]);

  // Imposta data-theme al montaggio
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  // Carica statistiche pubbliche e top-3 da endpoint senza autenticazione
  useEffect(() => {
    api.get('/platform/stats')
      .then(({ data }) => {
        setStatsData({
          utenti:  data.utenti  ?? 0,
          sfide:   data.sfide   ?? 0,
          warroom: data.warroom ?? 0,
        });
        if (Array.isArray(data.top3)) setTopUtenti(data.top3);
      })
      .catch(() => {}); // server non raggiungibile — mantieni valori di default
  }, []);

  // Animazione di digitazione nel terminale
  useEffect(() => {
    let mounted = true;
    let timerId;

    const typeChar = () => {
      if (!mounted) return;
      if (idxRef.current < FLAG_STR.length) {
        setTypedFlag(FLAG_STR.slice(0, idxRef.current + 1));
        idxRef.current++;
        timerId = setTimeout(typeChar, 55 + Math.random() * 45);
      } else {
        timerId = setTimeout(() => {
          if (!mounted) return;
          setCursorVisible(false);
          setShowSuccess(true);
          timerId = setTimeout(() => {
            if (!mounted) return;
            setTypedFlag('');
            setCursorVisible(true);
            setShowSuccess(false);
            idxRef.current = 0;
            timerId = setTimeout(typeChar, 1200);
          }, 3200);
        }, 400);
      }
    };

    timerId = setTimeout(typeChar, 2000);
    return () => {
      mounted = false;
      clearTimeout(timerId);
    };
  }, []);

  const handleRegister = async () => {
    if (!regForm.username || !regForm.email || !regForm.password) {
      setRegError('Tutti i campi sono obbligatori.');
      return;
    }
    setRegLoading(true);
    setRegError('');
    try {
      await authAPI.register(regForm);
      navigate('/login');
    } catch (err) {
      setRegError(err?.response?.data?.error || 'Errore nella registrazione.');
    } finally {
      setRegLoading(false);
    }
  };

  // Scroll fluido verso una sezione della pagina
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <>
      {/* Sfere di luce di sfondo */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <Navbar />

      {/* ── HERO ── */}
      <section className="hero">
        {/* Colonna sinistra */}
        <div className="hero-left">
          <div className="hero-badge">
            <div className="badge-pulse" />
            Piattaforma di cybersecurity educativa
          </div>

          <h1 className="hero-title">
            <span className="plain">Impara.</span>
            <span className="plain">Attacca.</span>
            <span className="grad">Difendi.</span>
          </h1>

          <p className="hero-sub">
            Risolvi sfide CTF reali, scala la leaderboard globale e simula
            incidenti cyber in war room collaborative. La sicurezza si impara facendo.
          </p>

          <div className="hero-cta">
            <button className="btn-cta btn-cta-primary" onClick={() => navigate('/login')}>
              Registrati gratis →
            </button>
            <button className="btn-cta btn-cta-ghost" onClick={() => scrollTo('ctf')}>
              Scopri le sfide
            </button>
          </div>

          <div className="hero-stats">
            <div className="hst">
              <div className="hst-n">{statsData.utenti > 0 ? `${statsData.utenti.toLocaleString('it-IT')}+` : '—'}</div>
              <div className="hst-l">Utenti attivi</div>
            </div>
            <div className="hst">
              <div className="hst-n">{statsData.sfide > 0 ? statsData.sfide : '—'}</div>
              <div className="hst-l">Sfide CTF</div>
            </div>
            <div className="hst">
              <div className="hst-n">{statsData.warroom > 0 ? statsData.warroom : '—'}</div>
              <div className="hst-l">Incidenti IR</div>
            </div>
          </div>
        </div>

        {/* Colonna destra — cards animate */}
        <div className="hero-right">
          <div className="hero-right-inner">

            {/* Card punteggio */}
            <div className="fcard f1">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="fc-lbl">Il tuo punteggio</div>
                  <div className="fc-val" style={{ color: 'var(--violet)' }}>4,280 pts</div>
                </div>
                <div className="fc-badge" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>
                  ↑ Top 5%
                </div>
              </div>
              <div className="fc-bar" style={{ marginTop: '12px' }}>
                <div className="fc-fill" style={{ width: '72%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text3)' }}>0</span>
                <span style={{ fontSize: '10px', color: 'var(--violet)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {'FLAG{4280pts}'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text3)' }}>6000</span>
              </div>
            </div>

            {/* Leaderboard live */}
            <div className="fcard f2">
              <div className="live-label">
                <div className="live-d" />
                Leaderboard live
              </div>
              {topUtenti.length > 0 ? topUtenti.map((u, i) => (
                <div key={u._id ?? i} className="lb-item">
                  <div className="lb-rk">{['🥇','🥈','🥉'][i]}</div>
                  <div className="lb-av" style={{ background: ['var(--fuchsia)','var(--cyan)','var(--mint)'][i] }}>
                    {(u.username || '??').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="lb-nm">{u.username}</div>
                  <div className="lb-pts">{(u.points || 0).toLocaleString('it-IT')}</div>
                </div>
              )) : (
                <>
                  <div className="lb-item">
                    <div className="lb-rk">🥇</div>
                    <div className="lb-av" style={{ background: 'var(--fuchsia)' }}>—</div>
                    <div className="lb-nm">—</div>
                    <div className="lb-pts">—</div>
                  </div>
                  <div className="lb-item">
                    <div className="lb-rk">🥈</div>
                    <div className="lb-av" style={{ background: 'var(--cyan)' }}>—</div>
                    <div className="lb-nm">—</div>
                    <div className="lb-pts">—</div>
                  </div>
                  <div className="lb-item">
                    <div className="lb-rk">🥉</div>
                    <div className="lb-av" style={{ background: 'var(--mint)' }}>—</div>
                    <div className="lb-nm">—</div>
                    <div className="lb-pts">—</div>
                  </div>
                </>
              )}
            </div>

            {/* Allerta war room */}
            <div className="war-card f3">
              <div className="war-pulse" />
              <div className="war-info">
                <div className="war-title-txt">War Room — Ransomware #005</div>
                <div className="war-sub-txt">3 analisti connessi · manager: marco_r</div>
              </div>
              <button className="war-enter" onClick={() => navigate('/warroom')}>Entra →</button>
            </div>

            {/* Notifica flag catturata */}
            <div className="notif-card notif-bar">
              <div className="notif-ico">🚩</div>
              <div>
                <div className="notif-ttl">giulia_b ha catturato "RSA Breaker"</div>
                <div className="notif-stl">+500 pts · Cryptography · Hard · proprio ora</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="grad-line" />

      {/* ── STATS STRIP ── */}
      <div className="stats-strip">
        <div className="ss-item">
          <div className="ss-lbl">Utenti attivi</div>
          <div className="ss-val">{statsData.utenti > 0 ? `${statsData.utenti.toLocaleString('it-IT')}+` : '—'}</div>
          <div className="ss-sub">e crescono ogni giorno</div>
        </div>
        <div className="ss-item">
          <div className="ss-lbl">Sfide CTF</div>
          <div className="ss-val">{statsData.sfide > 0 ? statsData.sfide : '—'}</div>
          <div className="ss-sub">6 categorie · Easy → Hard</div>
        </div>
        <div className="ss-item">
          <div className="ss-lbl">Incidenti IR</div>
          <div className="ss-val">{statsData.warroom > 0 ? statsData.warroom : '—'}</div>
          <div className="ss-sub">ransomware · DDoS · breach</div>
        </div>
      </div>

      {/* ── COME FUNZIONA ── */}
      <div className="how-section" id="how">
        <div className="how-inner">
          <div className="sec-eye"><div className="eye-line" />Come funziona</div>
          <h2 className="sec-title">
            Tre step per diventare<br />un esperto di sicurezza
          </h2>
          <p className="sec-sub">
            Dalla registrazione alla war room — un percorso progettato per crescere con te.
          </p>

          <div className="steps-grid">
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-num-bg">01</div>
              <div className="step-icon" style={{ background: 'var(--violet-bg)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
                </svg>
              </div>
              <div className="step-title">Registrati e scegli il ruolo</div>
              <div className="step-desc">
                Crea il profilo, scegli un username hacker e inizia come Player.
                Zero esperienza richiesta per iniziare.
              </div>
              <div className="step-tag" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>
                <span>✓</span> Player gratuito
              </div>
            </div>

            {/* Step 2 */}
            <div className="step-card">
              <div className="step-num-bg">02</div>
              <div className="step-icon" style={{ background: 'var(--mint-bg)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5a5 5 0 017 0 5 5 0 007 0v9a5 5 0 01-7 0 5 5 0 00-7 0V5z" />
                  <line x1="5" y1="21" x2="5" y2="14" />
                </svg>
              </div>
              <div className="step-title">Risolvi sfide CTF</div>
              <div className="step-desc">
                Affronta crittografia, web exploitation, OSINT e forensics.
                Ogni flag catturata vale punti e sblocca nuovi livelli.
              </div>
              <div className="step-tag" style={{ background: 'var(--mint-bg)', color: 'var(--mint)' }}>
                <span>→</span> 500 pts = Analyst
              </div>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div className="step-num-bg">03</div>
              <div className="step-icon" style={{ background: 'var(--coral-bg)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a12 12 0 008.5 3A12 12 0 0112 21 12 12 0 013.5 6 12 12 0 0012 3" />
                </svg>
              </div>
              <div className="step-title">Entra nella War Room</div>
              <div className="step-desc">
                Diventa Analyst e simula attacchi reali con il team.
                Task board kanban, chat live e timeline eventi progressivi.
              </div>
              <div className="step-tag" style={{ background: 'var(--coral-bg)', color: 'var(--coral)' }}>
                <span>⚡</span> Live con Socket.IO
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grad-line" />

      {/* ── CTF ARENA ── */}
      <div className="ctf-section" id="ctf">
        <div className="ctf-inner">
          <div className="ctf-header">
            <div>
              <div className="sec-eye"><div className="eye-line" />CTF Arena</div>
              <h2 className="sec-title">Le sfide più popolari</h2>
            </div>
            <a className="ctf-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/ctf'); }}>Vedi tutte le sfide →</a>
          </div>

          {/* Podio top 3 */}
          <div className="podium-row">
            {/* 2° posto */}
            <div className="pod-card second">
              <div className="pod-header" style={{ background: 'linear-gradient(135deg,rgba(124,111,234,0.08),transparent)' }}>
                <div className="pod-rank">🥈</div>
                <div className="pod-icon" style={{ background: 'var(--violet-bg)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <circle cx="12" cy="16" r="1" fill="var(--violet)" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                </div>
                <div className="pod-name">RSA Breaker</div>
                <div className="pod-cat">Cryptography · Hard</div>
              </div>
              <div className="pod-footer">
                <span className="pod-pts" style={{ color: 'var(--violet)' }}>+500 pts</span>
                <span className="pod-solved">41 solved</span>
              </div>
            </div>

            {/* 1° posto */}
            <div className="pod-card first">
              <div className="pod-header" style={{ background: 'linear-gradient(135deg,rgba(246,198,82,0.10),transparent)' }}>
                <div className="pod-rank">🥇</div>
                <div className="pod-icon" style={{ background: 'var(--amber-bg)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 7l5 5-5 5M12 19h7" />
                  </svg>
                </div>
                <div className="pod-name">SQL Injection Classic</div>
                <div className="pod-cat">Web Exploit · Medium</div>
              </div>
              <div className="pod-footer">
                <span className="pod-pts" style={{ color: 'var(--amber)' }}>+300 pts</span>
                <span className="pod-solved">127 solved</span>
              </div>
            </div>

            {/* 3° posto */}
            <div className="pod-card third">
              <div className="pod-header" style={{ background: 'linear-gradient(135deg,rgba(91,196,212,0.08),transparent)' }}>
                <div className="pod-rank">🥉</div>
                <div className="pod-icon" style={{ background: 'var(--cyan-bg)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <div className="pod-name">OSINT: Ghost Identity</div>
                <div className="pod-cat">OSINT · Medium</div>
              </div>
              <div className="pod-footer">
                <span className="pod-pts" style={{ color: 'var(--cyan)' }}>+300 pts</span>
                <span className="pod-solved">89 solved</span>
              </div>
            </div>
          </div>

          {/* Griglia categorie */}
          <div className="cat-grid">
            <div className="cat-card">
              <div className="cat-icon-box" style={{ background: 'var(--violet-bg)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <circle cx="12" cy="16" r="1" fill="var(--violet)" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
              </div>
              <div className="cat-name">Cryptography</div>
            </div>
            <div className="cat-card">
              <div className="cat-icon-box" style={{ background: 'var(--fuchsia-bg)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--fuchsia)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 7l5 5-5 5M12 19h7" />
                </svg>
              </div>
              <div className="cat-name">Web Exploit</div>
            </div>
            <div className="cat-card">
              <div className="cat-icon-box" style={{ background: 'var(--cyan-bg)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div className="cat-name">OSINT</div>
            </div>
            <div className="cat-card">
              <div className="cat-icon-box" style={{ background: 'var(--mint-bg)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 9h6M9 12h6M9 15h4" />
                </svg>
              </div>
              <div className="cat-name">Steganography</div>
            </div>
            <div className="cat-card">
              <div className="cat-icon-box" style={{ background: 'var(--amber-bg)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
              <div className="cat-name">Forensics</div>
            </div>
            <div className="cat-card">
              <div className="cat-icon-box" style={{ background: 'var(--coral-bg)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 9V8a3 3 0 016 0v1" />
                  <path d="M8 11a4 4 0 108 0V9H8v2z" />
                  <path d="M12 17v4M8 11H5M19 11h-3" />
                </svg>
              </div>
              <div className="cat-name">Reverse Eng.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEZIONE TERMINALE ── */}
      <div className="term-section">
        <div className="term-inner">
          <div>
            <div className="sec-eye"><div className="eye-line" />Come funziona</div>
            <h2 className="sec-title">Trova la flag.<br />Guadagna punti.</h2>
            <p className="sec-sub" style={{ marginBottom: 0 }}>
              Ogni sfida è un problema reale di sicurezza. Analizza, esplora,
              risolvi — poi sottometti la flag e scala la classifica live.
            </p>
            <div className="term-feats">
              <div className="tf-item">
                <div className="tf-dot" style={{ background: 'var(--violet)' }} />
                380+ sfide in 6 categorie
              </div>
              <div className="tf-item">
                <div className="tf-dot" style={{ background: 'var(--mint)' }} />
                Leaderboard live con Socket.IO
              </div>
              <div className="tf-item">
                <div className="tf-dot" style={{ background: 'var(--amber)' }} />
                Sistema hint a costo di punti
              </div>
              <div className="tf-item">
                <div className="tf-dot" style={{ background: 'var(--fuchsia)' }} />
                Badge e achievement automatici
              </div>
            </div>
          </div>

          {/* Finestra terminale con animazione di digitazione */}
          <div className="terminal-win">
            <div className="term-bar">
              <div className="tbar-dot" style={{ background: '#F07060' }} />
              <div className="tbar-dot" style={{ background: '#F6C652' }} />
              <div className="tbar-dot" style={{ background: '#5CCE8A' }} />
              <div className="tbar-title">cybernexus@ctf ~ bash</div>
            </div>
            <div className="term-body">
              <div>
                <span className="t-p">nexus@ctf:~$</span>{' '}
                <span className="t-c">cn ctf --list --category=web --diff=medium</span>
              </div>
              <div><span className="t-b">✦ 24 sfide trovate · Web Exploitation · Medium</span></div>
              <div><span className="t-d">  {'─'.repeat(40)}</span></div>
              <div><span className="t-g">  [✓] SQL Injection Classic    +300 pts  127 solved</span></div>
              <div><span className="t-y">  [·] XSS Stored Mayhem        +300 pts   89 solved</span></div>
              <div><span className="t-r">  [·] Path Traversal Nightmare +350 pts   41 solved</span></div>
              <div><span className="t-d">  {'─'.repeat(40)}</span></div>
              <div>
                <span className="t-p">nexus@ctf:~$</span>{' '}
                <span className="t-c">cn flag --submit "sql-injection-classic"</span>
              </div>
              <div>
                <span className="t-d">  Enter flag: </span>
                <span className="t-g">{typedFlag}</span>
                {cursorVisible && <span className="t-cur" />}
              </div>
              {showSuccess && (
                <div>
                  <span className="t-g">  ✓ Corretto! +300 pts · Rank: #41 🎉</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grad-line" />

      {/* ── WAR ROOM ── */}
      <div className="wr-section" id="warroom">
        <div className="wr-inner">
          {/* Preview interattiva */}
          <div className="wr-preview">
            <div className="wr-header">
              <div className="wr-pulse-dot" />
              <div className="wr-head-title">Ransomware Attack #005</div>
              <div className="wr-head-badge">⚠ Critical</div>
            </div>

            <div className="wr-body">
              {/* Timeline eventi */}
              <div className="wr-col">
                <div className="wr-col-title">Timeline eventi</div>
                <div className="tl-item">
                  <div className="tl-dot-wrap">
                    <div className="tl-dot" style={{ background: 'var(--coral)' }} />
                    <div className="tl-line" />
                  </div>
                  <div>
                    <div className="tl-text">Cifratura massiva rilevata su server01</div>
                    <div className="tl-time">14:32:01</div>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-dot-wrap">
                    <div className="tl-dot" style={{ background: 'var(--amber)' }} />
                    <div className="tl-line" />
                  </div>
                  <div>
                    <div className="tl-text">Traffico verso IP 185.220.x.x bloccato</div>
                    <div className="tl-time">14:33:47</div>
                  </div>
                </div>
                <div className="tl-item">
                  <div className="tl-dot-wrap">
                    <div className="tl-dot" style={{ background: 'var(--cyan)' }} />
                  </div>
                  <div>
                    <div className="tl-text">Isolamento rete in corso...</div>
                    <div className="tl-time">14:35:12</div>
                  </div>
                </div>
              </div>

              {/* Task in corso */}
              <div className="wr-col">
                <div className="wr-col-title">Task in corso</div>
                <div className="task-item">
                  <div className="tk-av" style={{ background: 'var(--violet)' }}>AL</div>
                  Analisi payload ransomware
                </div>
                <div className="task-item">
                  <div className="tk-av" style={{ background: 'var(--cyan)' }}>MR</div>
                  Blocco connessioni C2
                </div>
                <div className="task-item" style={{ opacity: 0.5 }}>
                  <div className="tk-av" style={{ background: 'var(--mint)' }}>GB</div>
                  ✓ Isolamento server01
                </div>
              </div>
            </div>

            {/* Chat war room */}
            <div className="chat-preview">
              <div className="chat-msg">
                <div className="chat-av" style={{ background: 'var(--violet)' }}>AL</div>
                <div>
                  <div className="chat-name">alex_l</div>
                  <div className="chat-txt">Trovato il vettore — vulnerabilità RDP esposta</div>
                </div>
              </div>
              <div className="chat-msg">
                <div className="chat-av" style={{ background: 'var(--cyan)' }}>MR</div>
                <div>
                  <div className="chat-name">marco_r</div>
                  <div className="chat-txt">Blocco IP C2 attivo, dammi 2 minuti</div>
                </div>
              </div>
              <div className="chat-input-row">
                <input className="chat-input" placeholder="Scrivi nella war room..." />
                <button className="chat-send">Invia</button>
              </div>
            </div>
          </div>

          {/* Testo descrittivo */}
          <div>
            <div className="sec-eye">
              <div className="eye-line" style={{ background: 'var(--coral)' }} />
              <span style={{ color: 'var(--coral)' }}>Incident Response</span>
            </div>
            <h2 className="sec-title">
              La war room<br />è live. Sei dentro?
            </h2>
            <p className="sec-sub" style={{ marginBottom: 0 }}>
              Simula incidenti reali con il tuo team. Timeline eventi progressivi,
              task board kanban e chat real-time — tutto in Socket.IO.
            </p>
            <div className="wr-feature-list">
              <div className="wr-feat">
                <div className="wr-feat-icon" style={{ background: 'var(--coral-bg)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div>
                  <div className="wr-feat-title">Timeline eventi live</div>
                  <div className="wr-feat-desc">
                    Gli eventi dell'attacco emergono progressivamente in tempo reale via Socket.IO
                  </div>
                </div>
              </div>
              <div className="wr-feat">
                <div className="wr-feat-icon" style={{ background: 'var(--violet-bg)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                  </svg>
                </div>
                <div>
                  <div className="wr-feat-title">Task board kanban condivisa</div>
                  <div className="wr-feat-desc">
                    To Do · In corso · Review · Done — aggiornamenti istantanei per tutto il team
                  </div>
                </div>
              </div>
              <div className="wr-feat">
                <div className="wr-feat-icon" style={{ background: 'var(--mint-bg)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <div className="wr-feat-title">Chat war room con typing indicator</div>
                  <div className="wr-feat-desc">
                    Coordinamento real-time con indicatore di scrittura e lista partecipanti attivi
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── REGISTRAZIONE ── */}
      <div className="login-section" id="login">
        <div className="login-inner">
          <div>
            <div className="sec-eye"><div className="eye-line" />Unisciti</div>
            <h2 className="sec-title">
              Inizia il tuo percorso<br />
              <span style={{
                background: 'linear-gradient(135deg,var(--violet),var(--cyan))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                oggi stesso
              </span>
            </h2>
            <p className="sec-sub">
              Registrati gratuitamente e inizia a risolvere sfide in pochi minuti.
              Nessuna carta di credito richiesta.
            </p>
            <div className="login-checks">
              {[
                '380+ sfide CTF disponibili subito',
                'Leaderboard globale in tempo reale',
                'War Room collaborativa live',
                'Badge, achievement e profilo pubblico',
              ].map((testo) => (
                <div className="lc-row" key={testo}>
                  <div className="lc-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="var(--mint)"
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {testo}
                </div>
              ))}
            </div>
          </div>

          {/* Card registrazione */}
          <div className="login-card">
            <div className="login-card-title">Crea il tuo account</div>
            <div className="login-card-sub">
              Hai già un account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Accedi qui</a>
            </div>

            <button className="oauth-btn"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5005'}/api/auth/google`}>
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continua con Google
            </button>

            <button className="oauth-btn"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5005'}/api/auth/github`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--text2)">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              Continua con GitHub
            </button>

            <div className="divider-row">
              <div className="div-line" />
              <div className="div-txt">oppure con email</div>
              <div className="div-line" />
            </div>

            <div className="inp-grp">
              <label className="inp-lbl">Username</label>
              <input className="inp-field" type="text" placeholder="il_tuo_username"
                value={regForm.username} onChange={(e) => setRegForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="inp-grp">
              <label className="inp-lbl">Email</label>
              <input className="inp-field" type="email" placeholder="nome@email.com"
                value={regForm.email} onChange={(e) => setRegForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="inp-grp">
              <label className="inp-lbl">Password</label>
              <input className="inp-field" type="password" placeholder="••••••••"
                value={regForm.password} onChange={(e) => setRegForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            {regError && (
              <div style={{ fontSize: 12, color: 'var(--coral)', padding: '8px 12px', borderRadius: 8, background: 'rgba(240,112,96,.1)', marginBottom: 8 }}>
                {regError}
              </div>
            )}

            <button className="btn-login" onClick={handleRegister} disabled={regLoading}>
              {regLoading ? 'Creazione…' : 'Crea account →'}
            </button>
            <div className="login-note">
              Registrandoti accetti i{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setModalLegale('termini'); }}>Termini</a>
              {' '}e la{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setModalLegale('privacy'); }}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL LEGALE ── */}
      {modalLegale && (
        <div
          onClick={() => setModalLegale(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(7,9,15,.82)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg2,#0d1117)', border: '0.5px solid rgba(255,255,255,.12)',
              borderRadius: 16, maxWidth: 580, width: '100%', maxHeight: '80vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 24px 72px rgba(0,0,0,.5)',
            }}
          >
            <div style={{
              padding: '18px 24px', borderBottom: '0.5px solid rgba(255,255,255,.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, color: '#f0f4ff' }}>
                {modalLegale === 'privacy' ? '🔒 Privacy Policy' : '📋 Termini di Servizio'}
              </div>
              <button onClick={() => setModalLegale(null)} style={{
                width: 28, height: 28, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,.13)',
                background: 'transparent', color: '#8a96b0', cursor: 'pointer', fontSize: 14, lineHeight: 1,
              }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', fontSize: 13, color: '#8a96b0', lineHeight: 1.75 }}>
              {modalLegale === 'privacy' ? (
                /* ── Privacy Policy ── */
                <>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Dati raccolti.</strong>{' '}
                    CyberNexus raccoglie esclusivamente i dati necessari al funzionamento della piattaforma educativa: indirizzo email, username, progressi nelle sfide CTF e punti accumulati. Le password non vengono mai memorizzate in chiaro — viene conservato unicamente l'hash bcrypt.
                  </p>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Utilizzo dei dati.</strong>{' '}
                    I dati sono usati esclusivamente per autenticare l'utente, calcolare la classifica e mostrare i progressi personali. I dati <strong style={{ color: '#f0f4ff' }}>non vengono venduti né ceduti a terzi</strong> in alcuna forma. Non è presente pubblicità né tracciamento a scopo commerciale.
                  </p>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Autenticazione (JWT).</strong>{' '}
                    La piattaforma utilizza token JWT per gestire le sessioni: l'access token ha scadenza di 15 minuti, il refresh token di 7 giorni e viene conservato in <code>localStorage</code>. Non vengono usati cookie di profilazione né tracker di terze parti.
                  </p>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Archiviazione.</strong>{' '}
                    I dati sono archiviati su <strong style={{ color: '#f0f4ff' }}>MongoDB Atlas</strong>, servizio cloud con crittografia a riposo. Non vengono archiviati dati bancari, di pagamento o documenti d'identità — la piattaforma è completamente gratuita.
                  </p>
                  <p style={{ color: '#4a5568', fontSize: 11, marginTop: 18 }}>
                    Ultimo aggiornamento: Giugno 2026 · CyberNexus — Ingegneria Informatica.
                  </p>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#7a8aaa' }}>
                    Per informazioni: <strong style={{ color: '#f0f4ff' }}>info@cybernexus.io</strong>
                  </p>
                </>
              ) : (
                /* ── Termini di servizio ── */
                <>
                  <p style={{ marginBottom: 14 }}>
                    Utilizzando <strong style={{ color: '#f0f4ff' }}>CyberNexus</strong> accetti di impiegare la piattaforma esclusivamente per scopi educativi e di formazione nel campo della cybersecurity. È vietato usare le competenze acquisite per danneggiare sistemi reali o violare la privacy altrui.
                  </p>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Condotta.</strong>{' '}
                    Gli utenti si impegnano a mantenere un comportamento rispettoso all'interno delle War Room e nella community. Comportamenti abusivi, tentativi di cheating o sabotaggio delle sfide comportano la sospensione dell'account.
                  </p>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Contenuti CTF.</strong>{' '}
                    Le sfide CTF sono progettate a scopo didattico. È vietato condividere soluzioni, flag o walkthrough al di fuori della piattaforma, per rispetto degli altri partecipanti.
                  </p>
                  <p style={{ marginBottom: 14 }}>
                    <strong style={{ color: '#f0f4ff' }}>Account e gratuità.</strong>{' '}
                    Ogni utente è responsabile della sicurezza del proprio account. La piattaforma è <strong style={{ color: '#f0f4ff' }}>completamente gratuita</strong> e non prevede pagamenti, abbonamenti o transazioni di alcun tipo.
                  </p>
                  <p style={{ color: '#4a5568', fontSize: 11, marginTop: 18 }}>
                    Ultimo aggiornamento: Giugno 2026 · CyberNexus — Ingegneria Informatica.
                  </p>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#7a8aaa' }}>
                    Per informazioni: <strong style={{ color: '#f0f4ff' }}>info@cybernexus.io</strong>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer>
        <div className="foot-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="lg-foot" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C6FEA" />
                <stop offset="100%" stopColor="#5BC4D4" />
              </linearGradient>
            </defs>
            <path
              d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"
              fill="rgba(124,111,234,0.15)"
              stroke="url(#lg-foot)"
              strokeWidth="1.5"
            />
          </svg>
          CyberNexus
        </div>
        <div className="foot-links">
          <a className="foot-lnk" href="#" onClick={(e) => { e.preventDefault(); setModalLegale('privacy'); }}>Privacy</a>
          <a className="foot-lnk" href="#" onClick={(e) => { e.preventDefault(); setModalLegale('termini'); }}>Termini</a>
          <a className="foot-lnk" href="http://localhost:5005/api/docs" target="_blank" rel="noreferrer">API Swagger</a>
          <a className="foot-lnk" href="http://localhost:5005/api/docs" target="_blank" rel="noreferrer">Swagger</a>
        </div>
        <div className="foot-copy">© 2026 CyberNexus · Ingegneria Informatica</div>
      </footer>
    </>
  );
}
