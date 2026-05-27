import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, challengesAPI } from '../services/api';

/* ─── Config ──────────────────────────────────────────────────────────────── */
const CAT_TABS = [
  { id: 'all',      label: 'Tutte',     count: null, icon: null,  color: null,             bg: null,                    cls: '' },
  { id: 'Web',      label: 'Web',       count: null, icon: '💻', color: 'var(--fuchsia)', bg: 'rgba(232,112,184,.12)', cls: 'cc-web'      },
  { id: 'Crypto',   label: 'Crypto',    count: null, icon: '🔐', color: 'var(--violet)',  bg: 'rgba(124,111,234,.12)', cls: 'cc-crypto'   },
  { id: 'Forensics',label: 'Forensics', count: null, icon: '🔎', color: 'var(--amber)',   bg: 'rgba(246,198,82,.12)',  cls: 'cc-forensics'},
  { id: 'Pwn',      label: 'Pwn',       count: null, icon: '💀', color: 'var(--coral)',   bg: 'rgba(240,112,96,.12)',  cls: 'cc-reverse'  },
  { id: 'Reverse',  label: 'Reverse',   count: null, icon: '⚙️', color: 'var(--coral)',   bg: 'rgba(240,112,96,.12)',  cls: 'cc-reverse'  },
  { id: 'OSINT',    label: 'OSINT',     count: null, icon: '🔍', color: 'var(--cyan)',    bg: 'rgba(91,196,212,.12)',  cls: 'cc-osint'    },
  { id: 'Misc',     label: 'Misc',      count: null, icon: '🔧', color: 'var(--text2)',   bg: 'rgba(138,150,176,.10)', cls: 'cc-misc'     },
];

const CAT_STYLE = {
  Web:          { color:'var(--fuchsia)',bg:'rgba(232,112,184,.12)', cls:'cc-web'       },
  Crypto:       { color:'var(--violet)', bg:'rgba(124,111,234,.12)', cls:'cc-crypto'    },
  Cryptography: { color:'var(--violet)', bg:'rgba(124,111,234,.12)', cls:'cc-crypto'    },
  Forensics:    { color:'var(--amber)',  bg:'rgba(246,198,82,.12)',  cls:'cc-forensics' },
  Pwn:          { color:'var(--coral)',  bg:'rgba(240,112,96,.12)',  cls:'cc-reverse'   },
  Reverse:      { color:'var(--coral)',  bg:'rgba(240,112,96,.12)',  cls:'cc-reverse'   },
  OSINT:        { color:'var(--cyan)',   bg:'rgba(91,196,212,.12)',  cls:'cc-osint'     },
  Misc:         { color:'var(--text2)',  bg:'rgba(138,150,176,.10)', cls:'cc-misc'      },
  Steganography:{ color:'var(--mint)',   bg:'rgba(92,206,138,.12)',  cls:'cc-stegano'   },
};

const CAT_ICON = {
  Web:'💻', Crypto:'🔐', Cryptography:'🔐', Forensics:'🔎',
  Pwn:'💀', Reverse:'⚙️', OSINT:'🔍', Misc:'🔧', Steganography:'🖼️',
};

const DIFF_STYLE = {
  Easy:  { c:'var(--mint)',  bg:'var(--mint-bg)',  b:'rgba(92,206,138,.25)' },
  Medium:{ c:'var(--amber)', bg:'var(--amber-bg)', b:'rgba(246,198,82,.25)' },
  Hard:  { c:'var(--coral)', bg:'var(--coral-bg)', b:'rgba(240,112,96,.25)' },
};

const LIMIT = 12;

function getPaginationItems(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  if (cur > 3) items.push('…');
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) items.push(i);
  if (cur < total - 2) items.push('…');
  if (total > 1) items.push(total);
  return items;
}

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
:root{--bg:#111827;--bg2:#1a2235;--bg3:#1e2a3a;--bg4:#212d40;--border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);--text1:#f0f4ff;--text2:#8a96b0;--text3:#4a5568;--violet:#7C6FEA;--violet-bg:rgba(124,111,234,0.10);--fuchsia:#E870B8;--fuchsia-bg:rgba(232,112,184,0.10);--cyan:#5BC4D4;--cyan-bg:rgba(91,196,212,0.10);--mint:#5CCE8A;--mint-bg:rgba(92,206,138,0.10);--amber:#F6C652;--amber-bg:rgba(246,198,82,0.10);--coral:#F07060;--coral-bg:rgba(240,112,96,0.10);--navbar-h:56px}
[data-theme="light"]{--bg:#f8f9fc;--bg2:#ffffff;--bg3:#f1f3f8;--bg4:#e8ebf2;--border:rgba(0,0,0,0.07);--border2:rgba(0,0,0,0.12);--text1:#0f1623;--text2:#5a6480;--text3:#9aa3b8}
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%}
body{font-family:'DM Sans',sans-serif;font-size:14px;background:var(--bg);color:var(--text1)}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:40px 40px}
[data-theme="light"] body::before{background-image:linear-gradient(rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px)}
.orb{position:fixed;border-radius:50%;filter:blur(130px);pointer-events:none;z-index:0}
.o1{width:700px;height:700px;background:rgba(124,111,234,0.055);top:-200px;right:-150px}
.o2{width:400px;height:400px;background:rgba(232,112,184,0.04);bottom:-100px;left:-80px}
[data-theme="light"] .orb{opacity:0}
@keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes scaleIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
@keyframes flagWave{0%,100%{transform:rotate(-3deg) scale(1)}50%{transform:rotate(3deg) scale(1.1)}}
@keyframes spin{to{transform:rotate(360deg)}}
.navbar{position:fixed;top:0;left:0;right:0;z-index:500;height:var(--navbar-h);padding:0 24px;display:flex;align-items:center;background:rgba(17,24,39,0.92);backdrop-filter:blur(20px);border-bottom:0.5px solid var(--border);gap:0}
[data-theme="light"] .navbar{background:rgba(248,249,252,0.95)}
.grad-strip{position:fixed;top:var(--navbar-h);left:0;right:0;height:2px;background:linear-gradient(90deg,var(--violet),var(--fuchsia),var(--cyan),var(--mint),var(--amber));z-index:499}
.nav-logo{display:flex;align-items:center;gap:8px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text1);text-decoration:none;margin-right:28px}
.nav-items{display:flex;gap:2px;flex:1}
.nav-item{font-size:13px;color:var(--text2);padding:6px 13px;border-radius:8px;cursor:pointer;transition:all .15s;text-decoration:none;display:flex;align-items:center;gap:6px}
.nav-item:hover{color:var(--text1);background:rgba(255,255,255,.05)}
[data-theme="light"] .nav-item:hover{background:rgba(0,0,0,.04)}
.nav-item.active{color:var(--violet);background:var(--violet-bg);font-weight:500}
.nav-right{display:flex;align-items:center;gap:9px;margin-left:auto}
.nav-av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--violet),var(--fuchsia));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;cursor:pointer;border:2px solid rgba(124,111,234,.3)}
.mode-toggle{display:flex;align-items:center;gap:6px;padding:5px 11px 5px 7px;border-radius:20px;border:0.5px solid var(--border2);background:var(--bg2);cursor:pointer;font-size:12px;color:var(--text2)}
[data-theme="light"] .mode-toggle{background:#fff}
.toggle-track{width:26px;height:14px;border-radius:7px;background:var(--violet);position:relative;flex-shrink:0}
.toggle-thumb{position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.5,0,.5,1.4)}
[data-theme="light"] .toggle-thumb{transform:translateX(12px)}
.page{padding-top:calc(var(--navbar-h) + 2px);max-width:1400px;margin:0 auto;padding-left:28px;padding-right:28px;padding-bottom:60px;position:relative;z-index:1}
.arena-hero{padding:32px 0 28px;opacity:0;animation:fadeInUp .5s .05s ease forwards}
.hero-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--violet);padding:5px 13px;border-radius:20px;background:var(--violet-bg);border:0.5px solid rgba(124,111,234,.25);font-family:'JetBrains Mono',monospace;margin-bottom:12px}
.ey-dot{width:5px;height:5px;border-radius:50%;background:var(--violet);animation:pulse 2s infinite}
.hero-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:24px}
.hero-title{font-family:'Syne',sans-serif;font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.hero-grad{background:linear-gradient(135deg,var(--violet),var(--fuchsia),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200%;animation:shimmer 4s linear infinite}
.hero-sub{font-size:14px;color:var(--text2);margin-top:6px;line-height:1.6}
.hero-stats{display:flex;gap:10px;flex-wrap:wrap}
.hs{display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:10px;background:var(--bg2);border:0.5px solid var(--border2)}
[data-theme="light"] .hs{background:#fff}
.hs-ico{font-size:16px}
.hs-val{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;line-height:1}
.hs-lbl{font-size:10px;color:var(--text3)}
.cat-tabs{display:flex;gap:7px;margin-bottom:22px;flex-wrap:wrap;opacity:0;animation:fadeInUp .5s .1s ease forwards}
.cat-tab{display:flex;align-items:center;gap:7px;padding:8px 16px;border-radius:10px;border:0.5px solid var(--border2);background:var(--bg2);font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif;user-select:none}
[data-theme="light"] .cat-tab{background:#fff}
.cat-tab:hover{color:var(--text1);transform:translateY(-1px)}
.cat-tab.active{color:#fff;border-color:transparent;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.2);background:linear-gradient(135deg,var(--violet),var(--fuchsia))}
.ct-count{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;padding:1px 6px;border-radius:5px;background:rgba(255,255,255,.15)}
.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:20px;flex-wrap:wrap;opacity:0;animation:fadeInUp .5s .15s ease forwards}
.search-box{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:10px;flex:1;max-width:300px}
[data-theme="light"] .search-box{background:#fff}
.search-box input{background:transparent;border:none;outline:none;font-size:13px;color:var(--text1);width:100%;font-family:'DM Sans',sans-serif}
.search-box input::placeholder{color:var(--text3)}
.filter-grp{display:flex;gap:6px}
.fbtn{padding:7px 14px;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg2);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
[data-theme="light"] .fbtn{background:#fff}
.fbtn:hover{color:var(--text1)}
.fbtn.active{font-weight:600}
.show-solved{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text2);cursor:pointer;padding:7px 12px;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg2);transition:all .15s;margin-left:auto;user-select:none}
[data-theme="light"] .show-solved{background:#fff}
.show-solved.active{color:var(--mint);border-color:rgba(92,206,138,.3)}
.ch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-bottom:32px;min-height:200px}
.grid-empty{grid-column:1/-1;display:flex;align-items:center;justify-content:center;height:200px;color:var(--text3);font-size:14px;flex-direction:column;gap:10px}
.grid-loader{grid-column:1/-1;display:flex;align-items:center;justify-content:center;height:200px;gap:10px;color:var(--text2)}
.spin{width:20px;height:20px;border:2px solid var(--border2);border-top-color:var(--violet);border-radius:50%;animation:spin 0.8s linear infinite}
.ch-card{background:var(--bg2);border:0.5px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:12px}
[data-theme="light"] .ch-card{background:#fff}
.ch-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0;opacity:0;transition:opacity .2s}
.ch-card:hover{transform:translateY(-3px);border-color:var(--border2);box-shadow:0 8px 28px rgba(0,0,0,.2)}
.ch-card:hover::before{opacity:1}
.ch-card.solved{border-color:rgba(92,206,138,.2)}
.ch-card.solved::after{content:'✓';position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;background:var(--mint);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0a1a10}
.cc-crypto::before{background:linear-gradient(90deg,var(--violet),var(--fuchsia))}
.cc-web::before{background:linear-gradient(90deg,var(--fuchsia),var(--coral))}
.cc-osint::before{background:linear-gradient(90deg,var(--cyan),var(--mint))}
.cc-stegano::before{background:linear-gradient(90deg,var(--mint),var(--cyan))}
.cc-forensics::before{background:linear-gradient(90deg,var(--amber),var(--coral))}
.cc-reverse::before{background:linear-gradient(90deg,var(--coral),var(--amber))}
.ch-ico{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0}
.ch-cat-lbl{font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
.ch-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-desc{font-size:12px;color:var(--text2);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ch-footer{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.diff-p{font-size:10px;font-weight:700;padding:3px 9px;border-radius:6px}
.pts-p{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;background:var(--amber-bg);color:var(--amber);border:0.5px solid rgba(246,198,82,.2)}
.solves-p{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px;margin-left:auto;font-family:'JetBrains Mono',monospace}
.blood-p{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;background:var(--coral-bg);color:var(--coral);border:0.5px solid rgba(240,112,96,.2)}
.new-p{position:absolute;top:10px;left:10px;font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;background:linear-gradient(135deg,var(--violet),var(--fuchsia));color:#fff;font-family:'JetBrains Mono',monospace}
.overlay{position:fixed;inset:0;z-index:700;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(7,9,15,.78);backdrop-filter:blur(14px);animation:fadeIn .25s ease}
[data-theme="light"] .overlay{background:rgba(240,242,248,.75)}
.sm{width:100%;max-width:560px;background:var(--bg2);border:0.5px solid var(--border2);border-radius:18px;overflow:hidden;animation:scaleIn .35s cubic-bezier(.34,1.56,.64,1)}
[data-theme="light"] .sm{background:#fff}
.sm-bar{height:3px;background-size:200%;animation:shimmer 3s linear infinite}
.sm-close{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:50%;border:0.5px solid var(--border2);background:var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);z-index:5;font-size:14px;line-height:1}
[data-theme="light"] .sm-close{background:var(--bg3)}
.sm-close:hover{color:var(--text1)}
.sm-inner{padding:24px;position:relative;max-height:85vh;overflow-y:auto}
.sm-inner::-webkit-scrollbar{width:3px}
.sm-inner::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.sm-hdr{display:flex;gap:14px;align-items:flex-start;margin-bottom:18px}
.sm-ico{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
.sm-cat{font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.sm-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;line-height:1.2;margin-bottom:6px}
.sm-bdgs{display:flex;gap:6px;flex-wrap:wrap}
.sm-desc{font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:16px;padding:14px;background:var(--bg3);border-radius:10px;border:0.5px solid var(--border)}
[data-theme="light"] .sm-desc{background:var(--bg4)}
.sm-section-lbl{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;display:flex;align-items:center;gap:7px}
.sm-section-lbl::after{content:'';flex:1;height:0.5px;background:var(--border)}
.sm-hints{margin-bottom:16px}
.hint-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:var(--bg3);border:0.5px solid var(--border);margin-bottom:5px;cursor:pointer;transition:all .15s}
[data-theme="light"] .hint-row{background:var(--bg4)}
.hint-row:hover{border-color:var(--amber)}
.hint-row.revealed{border-color:var(--amber);cursor:default}
.hint-cost{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--amber);font-weight:600;flex-shrink:0}
.hint-cost.done{color:var(--mint)}
.hint-txt{font-size:12px;color:var(--text2);flex:1}
.hint-revealed-txt{font-size:12px;color:var(--text1);flex:1;font-style:italic}
.flag-sec{background:var(--bg3);border:0.5px solid var(--border);border-radius:12px;padding:14px}
[data-theme="light"] .flag-sec{background:var(--bg4)}
.flag-sec-lbl{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.flag-row{display:flex;gap:8px}
.flag-inp{flex:1;padding:11px 14px;border-radius:9px;border:0.5px solid var(--border2);background:var(--bg2);color:var(--text1);font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s;font-family:'JetBrains Mono',monospace;letter-spacing:.03em}
[data-theme="light"] .flag-inp{background:#fff}
.flag-inp:focus{border-color:var(--violet);box-shadow:0 0 0 3px rgba(124,111,234,.1)}
.flag-inp.err{border-color:var(--coral);animation:shake .4s ease}
.flag-inp.ok{border-color:var(--mint);background:rgba(92,206,138,.04)}
.flag-inp::placeholder{color:var(--text3)}
.submit-btn{padding:11px 20px;border-radius:9px;border:none;background:linear-gradient(135deg,var(--violet),var(--fuchsia));color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;flex-shrink:0;position:relative;overflow:hidden;transition:all .2s;display:flex;align-items:center;gap:6px}
.submit-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);background-size:200%;animation:shimmer 2s linear infinite}
.submit-btn span{position:relative;z-index:1}
.submit-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(124,111,234,.35)}
.submit-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
.flag-fb{margin-top:8px;font-size:12px;padding:7px 10px;border-radius:7px;display:flex;align-items:center;gap:7px}
.flag-fb.ok{color:var(--mint);background:var(--mint-bg);border:0.5px solid rgba(92,206,138,.2)}
.flag-fb.ko{color:var(--coral);background:var(--coral-bg);border:0.5px solid rgba(240,112,96,.2)}
.sm-solved{position:absolute;inset:0;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;text-align:center;padding:30px;z-index:10;animation:fadeIn .4s ease}
[data-theme="light"] .sm-solved{background:#fff}
.sv-emoji{font-size:56px;animation:flagWave 1s ease-in-out infinite}
.sv-title{font-family:'Syne',sans-serif;font-size:24px;font-weight:800}
.sv-pts{font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:var(--mint);line-height:1}
.sv-sub{font-size:13px;color:var(--text2);max-width:300px;line-height:1.6}
.sv-btn{padding:11px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--mint),var(--cyan));color:#0a1a10;font-size:14px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif;margin-top:6px;transition:all .2s}
.sv-btn:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(92,206,138,.35)}
.pagination{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px}
.pg-btn{min-width:34px;height:34px;padding:0 8px;border-radius:8px;border:0.5px solid var(--border2);background:var(--bg2);color:var(--text2);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;transition:all .15s}
[data-theme="light"] .pg-btn{background:#fff}
.pg-btn:hover{color:var(--text1);border-color:var(--violet)}
.pg-btn.active{background:var(--violet);color:#fff;border-color:var(--violet);font-weight:700}
.pg-btn:disabled{opacity:.4;cursor:not-allowed}
.pg-dots{color:var(--text3);padding:0 6px;font-family:'JetBrains Mono',monospace}
@media(max-width:640px){.page{padding-left:14px;padding-right:14px}.hero-title{font-size:24px}.ch-grid{grid-template-columns:1fr}.hero-row{flex-direction:column;align-items:flex-start}}
`;

/* ─── Component ───────────────────────────────────────────────────────────── */
export default function CTFArena() {
  const { loading: authLoading } = useAuth();

  const [theme,   setTheme]   = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [profile, setProfile] = useState(null);

  const [challenges, setChallenges] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [loading,    setLoading]    = useState(true);
  const [solvedIds,  setSolvedIds]  = useState(new Set());

  const [selectedCat,     setSelectedCat]     = useState('all');
  const [selectedDiff,    setSelectedDiff]    = useState('all');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hideSolved,      setHideSolved]      = useState(false);
  const [page,            setPage]            = useState(1);

  const [modal,          setModal]          = useState(null);
  const [flagInput,      setFlagInput]      = useState('');
  const [flagStatus,     setFlagStatus]     = useState('idle');
  const [flagShakeKey,   setFlagShakeKey]   = useState(0);
  const [earnedPts,      setEarnedPts]      = useState(0);
  const [hintsRevealed,  setHintsRevealed]  = useState({});
  const [hintLoadingIdx, setHintLoadingIdx] = useState(null);

  const flagInputRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    usersAPI.getMe().then(({ data }) => {
      const me = data.user ?? data;
      setProfile(me);
      setSolvedIds(new Set((me.solvedChallenges || []).map(String)));
    }).catch(() => {});
  }, [authLoading]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (selectedCat !== 'all') params.category = selectedCat;
    if (selectedDiff !== 'all') params.difficulty = selectedDiff;
    if (debouncedSearch) params.search = debouncedSearch;

    challengesAPI.getAll(params)
      .then(({ data }) => {
        if (!active) return;
        setChallenges(data.challenges || []);
        setPagination({ total: data.total ?? 0, pages: 1, page: 1 });
      })
      .catch(() => { if (active) setChallenges([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [page, selectedCat, selectedDiff, debouncedSearch, authLoading]);

  useEffect(() => {
    document.body.style.overflow = modal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (modal && flagStatus !== 'correct') {
      setTimeout(() => flagInputRef.current?.focus(), 400);
    }
  }, [modal]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  };

  const openModal = (ch) => {
    setModal(ch);
    setFlagInput('');
    setFlagStatus('idle');
    setHintsRevealed({});
    setHintLoadingIdx(null);
    setEarnedPts(0);
    setFlagShakeKey(0);
  };

  const closeModal = () => setModal(null);

  const revealHint = async (idx) => {
    if (hintsRevealed[idx] !== undefined || hintLoadingIdx !== null) return;
    setHintLoadingIdx(idx);
    try {
      const { data } = await challengesAPI.getHint(modal._id, idx);
      const text = data.text ?? data.hint?.text ?? String(data);
      setHintsRevealed(prev => ({ ...prev, [idx]: text }));
    } catch {
      setHintsRevealed(prev => ({ ...prev, [idx]: 'Impossibile caricare il suggerimento.' }));
    } finally {
      setHintLoadingIdx(null);
    }
  };

  const submitFlag = async () => {
    if (!modal || !flagInput.trim() || flagStatus === 'submitting') return;
    setFlagStatus('submitting');
    try {
      const { data } = await challengesAPI.submitFlag(modal._id, { flag: flagInput.trim() });
      setEarnedPts(data.points ?? data.pointsEarned ?? modal.points);
      setFlagStatus('correct');
      setSolvedIds(prev => new Set([...prev, String(modal._id)]));
    } catch {
      setFlagStatus('wrong');
      setFlagShakeKey(k => k + 1);
      setTimeout(() => setFlagStatus('idle'), 2500);
    }
  };

  const changeCat  = (id) => { setSelectedCat(id);  setPage(1); };
  const changeDiff = (d)  => { setSelectedDiff(d);  setPage(1); };

  const displayed  = hideSolved ? challenges.filter(ch => !solvedIds.has(String(ch._id))) : challenges;
  const initials   = (profile?.username || 'US').slice(0, 2).toUpperCase();
  const totalPages = pagination.pages || 1;
  const pgItems    = getPaginationItems(page, totalPages);

  const mCat  = modal ? (CAT_STYLE[modal.category]  || CAT_STYLE.Cryptography) : null;
  const mDiff = modal ? (DIFF_STYLE[modal.difficulty] || DIFF_STYLE.Easy)       : null;
  const hintsCount = Object.keys(hintsRevealed).length;

  return (
    <>
      <style>{CSS}</style>
      <div className="orb o1"/><div className="orb o2"/>

      {/* ── Modal ── */}
      {modal && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="sm">
            <div className="sm-bar" style={{ background: `linear-gradient(90deg,${mCat.color},${modal.difficulty === 'Hard' ? 'var(--coral)' : mCat.color})` }}/>
            <div className="sm-inner">
              <button className="sm-close" onClick={closeModal}>✕</button>

              {flagStatus === 'correct' && (
                <div className="sm-solved">
                  <div className="sv-emoji">🚩</div>
                  <div className="sv-title">Flag catturata!</div>
                  <div className="sv-pts">+{earnedPts}</div>
                  <div className="sv-sub">
                    Guadagnati {earnedPts} punti.{' '}
                    {hintsCount > 0
                      ? `(-${hintsCount * 50} pts per i suggerimenti)`
                      : 'Bonus intero — nessun suggerimento!'}
                  </div>
                  <button className="sv-btn" onClick={closeModal}>Continua →</button>
                </div>
              )}

              <div className="sm-hdr">
                <div className="sm-ico" style={{ background: mCat.bg }}>{CAT_ICON[modal.category] || '🔐'}</div>
                <div>
                  <div className="sm-cat" style={{ color: mCat.color }}>{modal.category}</div>
                  <div className="sm-title">{modal.title}</div>
                  <div className="sm-bdgs">
                    <span className="diff-p" style={{ background: mDiff.bg, color: mDiff.c, border: `0.5px solid ${mDiff.b}` }}>{modal.difficulty}</span>
                    <span className="pts-p">+{modal.points} pts</span>
                    {modal.isFirstBlood && <span className="blood-p">🩸 First Blood</span>}
                  </div>
                </div>
              </div>

              <div className="sm-desc">{modal.description}</div>

              {modal.hints?.length > 0 && (
                <div className="sm-hints">
                  <div className="sm-section-lbl">💡 Suggerimenti</div>
                  {modal.hints.map((hint, i) => {
                    const revealed  = hintsRevealed[i];
                    const isLoading = hintLoadingIdx === i;
                    return (
                      <div
                        key={i}
                        className={`hint-row${revealed !== undefined ? ' revealed' : ''}`}
                        onClick={() => revealed === undefined && revealHint(i)}
                      >
                        <span style={{ fontSize: '14px' }}>💡</span>
                        {revealed !== undefined
                          ? <div className="hint-revealed-txt">{revealed}</div>
                          : <div className="hint-txt">
                              {isLoading
                                ? 'Caricamento...'
                                : `Suggerimento ${i + 1} — scopri (-${hint.cost ?? 50} pts)`}
                            </div>
                        }
                        <span className={`hint-cost${revealed !== undefined ? ' done' : ''}`}>
                          {revealed !== undefined ? '✓' : isLoading ? '…' : `-${hint.cost ?? 50}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flag-sec">
                <div className="flag-sec-lbl">🚩 Inserisci la flag</div>
                <div className="flag-row">
                  <input
                    key={`flag-${flagShakeKey}`}
                    ref={flagInputRef}
                    className={`flag-inp${flagStatus === 'wrong' ? ' err' : flagStatus === 'correct' ? ' ok' : ''}`}
                    type="text"
                    placeholder="FLAG{...}"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitFlag()}
                    disabled={flagStatus === 'correct'}
                  />
                  <button
                    className="submit-btn"
                    onClick={submitFlag}
                    disabled={flagStatus === 'submitting' || flagStatus === 'correct'}
                  >
                    <span>{flagStatus === 'submitting' ? '…' : 'Invia ↵'}</span>
                  </button>
                </div>
                {flagStatus === 'wrong' && (
                  <div className="flag-fb ko">✗ Flag errata. Controlla il formato FLAG{'{...}'}</div>
                )}
                {flagStatus === 'submitting' && (
                  <div className="flag-fb" style={{ color: 'var(--text2)', background: 'var(--bg3)' }}>
                    ⟳ Verifica in corso...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="navbar">
        <Link className="nav-logo" to="/">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <defs><linearGradient id="nlg-ctf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7C6FEA"/><stop offset="100%" stopColor="#5BC4D4"/></linearGradient></defs>
            <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3" fill="rgba(124,111,234,0.15)" stroke="url(#nlg-ctf)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          CyberNexus
        </Link>
        <div className="nav-items">
          <Link className="nav-item" to="/dashboard">Dashboard</Link>
          <Link className="nav-item active" to="/ctf">CTF Arena</Link>
          <Link className="nav-item" to="/warroom">War Room</Link>
          <Link className="nav-item" to="/leaderboard">Leaderboard</Link>
        </div>
        <div className="nav-right">
          <div className="mode-toggle" onClick={toggleTheme}>
            <div className="toggle-track"><div className="toggle-thumb"/></div>
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </div>
          <div className="nav-av">{initials}</div>
        </div>
      </nav>
      <div className="grad-strip"/>

      <div className="page">

        {/* ── Hero ── */}
        <div className="arena-hero">
          <div className="hero-eyebrow"><div className="ey-dot"/>CTF Arena — Stagione 01/2026</div>
          <div className="hero-row">
            <div>
              <h1 className="hero-title">
                Cattura le flag.<br/>
                <span className="hero-grad">Scala la classifica.</span>
              </h1>
              <p className="hero-sub">
                {pagination.total || 380} sfide in 6 categorie. Dalla crittografia al forensics, ogni livello ti prepara al campo reale.
              </p>
            </div>
            <div className="hero-stats">
              <div className="hs">
                <span className="hs-ico">🚩</span>
                <div>
                  <div className="hs-val" style={{ color: 'var(--violet)' }}>{solvedIds.size}</div>
                  <div className="hs-lbl">Flag tue</div>
                </div>
              </div>
              <div className="hs">
                <span className="hs-ico">⭐</span>
                <div>
                  <div className="hs-val" style={{ color: 'var(--mint)' }}>{(profile?.points || 0).toLocaleString('it-IT')}</div>
                  <div className="hs-lbl">Punti</div>
                </div>
              </div>
              <div className="hs">
                <span className="hs-ico">🏆</span>
                <div>
                  <div className="hs-val" style={{ color: 'var(--amber)' }}>#42</div>
                  <div className="hs-lbl">Rank</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div className="cat-tabs">
          {CAT_TABS.map(tab => (
            <div
              key={tab.id}
              className={`cat-tab${selectedCat === tab.id ? ' active' : ''}`}
              onClick={() => changeCat(tab.id)}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.count !== null && (
                <span className="ct-count" style={selectedCat !== tab.id && tab.color ? { color: tab.color } : {}}>
                  {tab.count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Cerca sfide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-grp">
            {['all', 'Easy', 'Medium', 'Hard'].map(d => {
              const ds = DIFF_STYLE[d];
              const active = selectedDiff === d;
              return (
                <button
                  key={d}
                  className={`fbtn${active ? ' active' : ''}`}
                  style={ds ? { color: ds.c, borderColor: active ? ds.b : undefined, background: active ? ds.bg : undefined } : {}}
                  onClick={() => changeDiff(d)}
                >
                  {d === 'all' ? 'Tutte' : d}
                </button>
              );
            })}
          </div>
          <div
            className={`show-solved${hideSolved ? ' active' : ''}`}
            onClick={() => setHideSolved(h => !h)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {hideSolved ? 'Mostra risolte' : 'Nascondi risolte'}
          </div>
        </div>

        {/* ── Challenge grid ── */}
        <div className="ch-grid">
          {loading ? (
            <div className="grid-loader"><div className="spin"/><span>Caricamento sfide...</span></div>
          ) : displayed.length === 0 ? (
            <div className="grid-empty"><span style={{ fontSize: '32px' }}>🔍</span><span>Nessuna sfida trovata</span></div>
          ) : displayed.map((ch, i) => {
            const cs     = CAT_STYLE[ch.category] || CAT_STYLE.Cryptography;
            const ds     = DIFF_STYLE[ch.difficulty] || DIFF_STYLE.Easy;
            const solved = solvedIds.has(String(ch._id));
            return (
              <div
                key={ch._id}
                className={`ch-card ${cs.cls}${solved ? ' solved' : ''}`}
                style={{ opacity: 0, animation: `fadeInUp .4s ${i * 0.04}s ease forwards` }}
                onClick={() => openModal(ch)}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div className="ch-ico" style={{ background: cs.bg }}>{CAT_ICON[ch.category] || '🔐'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ch-cat-lbl" style={{ color: cs.color }}>{ch.category}</div>
                    <div className="ch-name">{ch.title}</div>
                  </div>
                </div>
                <div className="ch-desc">{ch.description}</div>
                <div className="ch-footer">
                  <span className="diff-p" style={{ background: ds.bg, color: ds.c, border: `0.5px solid ${ds.b}` }}>{ch.difficulty}</span>
                  <span className="pts-p">+{ch.points} pts</span>
                  {ch.isFirstBlood && <span className="blood-p">🩸 First Blood</span>}
                  <span className="solves-p">👥 {ch.solveCount ?? 0}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {pgItems.map((item, i) =>
              item === '…' ? (
                <span key={`d${i}`} className="pg-dots">...</span>
              ) : (
                <button key={item} className={`pg-btn${page === item ? ' active' : ''}`} onClick={() => setPage(item)}>
                  {item}
                </button>
              )
            )}
            <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}

      </div>
    </>
  );
}
