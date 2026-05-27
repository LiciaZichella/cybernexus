import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, challengesAPI } from '../services/api';

/* ─── Counter ─────────────────────────────────────────────────────────────── */
function Counter({ target = 0, style, delay = 400 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setTimeout(() => {
      const dur = 1500, t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        setVal(Math.floor(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
        else setVal(target);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(id);
  }, [target, delay]);
  return <span style={style}>{val.toLocaleString('it-IT')}</span>;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function getInitials(name = '') {
  return (name.replace(/_/g, ' ').trim().slice(0, 2) || 'US').toUpperCase();
}

function getRankInfo(pts = 0) {
  const tiers = [
    { r: 'Analyst', max: 500 },
    { r: 'Manager', max: 1000 },
    { r: 'Admin', max: 2000 },
  ];
  for (let i = 0; i < tiers.length; i++) {
    if (pts < tiers[i].max) {
      const prev = tiers[i - 1]?.max || 0;
      return {
        next: tiers[i].r,
        pct: Math.min(Math.round(((pts - prev) / (tiers[i].max - prev)) * 100), 100),
        remaining: tiers[i].max - pts,
        max: tiers[i].max,
      };
    }
  }
  return { next: null, pct: 100, remaining: 0, max: pts };
}

function genHeatmap() {
  const c = [
    'var(--border2)',
    'rgba(124,111,234,0.18)',
    'rgba(124,111,234,0.35)',
    'rgba(124,111,234,0.6)',
    'var(--violet)',
  ];
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    bg: c[Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 5)],
    delay: `${(i * 0.008).toFixed(3)}s`,
  }));
}

/* ─── Static data ─────────────────────────────────────────────────────────── */
const NOTIF_TPL = [
  { icon: '🚩', title: '<strong>marco_r</strong> ha catturato XSS Mayhem', sub: '+300 pts · Web Exploit', cls: 'mint' },
  { icon: '🏆', title: '<strong>giulia_b</strong> ha sbloccato Top 50',    sub: 'Achievement raro',       cls: 'amber' },
  { icon: '🚨', title: 'Nuova War Room aperta',                             sub: 'DDoS Drill #013',        cls: 'coral' },
  { icon: '⬆️', title: '<strong>n3x7_g3n</strong> sale al rank #2',        sub: '7,200 pts',              cls: 'violet' },
];

const WEEK_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const BAR_H       = [35, 55, 42, 70, 58, 80, 95];

const CAT_BARS = [
  { name: 'Cryptography',  c: 'var(--violet)',  pct: 35, w: '100%' },
  { name: 'Web Exploit',   c: 'var(--fuchsia)', pct: 25, w: '71%'  },
  { name: 'OSINT',         c: 'var(--cyan)',    pct: 20, w: '57%'  },
  { name: 'Steganography', c: 'var(--mint)',    pct: 12, w: '34%'  },
  { name: 'Forensics',     c: 'var(--amber)',   pct:  8, w: '23%'  },
];

const CAT_STYLE = {
  Cryptography:  { bg: 'var(--violet-bg)',  c: 'var(--violet)'  },
  Web:           { bg: 'var(--fuchsia-bg)', c: 'var(--fuchsia)' },
  Forensics:     { bg: 'var(--cyan-bg)',    c: 'var(--cyan)'    },
  OSINT:         { bg: 'var(--mint-bg)',    c: 'var(--mint)'    },
  Steganography: { bg: 'var(--amber-bg)',   c: 'var(--amber)'   },
  Reverse:       { bg: 'var(--coral-bg)',   c: 'var(--coral)'   },
};
const DIFF_STYLE = {
  Easy:   { bg: 'var(--mint-bg)',  c: 'var(--mint)'  },
  Medium: { bg: 'var(--amber-bg)', c: 'var(--amber)' },
  Hard:   { bg: 'var(--coral-bg)', c: 'var(--coral)' },
};

const STATIC_SMALL = [
  { _id: 's1', title: 'XSS Stored',       category: 'Web',          difficulty: 'Medium', points: 300 },
  { _id: 's2', title: 'Buffer Overflow',  category: 'Reverse',      difficulty: 'Hard',   points: 500 },
  { _id: 's3', title: 'Hidden Pixels',    category: 'Steganography',difficulty: 'Easy',   points: 200 },
  { _id: 's4', title: 'Ghost Identity',   category: 'OSINT',        difficulty: 'Medium', points: 300 },
];

const WARROOMS_DATA = [
  { id:1, title:'Ransomware Attack #005',     type:'Enterprise Breach',    sev:'Critical', sc:'coral', dc:'var(--coral)',  pp:[{i:'AL',c:'var(--violet)'},{i:'MR',c:'var(--cyan)'},{i:'GB',c:'var(--mint)'}] },
  { id:2, title:'DDoS Mitigation Drill #012', type:'Infrastructure Attack',sev:'High',    sc:'amber', dc:'var(--amber)',  pp:[{i:'SK',c:'var(--fuchsia)'},{i:'ZR',c:'var(--amber)'}] },
  { id:3, title:'Phishing Campaign #008',     type:'Email Security',       sev:'Medium',  sc:'cyan',  dc:'var(--cyan)',   pp:[{i:'GB',c:'var(--violet)'}] },
];

const ACTIVITY_ITEMS = [
  { icon:'🚩', bg:'var(--mint-bg)',    html:'<strong>giulia_b</strong> ha catturato RSA Breaker',           time:'2 min · +500 pts'    },
  { icon:'🚨', bg:'var(--coral-bg)',   html:'<strong>marco_r</strong> ha aperto WR #005',                   time:'15 min · Ransomware' },
  { icon:'⬆️', bg:'var(--violet-bg)', html:'<strong>Tu</strong> sei salito al <strong>#42</strong>',        time:'1h · +3 posizioni'   },
  { icon:'🔥', bg:'var(--amber-bg)',   html:'<strong>Tu</strong> hai sbloccato <strong>Streak 7</strong>',  time:'3h fa'               },
  { icon:'🚩', bg:'var(--mint-bg)',    html:'<strong>shadow_k1ng</strong> ha catturato 3 flag',              time:'5h · +1,200 pts'     },
  { icon:'🔍', bg:'var(--fuchsia-bg)',html:'<strong>n3x7_g3n</strong> ha risolto Ghost Identity',           time:'6h · +300 pts'       },
];

const BADGES_DATA = [
  { icon:'🔥', name:'First Blood',  st:'unlocked', bg:'var(--amber-bg)',   fc:'var(--mint)',    pct:100, lbl:''        },
  { icon:'🔐', name:'Cryptolord',   st:'unlocked', bg:'var(--violet-bg)',  fc:'var(--mint)',    pct:100, lbl:''        },
  { icon:'⚡', name:'Streak 7',     st:'unlocked', bg:'var(--mint-bg)',    fc:'var(--mint)',    pct:100, lbl:''        },
  { icon:'🔍', name:'OSINT Pro',    st:'unlocked', bg:'var(--cyan-bg)',    fc:'var(--mint)',    pct:100, lbl:''        },
  { icon:'🚨', name:'War Hero',     st:'locked',   bg:'var(--coral-bg)',   fc:'var(--coral)',   pct: 40, lbl:'2/5'     },
  { icon:'🎯', name:'Analyst',      st:'locked',   bg:'var(--amber-bg)',   fc:'var(--amber)',   pct: 56, lbl:'280/500' },
  { icon:'📊', name:'Top 10',       st:'locked',   bg:'var(--fuchsia-bg)',fc:'var(--fuchsia)', pct: 25, lbl:'#42→#10' },
  { icon:'🔒', name:'???',          st:'locked',   bg:'var(--border2)',    fc:'transparent',    pct:  0, lbl:'?'       },
];

const TOP_LB = [
  { rank:'🥇', i:'SK', name:'shadow_k1ng', pts:8450, c:'var(--fuchsia)' },
  { rank:'🥈', i:'NX', name:'n3x7_g3n',    pts:7200, c:'var(--cyan)'    },
  { rank:'🥉', i:'ZR', name:'z3r0_d4y',    pts:6800, c:'var(--mint)'    },
];

/* ─── Challenge icon by category ─────────────────────────────────────────── */
function ChIcon({ category, color, size = 15 }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (category) {
    case 'Web':          return <svg {...s}><path d="M5 7l5 5-5 5M12 19h7"/></svg>;
    case 'Reverse':      return <svg {...s}><path d="M9 9V8a3 3 0 016 0v1"/><path d="M8 11a4 4 0 108 0V9H8v2z"/></svg>;
    case 'Steganography':return <svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
    case 'OSINT':
    case 'Forensics':    return <svg {...s}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>;
    default:             return <svg {...s}><rect x="5" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="16" r="1" fill={color}/><path d="M8 11V7a4 4 0 018 0v4"/></svg>;
  }
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
:root{
  --bg:#111827;--bg2:#1a2235;--bg3:#1e2a3a;--bg4:#212d40;
  --border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.13);
  --text1:#f0f4ff;--text2:#8a96b0;--text3:#4a5568;
  --violet:#7C6FEA;--violet-bg:rgba(124,111,234,0.10);
  --fuchsia:#E870B8;--fuchsia-bg:rgba(232,112,184,0.10);
  --cyan:#5BC4D4;--cyan-bg:rgba(91,196,212,0.10);
  --mint:#5CCE8A;--mint-bg:rgba(92,206,138,0.10);
  --amber:#F6C652;--amber-bg:rgba(246,198,82,0.10);
  --coral:#F07060;--coral-bg:rgba(240,112,96,0.10);
  --shadow:rgba(0,0,0,0.3);--grid:rgba(255,255,255,0.025);
  --r8:8px;--r12:12px;--r14:14px;--r20:20px;
}
[data-theme="light"]{
  --bg:#f8f9fc;--bg2:#ffffff;--bg3:#f1f3f8;--bg4:#e8ebf2;
  --border:rgba(0,0,0,0.07);--border2:rgba(0,0,0,0.12);
  --text1:#0f1623;--text2:#5a6480;--text3:#9aa3b8;
  --violet-bg:rgba(124,111,234,0.08);--fuchsia-bg:rgba(232,112,184,0.08);
  --cyan-bg:rgba(91,196,212,0.08);--mint-bg:rgba(92,206,138,0.08);
  --amber-bg:rgba(246,198,82,0.10);--coral-bg:rgba(240,112,96,0.08);
  --shadow:rgba(0,0,0,0.07);--grid:rgba(0,0,0,0.035);
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text1);min-height:100vh;transition:background .3s,color .3s;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:40px 40px}
.orb{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none;z-index:0;transition:opacity .5s}
.orb-1{width:500px;height:500px;background:rgba(124,111,234,0.08);top:-100px;right:-100px;animation:orbMove 20s ease-in-out infinite}
.orb-2{width:300px;height:300px;background:rgba(91,196,212,0.06);bottom:100px;left:-50px;animation:orbMove 15s ease-in-out infinite reverse}
@keyframes orbMove{0%,100%{transform:translate(0,0)}33%{transform:translate(40px,-30px)}66%{transform:translate(-30px,20px)}}
[data-theme="light"] .orb{opacity:0}
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideInTop{from{opacity:0;transform:translate(120%,-10px)}to{opacity:1;transform:translate(0,0)}}
@keyframes slideOutTop{to{opacity:0;transform:translate(120%,-10px)}}
@keyframes fillBarUp{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes fillCat{to{width:var(--w)}}
.animate-in{opacity:0;animation:fadeInUp .6s ease forwards}
.delay-1{animation-delay:.1s}.delay-2{animation-delay:.2s}.delay-3{animation-delay:.3s}
.delay-4{animation-delay:.4s}.delay-5{animation-delay:.5s}.delay-6{animation-delay:.6s}

/* NAVBAR */
.navbar{position:fixed;top:0;left:0;right:0;z-index:500;height:58px;padding:0 32px;display:flex;align-items:center;background:rgba(17,24,39,0.9);backdrop-filter:blur(20px);border-bottom:0.5px solid var(--border);transition:background .3s;animation:fadeInUp .5s ease both}
[data-theme="light"] .navbar{background:rgba(248,249,252,0.95)}
.nav-logo{display:flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text1);text-decoration:none;margin-right:32px;transition:transform .2s}
.nav-logo:hover{transform:translateY(-1px)}
.nav-items{display:flex;gap:2px;flex:1}
.nav-item{font-size:13px;color:var(--text2);padding:6px 13px;border-radius:var(--r8);cursor:pointer;transition:all .15s;text-decoration:none;display:flex;align-items:center;gap:6px}
.nav-item:hover{color:var(--text1);background:rgba(255,255,255,0.05)}
[data-theme="light"] .nav-item:hover{background:rgba(0,0,0,0.04)}
.nav-item.active{color:var(--violet);background:var(--violet-bg);font-weight:500}
.nav-right{display:flex;align-items:center;gap:8px;margin-left:auto}
.notif-btn{position:relative;width:34px;height:34px;border-radius:var(--r8);border:0.5px solid var(--border2);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
.notif-btn:hover{background:var(--bg3);transform:translateY(-1px)}
.notif-dot{position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--coral);border:1.5px solid var(--bg);animation:pulse 2s infinite}
.nav-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--violet),var(--fuchsia));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;cursor:pointer;flex-shrink:0;transition:transform .2s}
.nav-avatar:hover{transform:scale(1.08)}
.mode-toggle{display:flex;align-items:center;gap:6px;padding:5px 11px 5px 7px;border-radius:30px;border:0.5px solid var(--border2);background:var(--bg2);cursor:pointer;font-size:12px;font-weight:500;color:var(--text2);transition:all .2s;user-select:none}
.mode-toggle:hover{background:var(--bg3)}
.toggle-track{width:26px;height:15px;border-radius:8px;background:var(--violet);position:relative;flex-shrink:0;transition:background .3s}
.toggle-thumb{position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.5,0,.5,1.4)}
[data-theme="light"] .toggle-thumb{transform:translateX(11px)}
.burger{display:none;width:34px;height:34px;border-radius:var(--r8);border:0.5px solid var(--border2);background:var(--bg2);align-items:center;justify-content:center;cursor:pointer;flex-direction:column;gap:3px;padding:0}
.burger span{width:14px;height:1.5px;background:var(--text2);border-radius:1px}

/* PAGE */
.page{padding-top:58px;min-height:100vh;max-width:1280px;margin:0 auto;padding-left:32px;padding-right:32px;padding-bottom:60px;position:relative;z-index:1}
.grad-strip{height:2px;background:linear-gradient(90deg,var(--violet),var(--fuchsia),var(--cyan),var(--mint),var(--amber));position:fixed;top:58px;left:0;right:0;z-index:499}

/* ROW 1 */
.row-1{display:grid;grid-template-columns:1fr 280px;gap:14px;margin-top:32px;margin-bottom:14px}
.welcome{background:linear-gradient(135deg,var(--violet-bg) 0%,var(--cyan-bg) 100%);border:0.5px solid var(--border2);border-radius:var(--r14);padding:24px 28px;position:relative;overflow:hidden}
.welcome::before{content:'';position:absolute;top:-50px;right:-50px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,var(--violet-bg) 0%,transparent 70%);animation:float 6s ease-in-out infinite}
.welcome::after{content:'';position:absolute;bottom:-80px;left:30%;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,var(--cyan-bg) 0%,transparent 70%);animation:float 7s ease-in-out infinite reverse}
.welcome-content{position:relative;z-index:1}
.welcome-greet{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--mint);padding:4px 12px;border-radius:20px;background:var(--mint-bg);border:0.5px solid rgba(92,206,138,0.25);margin-bottom:12px}
.greet-dot{width:5px;height:5px;border-radius:50%;background:var(--mint);animation:pulse 2s infinite}
.welcome-title{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;margin-bottom:8px;letter-spacing:-.02em}
.welcome-name{background:linear-gradient(135deg,var(--violet),var(--fuchsia),var(--cyan));background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite}
.welcome-msg{font-size:13px;color:var(--text2);line-height:1.7}
.welcome-msg strong{color:var(--text1);font-weight:600}
.welcome-progress{margin-top:16px;max-width:520px}
.wp-row{display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:8px}
.wp-strong{color:var(--violet);font-weight:600}
.wp-bar{height:8px;border-radius:5px;background:var(--border2);overflow:hidden;position:relative}
.wp-fill{height:8px;border-radius:5px;background:linear-gradient(90deg,var(--violet) 0%,var(--fuchsia) 25%,var(--cyan) 50%,var(--mint) 75%,var(--violet) 100%);background-size:200% 100%;animation:shimmer 2s linear infinite;position:relative}

/* HEATMAP */
.heatmap-mini{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r14);padding:16px;display:flex;flex-direction:column;transition:border-color .2s}
.heatmap-mini:hover{border-color:var(--border2)}
.hm-mini-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.hm-mini-title{font-family:'Syne',sans-serif;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
.hm-mini-streak{font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;background:linear-gradient(135deg,var(--amber-bg),var(--coral-bg));color:var(--amber);border:0.5px solid rgba(246,198,82,.25);display:flex;align-items:center;gap:4px}
.hm-mini-emoji{font-size:10px;animation:float 2s ease-in-out infinite}
.heatmap-mini-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;flex:1;align-content:start}
.hm-mini-cell{aspect-ratio:1;border-radius:2px;transition:transform .15s;cursor:pointer}
.hm-mini-cell:hover{transform:scale(1.5);z-index:1;position:relative}
.hm-mini-info{font-size:10px;color:var(--text3);margin-top:8px;display:flex;justify-content:space-between}
.hm-mini-info strong{color:var(--violet);font-weight:600}

/* STAT CARDS */
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
.stat-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r14);padding:16px 18px;transition:all .3s;cursor:default;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:currentColor;opacity:0;transition:opacity .3s}
.stat-card:hover{border-color:var(--border2);transform:translateY(-3px);box-shadow:0 12px 24px var(--shadow)}
.stat-card:hover::before{opacity:.6}
.sc-row{display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.sc-left{flex:1;min-width:0}
.stat-lbl{font-size:11px;color:var(--text2);margin-bottom:5px;display:flex;align-items:center;gap:5px}
.stat-ico{width:13px;height:13px;flex-shrink:0}
.stat-val{font-family:'Syne',sans-serif;font-size:24px;font-weight:700;line-height:1;margin-bottom:7px;letter-spacing:-.01em}
.stat-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:8px}
.sc-spark{width:54px;height:28px;flex-shrink:0}

/* CHARTS ROW */
.mid-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.chart-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r14);padding:18px 20px;transition:border-color .2s}
.chart-card:hover{border-color:var(--border2)}
.card-title-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.card-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:600}
.card-sub{font-size:11px;color:var(--text3)}
.chart-filter{display:flex;gap:3px}
.cf-btn-filter{font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;border:0.5px solid var(--border);background:transparent;color:var(--text3);transition:all .15s;font-family:'DM Sans',sans-serif}
.cf-btn-filter.active{background:var(--violet-bg);color:var(--violet);border-color:rgba(124,111,234,.3)}
.bar-chart{display:flex;align-items:flex-end;gap:5px;height:80px;margin-top:8px}
.bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.bar{width:100%;border-radius:4px 4px 0 0;background:var(--violet-bg);border:0.5px solid rgba(124,111,234,.3);cursor:pointer;transition:filter .2s;animation:fillBarUp 1s ease both;transform-origin:bottom}
.bar:hover{filter:brightness(1.3)}
.bar.today{background:linear-gradient(to top,var(--violet),rgba(124,111,234,.4));border-color:rgba(124,111,234,.5);position:relative;overflow:hidden}
.bar.today::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(255,255,255,0.2),transparent);background-size:100% 200%;animation:shimmer 2s linear infinite}
.bar-label{font-size:9px;color:var(--text3);font-family:'JetBrains Mono',monospace}
.cat-card-content{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center}
.donut-svg{flex-shrink:0;animation:scaleIn .8s .3s ease both}
.cat-bars{display:flex;flex-direction:column;gap:8px;min-width:0}
.cat-bar-row{display:flex;align-items:center;gap:8px}
.cat-bar-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.cat-bar-name{font-size:11px;color:var(--text2);min-width:80px}
.cat-bar-track{flex:1;height:5px;border-radius:3px;background:var(--border2);overflow:hidden}
.cat-bar-fill{height:5px;border-radius:3px;width:0;animation:fillCat 1.2s .5s ease forwards}
.cat-bar-pct{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;min-width:30px;text-align:right}

/* CHALLENGES */
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;margin-top:8px}
.section-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px}
.view-all{font-size:12px;color:var(--violet);text-decoration:none;font-weight:500;transition:gap .15s;display:inline-flex;align-items:center;gap:3px}
.view-all:hover{gap:6px}
.ch-featured{background:linear-gradient(135deg,var(--violet-bg),var(--fuchsia-bg));border:0.5px solid rgba(124,111,234,.25);border-radius:var(--r14);padding:20px 22px;margin-bottom:10px;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s;cursor:pointer}
.ch-featured:hover{transform:translateY(-3px);box-shadow:0 12px 28px var(--shadow)}
.ch-featured::before{content:'';position:absolute;top:-30px;right:-30px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,var(--violet-bg) 0%,transparent 70%);animation:float 5s ease-in-out infinite}
.cf-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--violet),var(--fuchsia));color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:1;box-shadow:0 8px 20px rgba(124,111,234,.3)}
.cf-info{flex:1;position:relative;z-index:1;min-width:0}
.cf-eyebrow{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--violet);margin-bottom:6px}
.cf-name{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;margin-bottom:3px}
.cf-desc{font-size:12px;color:var(--text2);line-height:1.5}
.cf-meta{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.cf-tag{font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px}
.cf-action{position:relative;z-index:1;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;padding:9px 18px;border-radius:10px;cursor:pointer;flex-shrink:0;background:linear-gradient(135deg,var(--violet),var(--fuchsia));color:#fff;border:none;box-shadow:0 4px 12px rgba(124,111,234,.3);transition:all .2s;display:flex;align-items:center;gap:6px}
.cf-action:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(124,111,234,.4)}
.ch-small-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.ch-small{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r12);padding:12px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .2s}
.ch-small:hover{border-color:var(--border2);transform:translateY(-2px)}
.chs-ico{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.chs-info{flex:1;min-width:0}
.chs-name{font-size:12px;font-weight:500;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chs-meta{font-size:10px;color:var(--text3)}
.chs-pts{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;flex-shrink:0}

/* WAR ROOM + FEED */
.big-row{display:grid;grid-template-columns:1fr 320px;gap:14px;margin-bottom:24px}
.inc-list{display:flex;flex-direction:column;gap:8px}
.incident-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r12);padding:14px 16px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.incident-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--coral);transition:width .2s}
.incident-card.high::before{background:var(--amber)}
.incident-card.medium::before{background:var(--cyan)}
.incident-card:hover{border-color:var(--border2);transform:translateX(3px)}
.incident-card:hover::before{width:5px}
.inc-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.inc-dot{width:7px;height:7px;border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}
.inc-title{font-size:13px;font-weight:500;flex:1}
.inc-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:8px;flex-shrink:0}
.inc-meta{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:10px}
.inc-participants{display:flex;margin-left:auto}
.part-av{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff;border:1.5px solid var(--bg2);margin-left:-4px;flex-shrink:0}
.feed-side{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r14);padding:16px 18px;display:flex;flex-direction:column}
.feed-side-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.live-tag{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mint);font-weight:500}
.live-tag-dot{width:5px;height:5px;border-radius:50%;background:var(--mint);animation:pulse 2s infinite}
.activity-feed{display:flex;flex-direction:column;gap:0;flex:1;overflow-y:auto}
.activity-feed::-webkit-scrollbar{width:3px}
.activity-feed::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.activity-item{display:flex;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border)}
.activity-item:last-child{border:none}
.act-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.act-content{flex:1;min-width:0}
.act-text{font-size:12px;color:var(--text2);line-height:1.4}
.act-text strong{color:var(--text1);font-weight:500}
.act-time{font-size:10px;color:var(--text3);margin-top:2px;font-family:'JetBrains Mono',monospace}

/* BADGES */
.badge-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}
.badge-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r12);padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:all .2s;position:relative}
.badge-card:hover{transform:translateY(-4px);border-color:var(--border2);box-shadow:0 8px 20px var(--shadow)}
.badge-card.unlocked{background:linear-gradient(135deg,var(--mint-bg),var(--bg2));border-color:rgba(92,206,138,.25)}
.bc-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;transition:transform .3s}
.badge-card:hover .bc-icon{transform:scale(1.15) rotate(-5deg)}
.bc-name{font-size:10px;color:var(--text2);text-align:center;font-weight:500;line-height:1.2}
.badge-card.unlocked .bc-name{color:var(--mint)}
.bc-progress{width:100%;height:3px;border-radius:2px;background:var(--border2);overflow:hidden}
.bc-fill{height:3px;border-radius:2px;transition:width 1.2s ease;position:relative;overflow:hidden}
.bc-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);background-size:200% 100%;animation:shimmer 2s linear infinite}
.bc-pct{font-size:9px;color:var(--text3);font-family:'JetBrains Mono',monospace}
.badge-card.locked .bc-icon{opacity:.5}
.badge-card.locked .bc-name{opacity:.5}
.unlocked-check{position:absolute;top:6px;right:6px;width:16px;height:16px;border-radius:50%;background:var(--mint);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700}

/* ADMIN */
.admin-pill{font-size:11px;font-weight:600;padding:5px 11px;border-radius:var(--r8);background:var(--coral-bg);color:var(--coral);border:0.5px solid rgba(240,112,96,.3);text-decoration:none;transition:all .2s;display:flex;align-items:center;gap:5px;white-space:nowrap}
.admin-pill:hover{background:rgba(240,112,96,.18);transform:translateY(-1px)}
.admin-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(135deg,rgba(240,112,96,.07),rgba(246,198,82,.05));border:0.5px solid rgba(240,112,96,.2);border-radius:var(--r12);padding:12px 18px;margin-bottom:14px}
.ab-left{display:flex;align-items:center;gap:12px}
.ab-icon{width:36px;height:36px;border-radius:9px;background:var(--coral-bg);border:0.5px solid rgba(240,112,96,.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ab-title{font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:var(--text1);margin-bottom:2px}
.ab-sub{font-size:11px;color:var(--text3)}
.ab-btn{font-size:12px;font-weight:600;padding:8px 16px;border-radius:var(--r8);background:var(--coral-bg);color:var(--coral);border:0.5px solid rgba(240,112,96,.3);text-decoration:none;transition:all .2s;white-space:nowrap;flex-shrink:0}
.ab-btn:hover{background:rgba(240,112,96,.18);transform:translateY(-1px)}

/* LEADERBOARD */
.lb-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r14);padding:18px 20px;margin-bottom:24px}
.lb-mini{display:flex;flex-direction:column;gap:6px}
.lbm-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r8);background:var(--bg3);border:0.5px solid var(--border);transition:all .2s;cursor:pointer}
.lbm-row:hover{border-color:var(--border2);transform:translateX(3px)}
.lbm-row.me{border-color:var(--violet);background:var(--violet-bg)}
.lbm-rank{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text3);width:22px}
.lbm-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.lbm-name{font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lbm-pts{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;flex-shrink:0}

/* LIVE NOTIFICATIONS */
.live-notifs{position:fixed;top:74px;right:20px;z-index:600;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:300px}
.live-notif{background:var(--bg2);border:0.5px solid var(--border2);border-radius:var(--r12);padding:11px 13px;display:flex;align-items:center;gap:10px;box-shadow:0 12px 32px var(--shadow);animation:slideInTop .4s ease both;position:relative;overflow:hidden}
.live-notif.exiting{animation:slideOutTop .4s ease forwards}
.live-notif::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--mint)}
.live-notif.coral::before{background:var(--coral)}
.live-notif.violet::before{background:var(--violet)}
.live-notif.amber::before{background:var(--amber)}
.ln-icon{font-size:17px;flex-shrink:0}
.ln-content{flex:1;min-width:0}
.ln-title{font-size:12px;font-weight:500;color:var(--text1)}
.ln-sub{font-size:10px;color:var(--text3);margin-top:2px}

/* RESPONSIVE */
@media(max-width:1280px){.page{padding-left:24px;padding-right:24px}.row-1{grid-template-columns:1fr 240px}.big-row{grid-template-columns:1fr 280px}}
@media(max-width:1024px){.row-1{grid-template-columns:1fr;gap:10px}.heatmap-mini-grid{grid-template-columns:repeat(20,1fr)}.badge-grid{grid-template-columns:repeat(6,1fr)}.ch-small-grid{grid-template-columns:repeat(2,1fr)}.big-row{grid-template-columns:1fr}}
@media(max-width:768px){.navbar{padding:0 16px}.nav-items{display:none}.burger{display:flex}.page{padding-left:16px;padding-right:16px}.row-1{margin-top:24px}.welcome{padding:20px 22px}.welcome-title{font-size:20px}.stat-grid{grid-template-columns:repeat(2,1fr)}.mid-grid{grid-template-columns:1fr}.ch-featured{flex-direction:column;align-items:flex-start;gap:14px}.cf-action{align-self:stretch;justify-content:center}.badge-grid{grid-template-columns:repeat(4,1fr)}.ch-small-grid{grid-template-columns:1fr 1fr}.live-notifs{top:auto;bottom:20px;left:20px;right:20px;max-width:none}}
@media(max-width:640px){.welcome::before,.welcome::after{display:none}.welcome-title{font-size:18px}.stat-grid{gap:6px}.stat-card{padding:12px 14px}.stat-val{font-size:20px}.sc-spark{width:42px;height:24px}.badge-grid{grid-template-columns:repeat(3,1fr)}.cat-card-content{grid-template-columns:1fr}.ch-featured{padding:16px}.cf-icon{width:44px;height:44px}.cf-name{font-size:15px}.ch-small-grid{grid-template-columns:1fr}}
`;

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate   = useNavigate();

  const [theme,         setTheme]         = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [profile,       setProfile]       = useState(null);
  const [challenges,    setChallenges]    = useState([]);
  const [chartFilter,   setChartFilter]   = useState('7g');
  const [notifs,        setNotifs]        = useState([]);
  const [progressWidth, setProgressWidth] = useState(0);

  const notifRef = useRef({ idx: 0, key: 0 });
  const heatmap  = useMemo(genHeatmap, []);

  // Load API data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ data: prof }, { data: chData }] = await Promise.all([
          usersAPI.getMe(),
          challengesAPI.getAll({ limit: 5 }),
        ]);
        if (!active) return;
        setProfile(prof);
        setChallenges((chData.challenges || chData || []).slice(0, 5));
      } catch (err) {
        console.error('Dashboard load error:', err);
      }
    })();
    return () => { active = false; };
  }, []);

  // Animate progress bar after profile loads
  useEffect(() => {
    if (!profile) return;
    const { pct } = getRankInfo(profile.points);
    const t = setTimeout(() => setProgressWidth(pct), 300);
    return () => clearTimeout(t);
  }, [profile]);

  // Live notifications
  useEffect(() => {
    const show = () => {
      const { idx, key } = notifRef.current;
      const tpl = NOTIF_TPL[idx % NOTIF_TPL.length];
      const id  = key;
      notifRef.current = { idx: idx + 1, key: key + 1 };
      setNotifs(prev => {
        const next = [...prev, { ...tpl, id, exiting: false }];
        return next.length > 3 ? next.slice(1) : next;
      });
      setTimeout(() => {
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
        setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 400);
      }, 4000);
    };
    let interval = null;
    const timer = setTimeout(() => { show(); interval = setInterval(show, 6000); }, 3000);
    return () => { clearTimeout(timer); if (interval) clearInterval(interval); };
  }, []);

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  };

  const rank      = getRankInfo(profile?.points || 0);
  const initials  = getInitials(profile?.username || '');
  const solved    = profile?.solvedChallenges?.length || 0;
  const featured  = challenges[0] || null;
  const smallCh   = challenges.length > 1 ? challenges.slice(1, 5) : STATIC_SMALL;

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());

  return (
    <>
      <style>{CSS}</style>

      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Live notifications */}
      <div className="live-notifs">
        {notifs.map(n => (
          <div key={n.id} className={`live-notif ${n.cls}${n.exiting ? ' exiting' : ''}`}>
            <div className="ln-icon">{n.icon}</div>
            <div className="ln-content">
              <div className="ln-title" dangerouslySetInnerHTML={{ __html: n.title }} />
              <div className="ln-sub">{n.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <Link className="nav-logo" to="/">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <defs><linearGradient id="nlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7C6FEA"/><stop offset="100%" stopColor="#5BC4D4"/></linearGradient></defs>
            <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3" fill="rgba(124,111,234,0.15)" stroke="url(#nlg)" strokeWidth="1.5"/>
          </svg>
          CyberNexus
        </Link>
        <div className="nav-items">
          <Link className="nav-item active" to="/dashboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </Link>
          <Link className="nav-item" to="/ctf">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5a5 5 0 017 0 5 5 0 007 0v9a5 5 0 01-7 0 5 5 0 00-7 0V5z"/><line x1="5" y1="21" x2="5" y2="14"/></svg>
            CTF Arena
          </Link>
          <Link className="nav-item" to="/warroom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a12 12 0 008.5 3A12 12 0 0112 21 12 12 0 013.5 6 12 12 0 0012 3"/></svg>
            War Room
          </Link>
          <Link className="nav-item" to="/leaderboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Leaderboard
          </Link>
        </div>
        <div className="nav-right">
          <button className="burger"><span/><span/><span/></button>
          <div className="mode-toggle" onClick={toggleTheme}>
            <div className="toggle-track"><div className="toggle-thumb"/></div>
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </div>
          <div className="notif-btn">
            <div className="notif-dot"/>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          {user?.role === 'Admin' && (
            <Link to="/admin" className="admin-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Admin
            </Link>
          )}
          <div className="nav-avatar">{initials}</div>
        </div>
      </nav>

      <div className="grad-strip"/>

      <div className="page">

        {/* ── ROW 1: welcome + heatmap ── */}
        <div className="row-1">
          <div className="welcome animate-in delay-1">
            <div className="welcome-content">
              <div className="welcome-greet">
                <span className="greet-dot"/>
                {today} · {profile?.streak || 0} giorni di streak 🔥
              </div>
              <h1 className="welcome-title">
                Bentornato, <span className="welcome-name">{profile?.username || '...'}</span> 👋
              </h1>
              <p className="welcome-msg">
                Hai catturato <strong style={{color:'var(--mint)'}}>{solved} flag</strong> finora
                e hai guadagnato <strong style={{color:'var(--violet)'}}>{(profile?.points || 0).toLocaleString('it-IT')} punti</strong>.
                {rank.next && <>
                  {' '}Mancano solo <strong style={{color:'var(--amber)'}}>{rank.remaining} punti</strong> al rank <strong>{rank.next}</strong> — sei quasi lì!
                </>}
              </p>
              {rank.next && (
                <div className="welcome-progress">
                  <div className="wp-row">
                    <span>Verso <span className="wp-strong">{rank.next}</span></span>
                    <span><strong style={{color:'var(--violet)'}}>{profile?.points || 0}</strong> / {rank.max} pts</span>
                  </div>
                  <div className="wp-bar">
                    <div className="wp-fill" style={{ width: `${progressWidth}%`, transition: 'width 1.5s 0.3s ease' }}/>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="heatmap-mini animate-in delay-2">
            <div className="hm-mini-header">
              <div className="hm-mini-title">📊 Attività 60g</div>
              <div className="hm-mini-streak"><span className="hm-mini-emoji">🔥</span>{profile?.streak || 0}</div>
            </div>
            <div className="heatmap-mini-grid">
              {heatmap.map(cell => (
                <div key={cell.id} className="hm-mini-cell" style={{ background: cell.bg, animation: `scaleIn .5s ${cell.delay} both` }}/>
              ))}
            </div>
            <div className="hm-mini-info">
              <span>Oggi: <strong>4 contributi</strong></span>
              <span>Best: <strong>9</strong></span>
            </div>
          </div>
        </div>

        {/* ── ADMIN BANNER ── */}
        {user?.role === 'Admin' && (
          <div className="admin-banner animate-in delay-2">
            <div className="ab-left">
              <div className="ab-icon">⚙</div>
              <div>
                <div className="ab-title">Admin Panel</div>
                <div className="ab-sub">Gestisci utenti, challenge e War Room</div>
              </div>
            </div>
            <Link to="/admin" className="ab-btn">Vai al pannello →</Link>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div className="stat-grid">
          <div className="stat-card animate-in delay-3" style={{color:'var(--violet)'}}>
            <div className="sc-row">
              <div className="sc-left">
                <div className="stat-lbl">
                  <svg className="stat-ico" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 9 12 2"/></svg>
                  Punteggio
                </div>
                <div className="stat-val"><Counter target={profile?.points || 0} style={{color:'var(--violet)'}} delay={400}/></div>
                <div className="stat-badge" style={{background:'var(--violet-bg)',color:'var(--violet)'}}>▲ pts totali</div>
              </div>
              <svg className="sc-spark" viewBox="0 0 60 30"><polyline points="0,22 8,18 16,20 24,12 32,15 40,8 48,10 60,3" fill="none" stroke="var(--violet)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="60" cy="3" r="2.5" fill="var(--violet)"/></svg>
            </div>
          </div>

          <div className="stat-card animate-in delay-3" style={{color:'var(--mint)'}}>
            <div className="sc-row">
              <div className="sc-left">
                <div className="stat-lbl">
                  <svg className="stat-ico" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5a5 5 0 017 0 5 5 0 007 0v9a5 5 0 01-7 0 5 5 0 00-7 0V5z"/><line x1="5" y1="21" x2="5" y2="14"/></svg>
                  Flag catturate
                </div>
                <div className="stat-val"><Counter target={solved} style={{color:'var(--mint)'}} delay={480}/></div>
                <div className="stat-badge" style={{background:'var(--mint-bg)',color:'var(--mint)'}}>sfide risolte</div>
              </div>
              <svg className="sc-spark" viewBox="0 0 60 30"><polyline points="0,25 10,22 20,18 30,18 40,12 50,10 60,5" fill="none" stroke="var(--mint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="60" cy="5" r="2.5" fill="var(--mint)"/></svg>
            </div>
          </div>

          <div className="stat-card animate-in delay-4" style={{color:'var(--amber)'}}>
            <div className="sc-row">
              <div className="sc-left">
                <div className="stat-lbl">
                  <svg className="stat-ico" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  Rank globale
                </div>
                <div className="stat-val" style={{color:'var(--amber)'}}>
                  #<Counter target={42} style={{color:'var(--amber)'}} delay={560}/>
                </div>
                <div className="stat-badge" style={{background:'var(--amber-bg)',color:'var(--amber)'}}>▲ +3 settimana</div>
              </div>
              <svg className="sc-spark" viewBox="0 0 60 30"><polyline points="0,8 10,12 20,10 30,16 40,14 50,18 60,22" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="60" cy="22" r="2.5" fill="var(--amber)"/></svg>
            </div>
          </div>

          <div className="stat-card animate-in delay-4" style={{color:'var(--cyan)'}}>
            <div className="sc-row">
              <div className="sc-left">
                <div className="stat-lbl">
                  <svg className="stat-ico" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a12 12 0 008.5 3A12 12 0 0112 21 12 12 0 013.5 6 12 12 0 0012 3"/></svg>
                  War Room
                </div>
                <div className="stat-val"><Counter target={8} style={{color:'var(--cyan)'}} delay={640}/></div>
                <div className="stat-badge" style={{background:'var(--coral-bg)',color:'var(--coral)'}}>▲ 2 live ora</div>
              </div>
              <svg className="sc-spark" viewBox="0 0 60 30"><rect x="2" y="18" width="6" height="10" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="12" y="14" width="6" height="14" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="22" y="20" width="6" height="8" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="32" y="10" width="6" height="18" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="42" y="16" width="6" height="12" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="52" y="6" width="6" height="22" fill="var(--cyan)"/></svg>
            </div>
          </div>
        </div>

        {/* ── CHARTS ── */}
        <div className="mid-grid">
          <div className="chart-card animate-in delay-4">
            <div className="card-title-row">
              <div>
                <div className="card-title">Progressione punti</div>
                <div className="card-sub">ultimi 7 giorni</div>
              </div>
              <div className="chart-filter">
                {['7g','30g','tutto'].map(f => (
                  <button key={f} className={`cf-btn-filter${chartFilter === f ? ' active' : ''}`} onClick={() => setChartFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="bar-chart">
              {WEEK_LABELS.map((day, i) => (
                <div key={i} className="bar-wrap">
                  <div className={`bar${i === 6 ? ' today' : ''}`} style={{ height: `${BAR_H[i]}%`, animationDelay: `${0.5 + i * 0.1}s` }}/>
                  <div className="bar-label" style={i === 6 ? {color:'var(--violet)',fontWeight:600} : {}}>{day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card animate-in delay-5">
            <div className="card-title-row">
              <div>
                <div className="card-title">Categorie risolte</div>
                <div className="card-sub">{solved} sfide · {CAT_BARS.length} categorie</div>
              </div>
            </div>
            <div className="cat-card-content">
              <svg className="donut-svg" width="100" height="100" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border2)" strokeWidth="10"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--violet)"  strokeWidth="10" strokeDasharray="66 123"  strokeDashoffset="0"    strokeLinecap="round" transform="rotate(-90 40 40)"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--fuchsia)" strokeWidth="10" strokeDasharray="47 142"  strokeDashoffset="-66"  strokeLinecap="round" transform="rotate(-90 40 40)"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--cyan)"    strokeWidth="10" strokeDasharray="38 151"  strokeDashoffset="-113" strokeLinecap="round" transform="rotate(-90 40 40)"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--mint)"    strokeWidth="10" strokeDasharray="23 166"  strokeDashoffset="-151" strokeLinecap="round" transform="rotate(-90 40 40)"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="var(--amber)"   strokeWidth="10" strokeDasharray="15 174"  strokeDashoffset="-174" strokeLinecap="round" transform="rotate(-90 40 40)"/>
                <text x="40" y="44" textAnchor="middle" fontFamily="Syne,sans-serif" fontSize="13" fontWeight="700" fill="var(--text1)">{solved || 17}</text>
              </svg>
              <div className="cat-bars">
                {CAT_BARS.map(cat => (
                  <div key={cat.name} className="cat-bar-row">
                    <div className="cat-bar-dot" style={{background: cat.c}}/>
                    <div className="cat-bar-name">{cat.name}</div>
                    <div className="cat-bar-track">
                      <div className="cat-bar-fill" style={{'--w': cat.w, background: cat.c}}/>
                    </div>
                    <div className="cat-bar-pct" style={{color: cat.c}}>{cat.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── FEATURED CHALLENGES ── */}
        <div className="animate-in delay-5" style={{marginBottom:'14px'}}>
          <div className="section-header">
            <div className="section-title">🎯 Sfide consigliate</div>
            <Link className="view-all" to="/ctf">Vedi tutte →</Link>
          </div>

          {/* Featured card */}
          {(() => {
            const ch   = featured;
            const cs   = ch ? (CAT_STYLE[ch.category] || CAT_STYLE.Cryptography) : CAT_STYLE.Cryptography;
            const ds   = ch ? (DIFF_STYLE[ch.difficulty] || DIFF_STYLE.Easy)      : DIFF_STYLE.Easy;
            return (
              <div className="ch-featured" onClick={() => navigate('/ctf')}>
                <div className="cf-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="16" r="1" fill="currentColor"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                </div>
                <div className="cf-info">
                  <div className="cf-eyebrow">⚡ Featured · Perfetta per te</div>
                  <div className="cf-name">{ch?.title || 'RSA Baby Steps'}</div>
                  <div className="cf-desc">{ch?.description?.slice(0, 80) || 'Sblocca le basi della crittografia asimmetrica.'}</div>
                  <div className="cf-meta">
                    <div className="cf-tag" style={{background: cs.bg, color: cs.c}}>{ch?.category || 'Cryptography'}</div>
                    <div className="cf-tag" style={{background: ds.bg, color: ds.c}}>{ch?.difficulty || 'Easy'}</div>
                    <div className="cf-tag" style={{background:'var(--bg3)',color:'var(--text2)',border:'0.5px solid var(--border)'}}>
                      {ch?.solveCount ?? 234} solved
                    </div>
                  </div>
                </div>
                <button className="cf-action">
                  +{ch?.points || 150} pts
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            );
          })()}

          {/* Small challenge grid */}
          <div className="ch-small-grid">
            {smallCh.map((ch, i) => {
              const cs = CAT_STYLE[ch.category] || CAT_STYLE.Cryptography;
              return (
                <div key={ch._id || i} className="ch-small" onClick={() => navigate('/ctf')}>
                  <div className="chs-ico" style={{background: cs.bg}}>
                    <ChIcon category={ch.category} color={cs.c}/>
                  </div>
                  <div className="chs-info">
                    <div className="chs-name">{ch.title}</div>
                    <div className="chs-meta">{ch.category} · {ch.difficulty}</div>
                  </div>
                  <div className="chs-pts" style={{color: cs.c}}>+{ch.points}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── WAR ROOM + ACTIVITY FEED ── */}
        <div className="big-row animate-in delay-6">
          <div>
            <div className="section-header">
              <div className="section-title">🚨 War Room attive</div>
              <Link className="view-all" to="/warroom">Vedi tutte →</Link>
            </div>
            <div className="inc-list">
              {WARROOMS_DATA.map(wr => (
                <div key={wr.id} className={`incident-card ${wr.sc === 'amber' ? 'high' : wr.sc === 'cyan' ? 'medium' : ''}`}>
                  <div className="inc-header">
                    <div className="inc-dot" style={{background: wr.dc}}/>
                    <div className="inc-title">{wr.title}</div>
                    <div className="inc-badge" style={{background:`var(--${wr.sc}-bg)`,color:`var(--${wr.sc})`}}>{wr.sev}</div>
                  </div>
                  <div className="inc-meta">
                    {wr.type} · {wr.pp.length} {wr.pp.length === 1 ? 'analista' : 'analisti'} connessi
                    <div className="inc-participants">
                      {wr.pp.map((p, pi) => (
                        <div key={pi} className="part-av" style={{background: p.c}}>{p.i}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="feed-side">
            <div className="feed-side-header">
              <div className="section-title" style={{fontSize:'14px'}}>💡 Feed live</div>
              <span className="live-tag"><span className="live-tag-dot"/>live</span>
            </div>
            <div className="activity-feed">
              {ACTIVITY_ITEMS.map((act, i) => (
                <div key={i} className="activity-item">
                  <div className="act-icon" style={{background: act.bg}}>{act.icon}</div>
                  <div className="act-content">
                    <div className="act-text" dangerouslySetInnerHTML={{__html: act.html}}/>
                    <div className="act-time">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BADGES ── */}
        <div className="animate-in delay-6" style={{marginBottom:'24px'}}>
          <div className="section-header">
            <div className="section-title">🏅 Achievement</div>
            <Link className="view-all" to="/dashboard">Vedi tutti (24) →</Link>
          </div>
          <div className="badge-grid">
            {BADGES_DATA.map((b, i) => (
              <div key={i} className={`badge-card ${b.st}`}>
                {b.st === 'unlocked' && <div className="unlocked-check">✓</div>}
                <div className="bc-icon" style={{background: b.bg}}>{b.icon}</div>
                <div className="bc-name">{b.name}</div>
                <div className="bc-progress">
                  <div className="bc-fill" style={{width:`${b.pct}%`, background: b.fc}}/>
                </div>
                {b.lbl && <div className="bc-pct">{b.lbl}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── TOP LEADERBOARD ── */}
        <div className="lb-card animate-in delay-6">
          <div className="section-header" style={{marginBottom:'14px',marginTop:0}}>
            <div className="section-title">🏆 Top classifica</div>
            <Link className="view-all" to="/leaderboard">Vedi tutto →</Link>
          </div>
          <div className="lb-mini">
            {TOP_LB.map((row, i) => (
              <div key={i} className="lbm-row">
                <div className="lbm-rank">{row.rank}</div>
                <div className="lbm-av" style={{background: row.c}}>{row.i}</div>
                <div className="lbm-name">{row.name}</div>
                <div className="lbm-pts"><Counter target={row.pts} style={{color: row.c}} delay={400 + i * 80}/></div>
              </div>
            ))}
            {profile && (
              <div className="lbm-row me">
                <div className="lbm-rank" style={{color:'var(--violet)'}}>#42</div>
                <div className="lbm-av" style={{background:'var(--violet)'}}>{initials}</div>
                <div className="lbm-name" style={{fontWeight:500}}>{profile.username} (tu)</div>
                <div className="lbm-pts"><Counter target={profile.points} style={{color:'var(--violet)'}} delay={720}/></div>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
