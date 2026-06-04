import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root{
  --bg:#07090f;--bg2:#0d1117;--bg3:#111825;--bg4:#161d2b;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.13);
  --text1:#f0f4ff;--text2:#7a8aaa;--text3:#3a4a6a;
  --violet:#7C6FEA;--violet-bg:rgba(124,111,234,0.10);
  --fuchsia:#E870B8;--fuchsia-bg:rgba(232,112,184,0.08);
  --cyan:#5BC4D4;--cyan-bg:rgba(91,196,212,0.10);
  --mint:#5CCE8A;--mint-bg:rgba(92,206,138,0.10);
  --amber:#F6C652;--amber-bg:rgba(246,198,82,0.10);
  --coral:#F07060;--coral-bg:rgba(240,112,96,0.10);
}
[data-theme="light"]{
  --bg:#f0f2f8;--bg2:#ffffff;--bg3:#f5f7fc;--bg4:#eaeef8;
  --border:rgba(0,0,0,0.07);--border2:rgba(0,0,0,0.13);
  --text1:#0f1623;--text2:#5a6480;--text3:#9aa3b8;
}

@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-12px) rotate(2deg)}}
@keyframes orbFloat{0%,100%{transform:translate(0,0)}40%{transform:translate(30px,-20px)}70%{transform:translate(-20px,15px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes scanLine{0%{top:0}100%{top:100%}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}

.login-page{
  font-family:'DM Sans',sans-serif;font-size:14px;
  background:var(--bg);color:var(--text1);
  display:flex;height:100vh;overflow:hidden;
}

/* ── LEFT PANEL ─────────────────────────────────────── */
.lp{
  flex:1;min-width:0;
  background:linear-gradient(135deg,#0a0c1a 0%,#0f1128 50%,#0a0d1f 100%);
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;justify-content:center;
  padding:60px 56px;
}
[data-theme="light"] .lp{background:linear-gradient(135deg,#1a1a3a,#0f1128)}
.lp::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(124,111,234,0.06) 1px,transparent 1px),
    linear-gradient(90deg,rgba(124,111,234,0.06) 1px,transparent 1px);
  background-size:48px 48px;
}
.lp-scan{position:absolute;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(124,111,234,.2),transparent);
  pointer-events:none;z-index:1;animation:scanLine 5s linear infinite}
.lp-orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
.lp-orb-1{width:500px;height:500px;background:rgba(124,111,234,0.12);top:-100px;right:-80px;animation:orbFloat 16s ease-in-out infinite}
.lp-orb-2{width:350px;height:350px;background:rgba(232,112,184,0.08);bottom:-80px;left:-60px;animation:orbFloat 12s ease-in-out infinite reverse}
.lp-orb-3{width:200px;height:200px;background:rgba(91,196,212,0.07);top:40%;left:30%;animation:orbFloat 18s ease-in-out 2s infinite}
.lp-content{position:relative;z-index:2;max-width:480px}
.lp-logo{display:flex;align-items:center;gap:10px;margin-bottom:52px}
.lp-logo-txt{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:#fff}
.lp-eyebrow{
  display:inline-flex;align-items:center;gap:7px;
  font-size:11px;font-weight:600;color:var(--violet);
  padding:5px 13px;border-radius:20px;
  background:rgba(124,111,234,.1);border:0.5px solid rgba(124,111,234,.3);
  font-family:'JetBrains Mono',monospace;margin-bottom:20px;letter-spacing:.04em;
}
.lp-ey-dot{width:5px;height:5px;border-radius:50%;background:var(--violet);animation:pulse 2s infinite}
.lp-title{
  font-family:'Syne',sans-serif;font-size:42px;font-weight:800;
  line-height:1.1;letter-spacing:-.02em;color:#fff;margin-bottom:16px;
}
.lp-grad{
  background:linear-gradient(135deg,var(--violet),var(--fuchsia),var(--cyan));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;background-size:200%;animation:shimmer 4s linear infinite;
}
.lp-sub{font-size:15px;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:40px;max-width:380px}
.lp-stats{display:flex;gap:24px;margin-bottom:44px;flex-wrap:wrap}
.lp-stat-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#fff;line-height:1}
.lp-stat-lbl{font-size:11px;color:rgba(255,255,255,.4);font-weight:500}
.lp-stat-sep{width:0.5px;background:rgba(255,255,255,.1);align-self:stretch}
.lp-feats{display:flex;gap:8px;flex-wrap:wrap}
.lp-feat{
  display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:9px;
  background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);
  font-size:12px;color:rgba(255,255,255,.6);font-weight:500;
}
.lp-card{
  position:absolute;bottom:80px;right:60px;width:240px;
  background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);
  border-radius:14px;padding:16px;backdrop-filter:blur(20px);
  animation:float 6s ease-in-out infinite;z-index:2;
}
.lp-card-badge{
  position:absolute;top:-8px;right:12px;
  font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;
  background:var(--violet);color:#fff;
}
.lp-card-title{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
.lp-card-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.lp-card-row:last-child{margin-bottom:0}
.lp-card-av{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0}
.lp-card-name{font-size:11px;color:rgba(255,255,255,.7);flex:1;font-family:'JetBrains Mono',monospace}
.lp-card-pts{font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace}

/* ── RIGHT PANEL ─────────────────────────────────────── */
.rp{
  width:460px;flex-shrink:0;
  background:var(--bg2);border-left:0.5px solid var(--border);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:40px 44px;overflow-y:auto;position:relative;
}
[data-theme="light"] .rp{background:#fff}
.rp::-webkit-scrollbar{width:4px}
.rp::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.rp-top{position:absolute;top:18px;right:18px}
.mode-toggle{
  display:flex;align-items:center;gap:6px;padding:5px 11px 5px 7px;
  border-radius:20px;border:0.5px solid var(--border2);background:var(--bg3);
  cursor:pointer;font-size:12px;color:var(--text2);user-select:none;
}
[data-theme="light"] .mode-toggle{background:var(--bg4)}
.toggle-track{width:26px;height:14px;border-radius:7px;background:var(--violet);position:relative;flex-shrink:0}
.toggle-thumb{position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.5,0,.5,1.4)}
[data-theme="light"] .toggle-thumb{transform:translateX(12px)}
.rp-form{width:100%;max-width:360px;animation:fadeInUp .5s ease both}
.rp-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
.rp-sub{font-size:13px;color:var(--text2);line-height:1.5;margin-bottom:28px}
.auth-tabs{
  display:flex;padding:3px;border-radius:11px;
  background:var(--bg3);border:0.5px solid var(--border);margin-bottom:28px;
}
[data-theme="light"] .auth-tabs{background:var(--bg4)}
.auth-tab{
  flex:1;font-size:13px;font-weight:500;padding:8px;border-radius:8px;
  border:none;background:transparent;color:var(--text2);cursor:pointer;
  transition:all .2s;font-family:'DM Sans',sans-serif;
}
.auth-tab.active{background:var(--bg2);color:var(--text1);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.2)}
[data-theme="light"] .auth-tab.active{background:#fff}
.field-group{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.field-label{
  font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;
  letter-spacing:.05em;font-family:'JetBrains Mono',monospace;
  display:flex;align-items:center;justify-content:space-between;
}
.field-wrap{position:relative}
.field-input{
  width:100%;padding:12px 14px;border-radius:9px;
  border:0.5px solid var(--border2);background:var(--bg3);color:var(--text1);
  font-size:14px;outline:none;transition:all .2s;font-family:'DM Sans',sans-serif;
}
[data-theme="light"] .field-input{background:var(--bg4)}
.field-input:focus{border-color:var(--violet);background:var(--bg);box-shadow:0 0 0 3px rgba(124,111,234,.1)}
[data-theme="light"] .field-input:focus{background:#fff}
.field-input::placeholder{color:var(--text3)}
.field-input.shake{border-color:var(--coral);animation:shake .4s ease}
.field-icon{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  color:var(--text3);cursor:pointer;font-size:16px;
  background:none;border:none;padding:0;line-height:1;transition:color .15s;
}
.field-icon:hover{color:var(--text2)}
.field-hint{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:3px}
.pw-strength{margin-top:6px}
.pw-bars{display:flex;gap:4px;margin-bottom:3px}
.pw-bar{flex:1;height:3px;border-radius:2px;background:var(--border2);transition:all .3s}
.pw-label{font-size:10px;font-family:'JetBrains Mono',monospace}
.forgot-link{font-size:12px;color:var(--violet);cursor:pointer;transition:opacity .15s}
.forgot-link:hover{opacity:.75;text-decoration:underline}
.error-msg{
  font-size:12px;color:var(--coral);padding:9px 12px;border-radius:8px;
  background:var(--coral-bg);border:0.5px solid rgba(240,112,96,.25);
  margin-bottom:14px;line-height:1.5;animation:fadeInUp .3s ease;
}
.submit-btn{
  width:100%;padding:13px;border-radius:10px;border:none;
  background:linear-gradient(135deg,var(--violet),var(--fuchsia));
  color:#fff;font-size:14px;font-weight:700;cursor:pointer;
  font-family:'Syne',sans-serif;letter-spacing:.01em;
  position:relative;overflow:hidden;transition:all .2s;
  display:flex;align-items:center;justify-content:center;gap:8px;
  margin-top:20px;
}
.submit-btn::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
  background-size:200%;animation:shimmer 2.5s linear infinite;
}
.submit-btn > *{position:relative;z-index:1;display:flex;align-items:center;gap:8px}
.submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,111,234,.4)}
.submit-btn:disabled{opacity:.75;cursor:not-allowed}
.btn-spinner{
  width:16px;height:16px;border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;
}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--text3);font-size:12px}
.divider::before,.divider::after{content:'';flex:1;height:0.5px;background:var(--border2)}
.oauth-row{display:flex;gap:8px}
.oauth-btn{
  flex:1;padding:10px;border-radius:9px;border:0.5px solid var(--border2);
  background:var(--bg3);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:7px;
  transition:all .15s;font-family:'DM Sans',sans-serif;
}
[data-theme="light"] .oauth-btn{background:var(--bg4)}
.oauth-btn:hover{color:var(--text1);background:var(--bg2);transform:translateY(-1px)}
[data-theme="light"] .oauth-btn:hover{background:#fff}
.terms-txt{font-size:11px;color:var(--text3);text-align:center;margin-top:20px;line-height:1.6}
.terms-txt a{color:var(--violet);text-decoration:none}
.terms-txt a:hover{text-decoration:underline}
.success-state{text-align:center;animation:fadeInUp .5s ease both;width:100%;max-width:360px}
.success-icon{font-size:52px;display:block;margin-bottom:14px}
.success-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:8px}
.success-sub{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:24px}

@media(max-width:900px){.lp{display:none}.rp{width:100%;border:none;padding:32px 24px}}
@media(max-width:480px){.rp{padding:28px 20px}.rp-title{font-size:22px}.oauth-row{flex-direction:column}}
`;

const PW_COLORS = ['var(--coral)', 'var(--amber)', 'var(--cyan)', 'var(--mint)'];
const PW_LABELS = ['Troppo corta', 'Debole', 'Buona', 'Ottima 🔥'];

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [tab,       setTab]       = useState('login');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [username,  setUsername]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [isReg,     setIsReg]     = useState(false);
  const [error,     setError]     = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [pwScore,   setPwScore]   = useState(0);
  const [shakeKey,  setShakeKey]  = useState({ email: 0, pw: 0 });
  const [theme,     setTheme]     = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const switchTab = (t) => { setTab(t); setError(''); setPwScore(0); };

  const handlePasswordChange = (val) => {
    setPassword(val);
    if (tab !== 'register') return;
    let s = 0;
    if (val.length >= 8)          s++;
    if (/[A-Z]/.test(val))        s++;
    if (/[0-9]/.test(val))        s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setPwScore(s);
  };

  const shake = (field) =>
    setShakeKey(k => ({ ...k, [field]: k[field] + 1 }));

  const handleSubmit = async () => {
    setError('');
    if (!email)    { shake('email'); return; }
    if (!password) { shake('pw');    return; }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else {
        if (!username) { setError('Username obbligatorio.');        setLoading(false); return; }
        if (password !== confirm) { setError('Le password non coincidono.'); setLoading(false); return; }
        await authAPI.register({ username, email, password });
        setIsReg(true);
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        (tab === 'login' ? 'Credenziali non valide.' : 'Errore durante la registrazione.')
      );
    } finally {
      setLoading(false);
    }
  };

  const pwLabelText  = password.length === 0 ? 'Inserisci una password' : (PW_LABELS[pwScore - 1] || 'Troppo corta');
  const pwLabelColor = password.length === 0 ? 'var(--text3)' : (PW_COLORS[pwScore - 1] || 'var(--coral)');

  return (
    <>
      <style>{CSS}</style>
      <div className="login-page">

        {/* ── LEFT PANEL ── */}
        <div className="lp">
          <div className="lp-scan" />
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />

          <div className="lp-content">
            <div className="lp-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="lglg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7C6FEA" />
                    <stop offset="100%" stopColor="#5BC4D4" />
                  </linearGradient>
                </defs>
                <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3"
                  fill="rgba(124,111,234,0.15)" stroke="url(#lglg)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="lp-logo-txt">CyberNexus</span>
            </div>

            <div className="lp-eyebrow">
              <div className="lp-ey-dot" />
              Piattaforma educativa cybersecurity
            </div>

            <h1 className="lp-title">
              Impara hackerando.<br />
              <span className="lp-grad">Diventa un analista.</span>
            </h1>

            <p className="lp-sub">
              Sfide CTF, simulazioni di Incident Response real-time e una comunità di security researcher.
              Tutto in un'unica piattaforma.
            </p>

            <div className="lp-stats">
              <div><div className="lp-stat-val">1.2k+</div><div className="lp-stat-lbl">Analisti attivi</div></div>
              <div className="lp-stat-sep" />
              <div><div className="lp-stat-val">380</div><div className="lp-stat-lbl">Sfide CTF</div></div>
              <div className="lp-stat-sep" />
              <div><div className="lp-stat-val">24</div><div className="lp-stat-lbl">Scenari War Room</div></div>
            </div>

            <div className="lp-feats">
              <div className="lp-feat"><span>⚔️</span>CTF Arena</div>
              <div className="lp-feat"><span>🛡️</span>War Room live</div>
              <div className="lp-feat"><span>🏆</span>Leaderboard real-time</div>
              <div className="lp-feat"><span>🔒</span>JWT + bcrypt</div>
            </div>
          </div>

          <div className="lp-card">
            <div className="lp-card-badge">🏆 Top 3 ora</div>
            <div className="lp-card-title">Classifica live</div>
            <div className="lp-card-row">
              <div className="lp-card-av" style={{background:'linear-gradient(135deg,#E870B8,#F07060)'}}>SK</div>
              <div className="lp-card-name">shadow_k1ng</div>
              <div className="lp-card-pts" style={{color:'#F6C652'}}>8,450</div>
            </div>
            <div className="lp-card-row">
              <div className="lp-card-av" style={{background:'linear-gradient(135deg,#8a9ab4,#6a7a94)'}}>NX</div>
              <div className="lp-card-name">n3x7_g3n</div>
              <div className="lp-card-pts" style={{color:'#b0b8cc'}}>7,200</div>
            </div>
            <div className="lp-card-row">
              <div className="lp-card-av" style={{background:'linear-gradient(135deg,#F6C652,#e89a20)'}}>ZR</div>
              <div className="lp-card-name">z3r0_d4y</div>
              <div className="lp-card-pts" style={{color:'#c87c3a'}}>6,800</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="rp">
          <div className="rp-top">
            <div className="mode-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              <div className="toggle-track"><div className="toggle-thumb" /></div>
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </div>
          </div>

          {!success ? (
            <div className="rp-form">
              <div className="rp-title">{tab === 'login' ? 'Bentornato 👋' : 'Crea account'}</div>
              <div className="rp-sub">
                {tab === 'login'
                  ? 'Accedi al tuo account CyberNexus per continuare.'
                  : 'Unisciti a 1.200+ analisti su CyberNexus.'}
              </div>

              <div className="auth-tabs">
                <button className={`auth-tab${tab === 'login' ? ' active' : ''}`}    onClick={() => switchTab('login')}>Accedi</button>
                <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>Registrati</button>
              </div>

              {/* Email */}
              <div className="field-group">
                <label className="field-label">Email</label>
                <div className="field-wrap">
                  <input
                    key={`email-${shakeKey.email}`}
                    className={`field-input${shakeKey.email > 0 ? ' shake' : ''}`}
                    type="email"
                    placeholder="nome@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Username pubblico — solo register */}
              {tab === 'register' && (
                <div className="field-group">
                  <label className="field-label">Username (pubblico)</label>
                  <div className="field-wrap">
                    <input
                      className="field-input"
                      type="text"
                      placeholder="es. cyber_hunter_99"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      style={{paddingRight: username.length > 3 ? '40px' : '14px'}}
                    />
                    {username.length > 3 && (
                      <span className="field-icon" style={{color:'var(--mint)',pointerEvents:'none'}}>✓</span>
                    )}
                  </div>
                  <div className="field-hint">Sarà visibile in classifica e War Room</div>
                </div>
              )}

              {/* Password */}
              <div className="field-group">
                <label className="field-label">
                  Password
                  {tab === 'login' && <span className="forgot-link" onClick={() => setError('Funzionalità non ancora disponibile')}>Hai dimenticato?</span>}
                </label>
                <div className="field-wrap">
                  <input
                    key={`pw-${shakeKey.pw}`}
                    className={`field-input${shakeKey.pw > 0 ? ' shake' : ''}`}
                    type={pwVisible ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => handlePasswordChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    style={{paddingRight: '40px'}}
                  />
                  <button className="field-icon" onClick={() => setPwVisible(v => !v)} tabIndex={-1}>
                    {pwVisible ? '🙈' : '👁️'}
                  </button>
                </div>
                {tab === 'register' && (
                  <div className="pw-strength">
                    <div className="pw-bars">
                      {[0,1,2,3].map(i => (
                        <div key={i} className="pw-bar" style={{
                          background: i < pwScore ? PW_COLORS[pwScore - 1] : 'var(--border2)',
                          transform:  i < pwScore ? 'scaleY(1.3)' : 'scaleY(1)',
                        }} />
                      ))}
                    </div>
                    <div className="pw-label" style={{color: pwLabelColor}}>{pwLabelText}</div>
                  </div>
                )}
              </div>

              {/* Conferma password — solo register */}
              {tab === 'register' && (
                <div className="field-group">
                  <label className="field-label">Conferma password</label>
                  <div className="field-wrap">
                    <input
                      className="field-input"
                      type="password"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                </div>
              )}

              {/* Messaggio di errore API */}
              {error && <div className="error-msg">{error}</div>}

              <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <div className="btn-spinner" />
                ) : (
                  <>
                    {tab === 'login' ? 'Accedi' : 'Crea account'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>

              <div className="divider">oppure continua con</div>
              <div className="oauth-row">
                <button className="oauth-btn" onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5005'}/api/auth/github`; }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--text2)">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  GitHub
                </button>
                <button className="oauth-btn" onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5005'}/api/auth/google`; }}>
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </div>

              <div className="terms-txt">
                {tab === 'login'
                  ? <><>Accedendo accetti i nostri </><a href="#">Termini di servizio</a><> e la </><a href="#">Privacy Policy</a>.</>
                  : <><>Registrandoti accetti i </><a href="#">Termini</a><> e la </><a href="#">Privacy Policy</a></>
                }
              </div>
            </div>
          ) : (
            <div className="success-state">
              <span className="success-icon">🏆</span>
              <div className="success-title">{isReg ? 'Account creato! 🎉' : 'Accesso effettuato!'}</div>
              <div className="success-sub">
                {isReg
                  ? 'Il tuo account CyberNexus è pronto. Inizia con le prime sfide CTF!'
                  : 'Bentornato su CyberNexus. Reindirizzamento alla dashboard...'}
              </div>
              <button className="submit-btn" onClick={() => navigate('/dashboard')}
                style={{maxWidth: '260px', margin: '0 auto'}}>
                Vai alla dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
