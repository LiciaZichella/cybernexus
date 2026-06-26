import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import Navbar from '../components/Navbar';
import { usersAPI, challengesAPI, warroomAPI, leaderboardAPI } from '../services/api';


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


function getInitials(name = '') {
  return (name.replace(/_/g, ' ').trim().slice(0, 2) || 'US').toUpperCase();
}

function getRankInfo(pts = 0) {
  if (pts < 500) {
    return {
      next: 'Analyst',
      pct: Math.min(Math.round((pts / 500) * 100), 100),
      remaining: 500 - pts,
      max: 500,
    };
  }
  return { next: null, pct: 100, remaining: 0, max: pts };
}



const HEATMAP_COLORS = [
  'var(--border2)',
  'rgba(124,111,234,0.18)',
  'rgba(124,111,234,0.35)',
  'rgba(124,111,234,0.6)',
  'var(--violet)',
];


const CAT_CONFIG = [
  { name: 'Cryptography', alt: 'Crypto', c: 'var(--violet)'  },
  { name: 'Web',          alt: null,     c: 'var(--fuchsia)' },
  { name: 'OSINT',        alt: null,     c: 'var(--cyan)'    },
  { name: 'Forensics',    alt: null,     c: 'var(--amber)'   },
  { name: 'Reverse',      alt: null,     c: 'var(--coral)'   },
  { name: 'Misc',         alt: null,     c: 'var(--text2)'   },
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


const BADGE_DESCRIZIONI = {
  'First Blood':  'Risolvi la tua prima sfida CTF.',
  'Cryptolord':   'Risolvi 3 sfide di categoria Crypto.',
  'Streak 7':     'Accedi e risolvi sfide per 7 giorni consecutivi.',
  'OSINT Pro':    'Risolvi 3 sfide di categoria OSINT.',
  'War Hero':     'Completa 5 War Room come membro del team.',
  'Analyst':      'Raggiungi 500 punti totali sulla piattaforma.',
  'Top 10':       'Entra nella top 10 della classifica globale.',
  '???':          'Continua a esplorare per scoprire altri achievement segreti...',
};


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


.page{padding-top:58px;min-height:100vh;max-width:1280px;margin:0 auto;padding-left:32px;padding-right:32px;padding-bottom:60px;position:relative;z-index:1}
.grad-strip{height:2px;background:linear-gradient(90deg,var(--violet),var(--fuchsia),var(--cyan),var(--mint),var(--amber));position:fixed;top:58px;left:0;right:0;z-index:499}


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


.ach-overlay{position:fixed;inset:0;z-index:800;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,9,15,.75);backdrop-filter:blur(14px);animation:fadeIn .2s ease}
[data-theme="light"] .ach-overlay{background:rgba(240,242,248,.75)}
.ach-modal{width:100%;max-width:380px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:var(--r14);padding:28px 24px 24px;position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;animation:scaleIn .25s cubic-bezier(.34,1.56,.64,1)}
.ach-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;border:0.5px solid var(--border2);background:var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);font-size:13px;transition:all .15s;line-height:1}
.ach-close:hover{color:var(--text1);transform:scale(1.08)}
.ach-icon-big{width:72px;height:72px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:34px;margin-bottom:2px;box-shadow:0 8px 24px rgba(0,0,0,.2)}
.ach-modal-name{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text1);line-height:1.2}
.ach-modal-desc{font-size:12px;color:var(--text2);line-height:1.65;max-width:280px}
.ach-progress-wrap{width:100%;margin-top:4px}
.ach-progress-row{display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:6px}
.ach-progress-row strong{color:var(--text1);font-weight:600}
.ach-bar{height:6px;border-radius:4px;background:var(--border2);overflow:hidden;width:100%}
.ach-bar-fill{height:6px;border-radius:4px;transition:width 1s .1s ease}
.ach-bar-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);background-size:200%;animation:shimmer 2s linear infinite}
.ach-bar-fill{position:relative;overflow:hidden}
.ach-status{margin-top:4px;font-size:12px;font-weight:600;padding:6px 16px;border-radius:20px}
.ach-status.ok{color:var(--mint);background:var(--mint-bg);border:0.5px solid rgba(92,206,138,.25)}
.ach-status.wip{color:var(--text2);background:var(--bg3);border:0.5px solid var(--border)}


.admin-pill{font-size:11px;font-weight:600;padding:5px 11px;border-radius:var(--r8);background:var(--coral-bg);color:var(--coral);border:0.5px solid rgba(240,112,96,.3);text-decoration:none;transition:all .2s;display:flex;align-items:center;gap:5px;white-space:nowrap}
.admin-pill:hover{background:rgba(240,112,96,.18);transform:translateY(-1px)}
.admin-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(135deg,rgba(240,112,96,.07),rgba(246,198,82,.05));border:0.5px solid rgba(240,112,96,.2);border-radius:var(--r12);padding:12px 18px;margin-bottom:14px}
.ab-left{display:flex;align-items:center;gap:12px}
.ab-icon{width:36px;height:36px;border-radius:9px;background:var(--coral-bg);border:0.5px solid rgba(240,112,96,.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ab-title{font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:var(--text1);margin-bottom:2px}
.ab-sub{font-size:11px;color:var(--text3)}
.ab-btn{font-size:12px;font-weight:600;padding:8px 16px;border-radius:var(--r8);background:var(--coral-bg);color:var(--coral);border:0.5px solid rgba(240,112,96,.3);text-decoration:none;transition:all .2s;white-space:nowrap;flex-shrink:0}
.ab-btn:hover{background:rgba(240,112,96,.18);transform:translateY(-1px)}


.lb-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r14);padding:18px 20px;margin-bottom:24px}
.lb-mini{display:flex;flex-direction:column;gap:6px}
.lbm-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r8);background:var(--bg3);border:0.5px solid var(--border);transition:all .2s;cursor:pointer}
.lbm-row:hover{border-color:var(--border2);transform:translateX(3px)}
.lbm-row.me{border-color:var(--violet);background:var(--violet-bg)}
.lbm-rank{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text3);width:22px}
.lbm-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.lbm-name{font-size:13px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lbm-pts{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;flex-shrink:0}


.bell-wrap{position:relative}
.bell-badge{position:absolute;top:4px;right:5px;min-width:15px;height:15px;border-radius:8px;background:var(--coral);border:1.5px solid var(--bg);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;line-height:1;padding:0 2px}
.bell-drop{position:absolute;top:calc(100% + 10px);right:0;width:300px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:var(--r14);box-shadow:0 20px 48px var(--shadow);z-index:600;overflow:hidden;animation:ndFadeIn .15s ease both}
@keyframes ndFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.bell-drop-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:0.5px solid var(--border)}
.bell-drop-title{font-size:13px;font-weight:600}
.bell-mark-all{font-size:11px;color:var(--violet);cursor:pointer;font-weight:500;background:none;border:none;padding:0}
.bell-drop-title:hover{text-decoration:underline}
.bell-items{max-height:280px;overflow-y:auto}
.bell-items::-webkit-scrollbar{width:3px}
.bell-items::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.bell-item{display:flex;gap:10px;padding:10px 14px;border-bottom:0.5px solid var(--border);cursor:pointer;transition:background .15s}
.bell-item:hover{background:var(--bg3)}
.bell-item.unread{background:var(--violet-bg)}
.bell-item:last-child{border:none}
.bell-item-icon{font-size:16px;flex-shrink:0;margin-top:2px}
.bell-item-body{flex:1;min-width:0}
.bell-item-text{font-size:12px;color:var(--text1);line-height:1.4}
.bell-item-sub{font-size:10px;color:var(--text3);margin-top:2px}
.bell-empty{padding:28px 14px;text-align:center;font-size:12px;color:var(--text3)}


.ep-btn{font-size:11px;font-weight:600;padding:5px 12px;border-radius:var(--r8);background:var(--bg3);color:var(--text2);border:0.5px solid var(--border);cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:5px;margin-top:10px}
.ep-btn:hover{background:var(--border2);color:var(--text1)}


.ep-overlay{position:fixed;inset:0;z-index:800;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,9,15,.75);backdrop-filter:blur(14px);animation:fadeIn .2s ease}
[data-theme="light"] .ep-overlay{background:rgba(240,242,248,.75)}
.ep-modal{width:100%;max-width:420px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:var(--r14);padding:24px;position:relative;animation:scaleIn .25s cubic-bezier(.34,1.56,.64,1)}
.ep-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text1);margin-bottom:18px}
.ep-field{margin-bottom:14px}
.ep-lbl{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.ep-input{width:100%;background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--r8);padding:9px 12px;font-size:13px;color:var(--text1);font-family:inherit;resize:none;outline:none;transition:border-color .2s;box-sizing:border-box}
.ep-input:focus{border-color:var(--violet)}
.ep-error{font-size:11px;color:var(--coral);margin-top:6px;margin-bottom:6px}
.ep-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:6px}
.ep-save{font-size:12px;font-weight:600;padding:8px 20px;border-radius:var(--r8);background:var(--violet);color:#fff;border:none;cursor:pointer;transition:opacity .2s}
.ep-save:disabled{opacity:.5;cursor:default}
.ep-cancel{font-size:12px;font-weight:600;padding:8px 20px;border-radius:var(--r8);background:var(--bg3);color:var(--text2);border:0.5px solid var(--border);cursor:pointer;transition:all .2s}
.ep-cancel:hover{background:var(--border2)}


.storico-wrap{margin-bottom:24px}
.storico-list{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}
.storico-list::-webkit-scrollbar{width:3px}
.storico-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.storico-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r8);background:var(--bg2);border:0.5px solid var(--border);transition:all .2s}
.storico-item:hover{border-color:var(--border2);transform:translateX(3px)}
.storico-cat{font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;flex-shrink:0}
.storico-title{flex:1;font-size:13px;font-weight:500;color:var(--text1);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.storico-pts{font-size:12px;font-weight:600;color:var(--mint);font-family:'JetBrains Mono',monospace;flex-shrink:0}
.storico-date{font-size:11px;color:var(--text3);flex-shrink:0;white-space:nowrap}


@media(max-width:1280px){.page{padding-left:24px;padding-right:24px}.row-1{grid-template-columns:1fr 240px}.big-row{grid-template-columns:1fr 280px}}
@media(max-width:1024px){.row-1{grid-template-columns:1fr;gap:10px}.heatmap-mini-grid{grid-template-columns:repeat(20,1fr)}.badge-grid{grid-template-columns:repeat(6,1fr)}.ch-small-grid{grid-template-columns:repeat(2,1fr)}.big-row{grid-template-columns:1fr}}
@media(max-width:768px){.navbar{padding:0 16px}.nav-items{display:none}.burger{display:flex}.page{padding-left:16px;padding-right:16px}.row-1{margin-top:24px}.welcome{padding:20px 22px}.welcome-title{font-size:20px}.stat-grid{grid-template-columns:repeat(2,1fr)}.mid-grid{grid-template-columns:1fr}.ch-featured{flex-direction:column;align-items:flex-start;gap:14px}.cf-action{align-self:stretch;justify-content:center}.badge-grid{grid-template-columns:repeat(4,1fr)}.ch-small-grid{grid-template-columns:1fr 1fr}.live-notifs{top:auto;bottom:20px;left:20px;right:20px;max-width:none}}
@media(max-width:640px){.welcome::before,.welcome::after{display:none}.welcome-title{font-size:18px}.stat-grid{gap:6px}.stat-card{padding:12px 14px}.stat-val{font-size:20px}.sc-spark{width:42px;height:24px}.badge-grid{grid-template-columns:repeat(3,1fr)}.cat-card-content{grid-template-columns:1fr}.ch-featured{padding:16px}.cf-icon{width:44px;height:44px}.cf-name{font-size:15px}.ch-small-grid{grid-template-columns:1fr}}
`;


export default function Dashboard() {
  const { user, loading: authLoading, aggiornaUser } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { notifiche, segnaLetta, segnaLetteTutte, nonLette } = useNotifications();

  const [profile,       setProfile]       = useState(null);
  const [challenges,    setChallenges]    = useState([]);
  const [rankUtente,    setRankUtente]    = useState(0);
  const [warroomCount,  setWarroomCount]  = useState(0);
  const [warrooms,      setWarrooms]      = useState([]);
  const [topClassifica, setTopClassifica] = useState([]);
  const [chartFilter,   setChartFilter]   = useState('7g');
  const [progressWidth, setProgressWidth] = useState(0);
  const [attivita,      setAttivita]      = useState([]);  
  const [submissions,   setSubmissions]   = useState([]);  
  const [badgeModal,    setBadgeModal]    = useState(null); 
  const [editModal,     setEditModal]     = useState(false);
  const [editForm,      setEditForm]      = useState({ username: '', bio: '', avatar: '' });
  const [editLoading,   setEditLoading]   = useState(false);
  const [editError,     setEditError]     = useState('');

  const userRef = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  // Chiude il modale achievement con Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setBadgeModal(null); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [profRes, chRes, wrRes, lbRes, actRes, subRes] = await Promise.allSettled([
        usersAPI.getMe(),
        challengesAPI.getAll({}),          
        warroomAPI.getAll(),
        leaderboardAPI.get({ page: 1, limit: 100 }),
        usersAPI.getActivity(),            
        usersAPI.getSubmissions(),         
      ]);
      if (profRes.status === 'fulfilled') {
        const prof = profRes.value.data;
        setProfile(prof.user ?? prof);
      }
      if (chRes.status === 'fulfilled') {
        const chData = chRes.value.data;
        setChallenges(chData.challenges || chData || []);
      }
      if (wrRes.status === 'fulfilled') {
        const rooms = wrRes.value.data?.rooms ?? wrRes.value.data ?? [];
        const roomList   = Array.isArray(rooms) ? rooms : [];
        const activeRooms = roomList.filter(r => r.status === 'active');
        setWarroomCount(activeRooms.length);
        setWarrooms(activeRooms.slice(0, 3));
      }
      if (lbRes.status === 'fulfilled') {
        const classifica = lbRes.value.data?.classifica ?? [];
        const uid = userRef.current?.id ?? userRef.current?._id;
        const idx = classifica.findIndex(u => (u.id ?? u._id) === uid);
        if (idx >= 0) setRankUtente(idx + 1);
        setTopClassifica(classifica.slice(0, 3));
      }
      if (actRes.status === 'fulfilled') setAttivita(actRes.value.data?.activity ?? []);
      if (subRes.status === 'fulfilled') setSubmissions(subRes.value.data?.submissions ?? []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []); 

  
  useEffect(() => {
    if (authLoading) return;
    loadAllData();
  }, [authLoading, loadAllData]);

  
  useEffect(() => {
    const needsRefresh = sessionStorage.getItem('dashboard_refresh');
    if (needsRefresh) {
      sessionStorage.removeItem('dashboard_refresh');
      
      setTimeout(() => {
        aggiornaUser();
        loadAllData();
      }, 300);
    }
  }, [location.key]); 

  
  useEffect(() => {
    if (!profile) return;
    const { pct } = getRankInfo(profile.points);
    const t = setTimeout(() => setProgressWidth(pct), 300);
    return () => clearTimeout(t);
  }, [profile]);

  
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadAllData();
        if (typeof aggiornaUser === 'function') aggiornaUser();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAllData, aggiornaUser]);

  
  useEffect(() => {
    if (authLoading) return;
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [authLoading, loadAllData]);

  
  const handleSalvaProfilo = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      const res = await usersAPI.updateMe(editForm);
      const updated = res.data?.user ?? res.data;
      setProfile(updated);
      setEditModal(false);
      aggiornaUser();
    } catch (err) {
      setEditError(err.response?.data?.error ?? 'Errore durante il salvataggio.');
    } finally {
      setEditLoading(false);
    }
  };

  // Heatmap 60 giorni 
  const heatmap = useMemo(() =>
    attivita.length
      ? attivita.map((a, i) => ({ id: i, bg: HEATMAP_COLORS[Math.min(a.count, 4)], delay: `${(i * 0.008).toFixed(3)}s` }))
      : Array.from({ length: 60 }, (_, i) => ({ id: i, bg: HEATMAP_COLORS[0], delay: `${(i * 0.008).toFixed(3)}s` })),
  [attivita]);
  const oggiCount = attivita.length ? attivita[attivita.length - 1].count : 0;
  const bestCount = attivita.length ? Math.max(...attivita.map(a => a.count)) : 0;

  // Categorie risolte 
  const catBars = useMemo(() => {
    if (!challenges.length) return [];
    const solvedSet = new Set((profile?.solvedChallenges || []).map(String));
    return CAT_CONFIG
      .map(cat => {
        const chCat   = challenges.filter(ch => ch.category === cat.name || ch.category === cat.alt);
        const total   = chCat.length;
        const risolte = chCat.filter(ch => solvedSet.has(String(ch._id))).length;
        const pct     = total > 0 ? Math.round((risolte / total) * 100) : 0;
        return { name: cat.name, c: cat.c, pct, w: `${pct}%`, risolte, total };
      })
      .filter(c => c.total > 0);
  }, [challenges, profile]);

  // Achievement dinamici 
  const badges = useMemo(() => {
    const solvedSet     = new Set((profile?.solvedChallenges || []).map(String));
    const solved        = profile?.solvedChallenges?.length || 0;
    const points        = profile?.points || 0;
    const streak        = profile?.streak || 0;
    const cryptoRisolte = challenges.filter(ch => ['Crypto','Cryptography'].includes(ch.category) && solvedSet.has(String(ch._id))).length;
    const osintRisolte  = challenges.filter(ch => ch.category === 'OSINT' && solvedSet.has(String(ch._id))).length;
    const isTop10       = rankUtente > 0 && rankUtente <= 10;
    const mk = (icon, name, unlocked, progress, total, bg, fc) => ({ icon, name, unlocked, progress, total, bg, fc });
    return [
      mk('🔥','First Blood',  solved >= 1,          Math.min(solved, 1),         1,   'var(--amber-bg)',         'var(--amber)'   ),
      mk('🔐','Cryptolord',   cryptoRisolte >= 3,   Math.min(cryptoRisolte, 3),  3,   'var(--violet-bg)',        'var(--violet)'  ),
      mk('⚡','Streak 7',     streak >= 7,           Math.min(streak, 7),         7,   'var(--mint-bg)',          'var(--mint)'    ),
      mk('🔍','OSINT Pro',    osintRisolte >= 3,     Math.min(osintRisolte, 3),   3,   'var(--cyan-bg)',          'var(--cyan)'    ),
      mk('🚨','War Hero',     (profile?.warRoomsCompleted || 0) >= 5, Math.min(profile?.warRoomsCompleted || 0, 5), 5, 'var(--coral-bg)', 'var(--coral)'),
      mk('🎯','Analyst',      points >= 500,         Math.min(points, 500),       500, 'var(--amber-bg)',         'var(--amber)'   ),
      mk('📊','Top 10',       isTop10,               Math.max(0, 11 - Math.max(rankUtente,1)), 10, 'var(--fuchsia-bg)', 'var(--fuchsia)' ),
      mk('🔒','???',           false,                 0,                           0,   'rgba(255,255,255,0.03)', 'transparent'    ),
    ];
  }, [profile, challenges, rankUtente]);

  
  const barData = useMemo(() => {
    const FALLBACK = { labels: ['L','M','M','G','V','S','D'], heights: [10,15,10,20,15,25,30] };
    const oggi = new Date();
    const DN   = ['D','L','M','M','G','V','S'];

    if (chartFilter === '7g') {
      const giorni = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(oggi.getTime() - (6 - i) * 86400000);
        return d.toISOString().slice(0, 10);
      });
      const vals = giorni.map(dt =>
        submissions.filter(s => s.createdAt.slice(0, 10) === dt)
                   .reduce((sum, s) => sum + (s.pointsAwarded || 0), 0)
      );
      const max = Math.max(...vals, 1);
      return { labels: giorni.map(d => DN[new Date(d).getDay()]), heights: vals.map(v => Math.max(3, Math.round((v / max) * 95))) };
    }

    if (chartFilter === '30g') {
      
      const settimane = [3,2,1,0].map(w => {
        const fine   = new Date(oggi.getTime() - w * 7 * 86400000);
        const inizio = new Date(fine.getTime() - 7 * 86400000);
        const pts    = submissions.filter(s => { const d = new Date(s.createdAt); return d > inizio && d <= fine; }).reduce((sum, s) => sum + (s.pointsAwarded || 0), 0);
        return { label: `S-${4 - w}`, pts };
      });
      const max = Math.max(...settimane.map(s => s.pts), 1);
      return { labels: settimane.map(s => s.label), heights: settimane.map(s => Math.max(3, Math.round((s.pts / max) * 95))) };
    }

    
    if (!submissions.length) return FALLBACK;
    const mesiMap = {};
    submissions.forEach(s => {
      const d = new Date(s.createdAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesiMap[k] = (mesiMap[k] || 0) + (s.pointsAwarded || 0);
    });
    const ultimi7 = Object.entries(mesiMap).sort(([a],[b]) => a.localeCompare(b)).slice(-7);
    if (!ultimi7.length) return FALLBACK;
    const max = Math.max(...ultimi7.map(([,v]) => v), 1);
    const NM  = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    return { labels: ultimi7.map(([k]) => NM[parseInt(k.slice(5)) - 1]), heights: ultimi7.map(([,v]) => Math.max(3, Math.round((v / max) * 95))) };
  }, [submissions, chartFilter]);

  const rank      = getRankInfo(profile?.points || 0);
  const initials  = getInitials(profile?.username || '');
  const solved    = profile?.solvedChallenges?.length || 0;
  // Sfida consigliata: prima non risolta nella categoria meno esplorata dall'utente
  const featured = useMemo(() => {
    if (!challenges.length) return null;
    const solvedSet = new Set((profile?.solvedChallenges || []).map(String));
    const nonRisolte = challenges.filter(ch => !solvedSet.has(String(ch._id)));
    if (!nonRisolte.length) return challenges[0]; 
    const catCount = {};
    challenges.forEach(ch => {
      if (solvedSet.has(String(ch._id))) catCount[ch.category] = (catCount[ch.category] || 0) + 1;
    });
    return nonRisolte.sort((a, b) => (catCount[a.category] || 0) - (catCount[b.category] || 0))[0];
  }, [challenges, profile]);

  
  const smallCh = useMemo(() => {
    const featId = featured?._id ? String(featured._id) : null;
    const rest = challenges.filter(ch => String(ch._id) !== featId);
    return rest.slice(0, 4).length ? rest.slice(0, 4) : STATIC_SMALL;
  }, [challenges, featured]);

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase());

  return (
    <>
      <style>{CSS}</style>

      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <Navbar />

      <div className="page">

        
        <div className="row-1">
          <div id="profilo" className="welcome animate-in delay-1">
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
                {rank.next && user?.role !== 'Admin' && <>
                  {' '}Mancano solo <strong style={{color:'var(--amber)'}}>{rank.remaining} punti</strong> al rank <strong>{rank.next}</strong> — sei quasi lì!
                </>}
              </p>
              {rank.next && user?.role !== 'Admin' && (
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
              <button className="ep-btn" onClick={() => {
                setEditForm({ username: profile?.username || '', bio: profile?.bio || '', avatar: profile?.avatar || '' });
                setEditError('');
                setEditModal(true);
              }}>
                ✏ Modifica profilo
              </button>
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
              <span>Oggi: <strong>{oggiCount} {oggiCount === 1 ? 'flag' : 'flag'}</strong></span>
              <span>Best: <strong>{bestCount}</strong></span>
            </div>
          </div>
        </div>

        
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
                  {rankUtente > 0
                    ? <>#<Counter target={rankUtente} style={{color:'var(--amber)'}} delay={560}/></>
                    : <span style={{color:'var(--amber)'}}>—</span>}
                </div>
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
                <div className="stat-val"><Counter target={warroomCount} style={{color:'var(--cyan)'}} delay={640}/></div>
                <div className="stat-badge" style={{background:'var(--coral-bg)',color:'var(--coral)'}}>▲ {warroomCount} live ora</div>
              </div>
              <svg className="sc-spark" viewBox="0 0 60 30"><rect x="2" y="18" width="6" height="10" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="12" y="14" width="6" height="14" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="22" y="20" width="6" height="8" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="32" y="10" width="6" height="18" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="42" y="16" width="6" height="12" fill="var(--cyan-bg)" stroke="var(--cyan)" strokeWidth=".5"/><rect x="52" y="6" width="6" height="22" fill="var(--cyan)"/></svg>
            </div>
          </div>
        </div>

        
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
              {barData.labels.map((day, i) => (
                <div key={i} className="bar-wrap">
                  <div className={`bar${i === barData.labels.length - 1 ? ' today' : ''}`}
                    style={{ height: `${barData.heights[i]}%`, animationDelay: `${0.5 + i * 0.1}s` }}
                  />
                  <div className="bar-label" style={i === barData.labels.length - 1 ? {color:'var(--violet)',fontWeight:600} : {}}>{day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card animate-in delay-5">
            <div className="card-title-row">
              <div>
                <div className="card-title">Categorie risolte</div>
                <div className="card-sub">{solved} sfide · {catBars.length} categorie</div>
              </div>
            </div>
            <div className="cat-card-content">
              {(() => {
                const C = 2 * Math.PI * 30;
                const totRisolte = catBars.reduce((s, c) => s + (c.risolte || 0), 0);
                let prevArc = 0;
                const segs = totRisolte > 0
                  ? catBars.filter(c => c.risolte > 0).map(c => {
                      const arc = (c.risolte / totRisolte) * C;
                      const s = { color: c.c, arc, offset: prevArc };
                      prevArc += arc;
                      return s;
                    })
                  : [];
                return (
                  <svg className="donut-svg" width="100" height="100" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border2)" strokeWidth="10"/>
                    {segs.map((s, i) => (
                      <circle key={i} cx="40" cy="40" r="30" fill="none"
                        stroke={s.color} strokeWidth="10"
                        strokeDasharray={`${s.arc.toFixed(1)} ${(C - s.arc).toFixed(1)}`}
                        strokeDashoffset={`${(-s.offset).toFixed(1)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                    ))}
                    <text x="40" y="44" textAnchor="middle" fontFamily="Syne,sans-serif" fontSize="13" fontWeight="700" fill="var(--text1)">{solved}</text>
                  </svg>
                );
              })()}
              <div className="cat-bars">
                {(catBars.length ? catBars : CAT_CONFIG.slice(0, 5).map(c => ({ name: c.name, c: c.c, pct: 0, w: '0%' }))).map(cat => (
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

        
        <div className="animate-in delay-5" style={{marginBottom:'14px'}}>
          <div className="section-header">
            <div className="section-title">🎯 Sfide consigliate</div>
            <Link className="view-all" to="/ctf">Vedi tutte →</Link>
          </div>

          
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
                      {ch?.solveCount ?? 0} solved
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

        
        <div className="big-row animate-in delay-6">
          <div>
            <div className="section-header">
              <div className="section-title">🚨 War Room attive</div>
              <Link className="view-all" to="/warroom">Vedi tutte →</Link>
            </div>
            <div className="inc-list">
              {warrooms.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                  Nessuna War Room attiva al momento
                </div>
              ) : warrooms.map(wr => {
                
                const nome = wr.name || wr.title || 'War Room';
                const nMembri = wr.memberCount ?? wr.members?.length ?? 0;
                return (
                  <div key={wr._id} className="incident-card"
                    onClick={() => navigate(`/warroom/${wr._id}`)} style={{cursor:'pointer'}}>
                    <div className="inc-header">
                      <div className="inc-dot" style={{background:'var(--coral)'}}/>
                      <div className="inc-title">{nome}</div>
                      <div className="inc-badge" style={{background:'var(--coral-bg)',color:'var(--coral)'}}>
                        {wr.status === 'closed' ? 'Chiusa' : 'Attiva'}
                      </div>
                    </div>
                    <div className="inc-meta">
                      {wr.description ? wr.description.slice(0, 60) : 'Incident Response'} · {nMembri} {nMembri === 1 ? 'membro' : 'membri'}
                      <div className="inc-participants">
                        {(wr.members || []).slice(0, 4).map((m, pi) => (
                          <div key={pi} className="part-av" style={{background:`var(--${['violet','cyan','mint','fuchsia'][pi % 4]})`}}>
                            {getInitials(m.user?.username ?? m.username ?? '?')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="feed-side">
            <div className="feed-side-header">
              <div className="section-title" style={{fontSize:'14px'}}>💡 Feed live</div>
              <span className="live-tag"><span className="live-tag-dot"/>live</span>
            </div>
            <div className="activity-feed">
              {notifiche.length === 0 ? (
                <div style={{padding:'20px 0',textAlign:'center',fontSize:'12px',color:'var(--text3)'}}>
                  Nessuna attività recente
                </div>
              ) : notifiche.slice(0, 8).map(n => (
                <div key={n.id} className="activity-item" style={{cursor:'pointer',opacity: n.letta ? 0.65 : 1}} onClick={() => segnaLetta(n.id)}>
                  <div className="act-icon" style={{background:'var(--violet-bg)'}}>{n.icon || '🔔'}</div>
                  <div className="act-content">
                    <div className="act-text">{n.testo}</div>
                    {n.sub && <div className="act-time">{n.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        
        <div id="achievements" className="animate-in delay-6" style={{marginBottom:'24px'}}>
          <div className="section-header">
            <div className="section-title">🏅 Achievement</div>
          </div>
          <div className="badge-grid">
            {badges.map((b, i) => {
              const pctBar = b.total > 0 ? Math.round((b.progress / b.total) * 100) : 0;
              const lbl    = b.total === 0 ? '?' : b.unlocked ? '' : `${b.progress}/${b.total}`;
              return (
                <div
                  key={i}
                  className={`badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => setBadgeModal(b)}
                  title={b.name}
                >
                  {b.unlocked && <div className="unlocked-check">✓</div>}
                  <div className="bc-icon" style={{background: b.bg}}>{b.icon}</div>
                  <div className="bc-name">{b.name}</div>
                  <div className="bc-progress">
                    <div className="bc-fill" style={{width:`${b.unlocked ? 100 : pctBar}%`, background: b.fc}}/>
                  </div>
                  {lbl && <div className="bc-pct">{lbl}</div>}
                </div>
              );
            })}
          </div>
        </div>

        
        {badgeModal && (
          <div className="ach-overlay" onClick={() => setBadgeModal(null)}>
            <div className="ach-modal" onClick={e => e.stopPropagation()}>
              <button className="ach-close" onClick={() => setBadgeModal(null)}>✕</button>

              
              <div className="ach-icon-big" style={{background: badgeModal.bg}}>
                {badgeModal.icon}
              </div>

              
              <div className="ach-modal-name">{badgeModal.name}</div>
              <div className="ach-modal-desc">
                {BADGE_DESCRIZIONI[badgeModal.name] ?? ''}
              </div>

              
              {badgeModal.total > 0 && (
                <div className="ach-progress-wrap">
                  <div className="ach-progress-row">
                    <span>Progresso</span>
                    <strong>{badgeModal.progress}/{badgeModal.total}</strong>
                  </div>
                  <div className="ach-bar">
                    <div
                      className="ach-bar-fill"
                      style={{
                        width: `${badgeModal.unlocked ? 100 : Math.round((badgeModal.progress / badgeModal.total) * 100)}%`,
                        background: badgeModal.fc,
                      }}
                    />
                  </div>
                </div>
              )}

              
              <div className={`ach-status ${badgeModal.unlocked ? 'ok' : 'wip'}`}>
                {badgeModal.unlocked ? 'Sbloccato ✓' : 'In corso...'}
              </div>
            </div>
          </div>
        )}

        
        <div className="lb-card animate-in delay-6">
          <div className="section-header" style={{marginBottom:'14px',marginTop:0}}>
            <div className="section-title">🏆 Top classifica</div>
            <Link className="view-all" to="/leaderboard">Vedi tutto →</Link>
          </div>
          <div className="lb-mini">
            {(topClassifica.length > 0 ? topClassifica : []).map((row, i) => {
              const rowColors = ['var(--amber)', 'var(--text2)', 'var(--amber)'];
              const rowC = i === 0 ? 'var(--amber)' : i === 1 ? 'var(--cyan)' : 'var(--coral)';
              const rowName = row.username ?? row.nome ?? '—';
              return (
                <div key={row._id ?? row.id ?? i} className="lbm-row">
                  <div className="lbm-rank" style={{color: rowC}}>#{i + 1}</div>
                  <div className="lbm-av" style={{background: rowC}}>{getInitials(rowName)}</div>
                  <div className="lbm-name">{rowName}</div>
                  <div className="lbm-pts"><Counter target={row.points ?? row.punteggio ?? 0} style={{color: rowC}} delay={400 + i * 80}/></div>
                </div>
              );
            })}
            {topClassifica.length === 0 && (
              <div style={{padding:'16px',textAlign:'center',fontSize:'12px',color:'var(--text3)'}}>Nessun dato disponibile</div>
            )}
            {profile && (
              <div className="lbm-row me">
                <div className="lbm-rank" style={{color:'var(--violet)'}}>{rankUtente > 0 ? `#${rankUtente}` : '—'}</div>
                <div className="lbm-av" style={{background:'var(--violet)'}}>{initials}</div>
                <div className="lbm-name" style={{fontWeight:500}}>{profile.username} (tu)</div>
                <div className="lbm-pts"><Counter target={profile.points} style={{color:'var(--violet)'}} delay={720}/></div>
              </div>
            )}
          </div>
        </div>

        
        <div className="storico-wrap animate-in delay-6">
          <div className="section-header">
            <div className="section-title">📋 Storico flag</div>
            <span style={{fontSize:'12px',color:'var(--text3)'}}>{submissions.length} flag catturate</span>
          </div>
          {submissions.length === 0 ? (
            <div style={{padding:'16px',textAlign:'center',fontSize:'12px',color:'var(--text3)'}}>
              Nessuna flag ancora — vai a risolvere qualcosa!
            </div>
          ) : (
            <div className="storico-list">
              {submissions.map((s, i) => {
                const cs = CAT_STYLE[s.challenge?.category] || CAT_STYLE.Cryptography;
                return (
                  <div key={s._id || i} className="storico-item">
                    <span className="storico-cat" style={{background: cs.bg, color: cs.c}}>{s.challenge?.category || '—'}</span>
                    <span className="storico-title">{s.challenge?.title || 'Challenge'}</span>
                    <span className="storico-pts">+{s.pointsAwarded} pts</span>
                    <span className="storico-date">{new Date(s.createdAt).toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'numeric'})}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        
        {editModal && (
          <div className="ep-overlay" onClick={() => setEditModal(false)}>
            <div className="ep-modal" onClick={e => e.stopPropagation()}>
              <div className="ep-title">Modifica profilo</div>
              <div className="ep-field">
                <div className="ep-lbl">Username</div>
                <input className="ep-input" type="text" maxLength={30}
                  value={editForm.username}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="ep-field">
                <div className="ep-lbl">Bio</div>
                <textarea className="ep-input" rows={3} maxLength={300}
                  placeholder="Presentati in max 300 caratteri…"
                  value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} />
              </div>
              <div className="ep-field">
                <div className="ep-lbl">Avatar (URL o emoji)</div>
                <input className="ep-input" type="text" placeholder="es. https://… oppure 🦊"
                  value={editForm.avatar}
                  onChange={e => setEditForm(f => ({ ...f, avatar: e.target.value }))} />
              </div>
              {editError && <div className="ep-error">{editError}</div>}
              <div className="ep-actions">
                <button className="ep-cancel" onClick={() => setEditModal(false)}>Annulla</button>
                <button className="ep-save" onClick={handleSalvaProfilo} disabled={editLoading || !editForm.username.trim()}>
                  {editLoading ? 'Salvataggio…' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
