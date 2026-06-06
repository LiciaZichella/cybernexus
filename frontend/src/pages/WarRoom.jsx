import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import NavDropdown from '../components/NavDropdown';
import { warroomAPI, getMemoryToken } from '../services/api';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './WarRoom.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5005';

// ── Dati statici playbook ──────────────────────────────────────────────────────
const PASSI = [
  {
    icon: '🔍', categoria: 'Identificazione',
    titolo: 'Analizzare alert SIEM e classificare severità',
    desc: "Esamina l'alert, verifica i log e classifica la severità.",
    guida: 'Ricevi e analizza l\'alert. Verifica i log su <strong>SIEM</strong> e controlla i sistemi coinvolti.',
    obiettivi: ['Aprire ticket sul SIEM', 'Verificare la severità', 'Controllare sistemi coinvolti', 'Assegnare priorità'],
    tag: 'SIEM', avColore: 'var(--violet)', avIni: 'AL',
  },
  {
    icon: '🥇', categoria: 'Identificazione',
    titolo: 'Aprire War Room e assegnare i ruoli',
    desc: 'Crea la War Room, invita il team e assegna i ruoli.',
    guida: 'Crea la <strong>War Room</strong> e assegna: Lead Analyst, Forensics, Network Engineer.',
    obiettivi: ['Creare la War Room', 'Invitare il team', 'Assegnare Lead Analyst', 'Assegnare Forensics', 'Attivare il playbook'],
    tag: 'Team', avColore: 'var(--violet)', avIni: 'AL',
  },
  {
    icon: '💾', categoria: 'Contenimento',
    titolo: 'Dump della memoria dei sistemi affetti',
    desc: 'Esegui il dump RAM prima di toccare qualsiasi cosa.',
    guida: 'Esegui il <strong>dump RAM</strong> con <code>winpmem</code>. I dati volatili si perdono al riavvio.',
    obiettivi: ['SSH su server-prod-01', 'Eseguire dump con winpmem', 'Verificare integrità dump', 'Copiare su storage sicuro'],
    tag: 'Memory', avColore: 'var(--fuchsia)', avIni: 'GB',
  },
  {
    icon: '🔒', categoria: 'Contenimento',
    titolo: 'Isolare i sistemi compromessi dalla rete',
    desc: 'Blocca il traffico di rete per fermare la propagazione.',
    guida: '<strong>server-prod-01</strong> e <strong>server-prod-03</strong> devono essere isolati dalla rete. Accedi a <code>firewall-01</code> via SSH e applica le access-list di isolamento su entrambe le interfacce.',
    obiettivi: ['Accedere a firewall-01 via SSH', 'Applicare access-list su eth0', 'Applicare access-list su eth1', 'Disabilitare VPN temporaneamente', 'Verificare: ping → Request timeout'],
    tag: 'Network', avColore: 'var(--cyan)', avIni: 'MR',
  },
  {
    icon: '📸', categoria: 'Contenimento',
    titolo: 'Snapshot dei sistemi come prova digitale',
    desc: 'Crea immagine bit-per-bit. Calcola hash SHA-256.',
    guida: 'Crea immagine con <code>dd</code>. Calcola <code>sha256sum</code> per ogni file e archivia in storage isolato.',
    obiettivi: ['Snapshot disco server-prod-01', 'Snapshot disco server-prod-03', 'Calcolare hash SHA-256', 'Archiviare in storage isolato'],
    tag: 'Backup', avColore: 'var(--violet)', avIni: 'AL',
  },
  {
    icon: '🔬', categoria: 'Analisi',
    titolo: 'Analizzare dump per identificare malware',
    desc: 'Usa Volatility per estrarre artefatti dal dump.',
    guida: 'Usa <strong>Volatility</strong>: <code>pslist</code>, <code>netscan</code>, <code>malfind</code>. Identifica famiglia malware e vettore d\'ingresso.',
    obiettivi: ['Aprire dump con Volatility', 'Analizzare lista processi (pslist)', 'Identificare famiglia malware', 'Trovare vettore d\'ingresso', 'Documentare artefatti'],
    tag: 'Malware', avColore: 'var(--fuchsia)', avIni: 'GB',
  },
  {
    icon: '⚠️', categoria: 'Analisi',
    titolo: 'Verificare C2 attivi e bloccarli',
    desc: 'Identifica server C2 e blocca IP/domini sul firewall.',
    guida: 'Analizza le connessioni di rete dal dump. Identifica <strong>IP e domini C2</strong> e bloccali sul firewall perimetrale.',
    obiettivi: ['Analizzare connessioni di rete', 'Identificare IP C2', 'Bloccare C2 su firewall', 'Aggiornare blacklist DNS'],
    tag: 'C2', avColore: 'var(--cyan)', avIni: 'MR',
  },
  {
    icon: '🔁', categoria: 'Recovery',
    titolo: 'Ripristinare sistemi e applicare patch',
    desc: 'Restore da backup verificato. Patch CVE prima di rimettere online.',
    guida: 'Ripristina dal <strong>backup più recente</strong> integro. Applica subito la <strong>patch CVE-2024-3400</strong>.',
    obiettivi: ['Verificare integrità backup', 'Ripristinare server-prod-01', 'Ripristinare server-prod-03', 'Applicare patch CVE-2024-3400', 'Vulnerability scan post-patch'],
    tag: 'Recovery', avColore: 'var(--text3)', avIni: 'AL',
  },
];

// Gruppi del playbook per accordion
const GRUPPI_PLAYBOOK = [
  { key: 'id',          nome: 'Identificazione', colore: 'var(--mint)',   colBg: 'var(--mint-bg)',   indici: [0, 1] },
  { key: 'contenimento',nome: 'Contenimento',     colore: 'var(--amber)',  colBg: 'var(--amber-bg)',  indici: [2, 3, 4] },
  { key: 'analisi',     nome: 'Analisi',          colore: 'var(--coral)',  colBg: 'var(--coral-bg)',  indici: [5, 6] },
  { key: 'recovery',    nome: 'Recovery',         colore: 'var(--text2)', colBg: 'var(--bg3)',        indici: [7] },
];

// IOC statici (nella versione reale arriveranno dall'API)
const IOC_DEFAULT = [
  { tipo: 'IP',     tipoBg: 'var(--coral-bg)',   tipoCol: 'var(--coral)',   valore: '185.220.101.48',    stato: '✓ Bloccato',    statoBg: 'var(--mint-bg)',   statoCol: 'var(--mint)' },
  { tipo: 'Hash',   tipoBg: 'var(--amber-bg)',   tipoCol: 'var(--amber)',   valore: '4a7b9f2c1e8d...',  stato: '⚠ Attivo',     statoBg: 'var(--coral-bg)',  statoCol: 'var(--coral)' },
  { tipo: 'CVE',    tipoBg: 'var(--violet-bg)',  tipoCol: 'var(--violet)',  valore: 'CVE-2024-3400',     stato: 'Patch pend.',  statoBg: 'var(--amber-bg)',  statoCol: 'var(--amber)' },
  { tipo: 'IP',     tipoBg: 'var(--coral-bg)',   tipoCol: 'var(--coral)',   valore: '195.54.160.89',     stato: '✓ Bloccato',    statoBg: 'var(--mint-bg)',   statoCol: 'var(--mint)' },
  { tipo: 'Domain', tipoBg: 'var(--fuchsia-bg)', tipoCol: 'var(--fuchsia)',valore: 'lockbit3-c2.onion', stato: '✓ Bloccato',    statoBg: 'var(--mint-bg)',   statoCol: 'var(--mint)' },
  { tipo: 'File',   tipoBg: 'var(--cyan-bg)',    tipoCol: 'var(--cyan)',    valore: '!README.txt',       stato: '⚠ Trovato',    statoBg: 'var(--coral-bg)',  statoCol: 'var(--coral)' },
];

// (CMD_SETS rimosso — la logica dei comandi è ora nella funzione eseguiComando)

// Formatta secondi MM:SS
const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ── Componente ────────────────────────────────────────────────────────────────
export default function WarRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { aggiungiNotifica } = useNotifications();

  // Dati sala
  const [sala, setSala] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState('');
  const [sale, setSale] = useState([]);
  const [saleLoading, setSaleLoading] = useState(false);

  // Layout
  const [tema, setTema] = useState(
    document.documentElement.getAttribute('data-theme') || 'dark'
  );
  const [sinistraAperta, setSinistraAperta] = useState(true);
  const [destraAperta, setDestraAperta] = useState(true);
  const [sbCompresse, setSbCompresse] = useState({});

  // Playbook — inizia da zero, senza dati falsi (Bug 1)
  const [passoAttivo, setPassoAttivo] = useState(0);
  const [passiCompletati, setPassiCompletati] = useState(new Set());
  const [gruppiAperti, setGruppiAperti] = useState({ id: true, contenimento: true, analisi: true, recovery: false });

  // Pannello dettagli step
  const [dettagliAperto, setDettagliAperto] = useState(false);
  const [obiettiviCheck, setObiettiviCheck] = useState({});

  // Terminale — inizia vuoto, viene popolato dopo il caricamento della sala (Bug 3)
  const [righeTerminale, setRigheTerminale] = useState([]);
  const [comandoInput, setComandoInput] = useState('');
  const termBodyRef = useRef(null);

  // Chat — inizia vuota, viene popolata dalla storia DB e dagli eventi socket (Bug 4)
  const [messaggiChat, setMessaggiChat] = useState([]);
  const [inputChat, setInputChat] = useState('');
  const chatMsgsRef = useRef(null);

  // Timer
  const [tempoRimanente, setTempoRimanente] = useState(90 * 60);
  const [timerScaduto, setTimerScaduto] = useState(false);
  const timerRef = useRef(null);

  // Modali
  const [risolviAperto, setRisolviAperto] = useState(false);
  const [solAperta, setSolAperta] = useState(false);
  const [webhookSel, setWebhookSel] = useState({ discord: true, slack: false, email: false, custom: false });
  const [webhookInvio, setWebhookInvio] = useState(false);
  const [webhookInviato, setWebhookInviato] = useState(false);
  const [tempoElapsedMin, setTempoElapsedMin] = useState(0);
  const ptsCounterRef = useRef(null);

  // Typing indicator
  const [utenteCheScrive, setUtenteCheScrive] = useState('');
  const typingTimerRef   = useRef(null);
  const typingDebounceRef = useRef(null);

  // Anteprima sala nella lista (prima di entrare)
  const [previewSala, setPreviewSala] = useState(null);

  // Stato sala chiusa da terzi (evento room-resolved ricevuto da altri)
  const [salaChiusaDaAltri, setSalaChiusaDaAltri] = useState(false);
  const [risolutore,        setRisolutore]        = useState('');
  const [uiBloccata,        setUiBloccata]        = useState(false);

  // Membri online — inizia vuoto, l'utente corrente viene aggiunto all'init (Bug 2)
  const [membriOnline, setMembriOnline] = useState([]);

  // Log live — inizia vuoto, viene popolato da eventi reali socket (Bug 3)
  const [logFeed, setLogFeed] = useState([]);

  const socketRef = useRef(null);

  // ── Aggiunge riga al log live ────────────────────────────────────────────────
  const aggiungiLog = useCallback((testo, colore) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setLogFeed(prev => [...prev.slice(-19), { time, colore, testo, fresh: true }]);
  }, []);

  // ── Carica dati sala dall'API ────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!id) {
      setLoading(false);
      setSaleLoading(true);
      warroomAPI.getAll()
        .then(({ data }) => setSale(Array.isArray(data) ? data : data.rooms ?? data.warrooms ?? []))
        .catch(() => setSale([]))
        .finally(() => setSaleLoading(false));
      return;
    }
    warroomAPI.getById(id)
      .then(({ data }) => {
        // Il backend risponde con { room: {...} }
        const room = data.room ?? data;
        setSala(room);
        if (room.durataMinuti) setTempoRimanente(room.durataMinuti * 60);
        warroomAPI.join(id).catch(() => {});
      })
      .catch(() => setErrore('Impossibile caricare la War Room.'))
      .finally(() => setLoading(false));
  }, [id, authLoading]);

  // ── Connessione Socket.IO ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const token = getMemoryToken();
    if (!token) return;

    const socket = io(`${SOCKET_URL}/warroom`, { auth: { token } });
    socketRef.current = socket;

    socket.emit('join-room', { roomId: id });

    // Messaggio chat ricevuto — payload: { _id, content, type, createdAt, author: { username, avatar } }
    socket.on('chat-message', (msg) => {
      // Il backend fa broadcast a tutti incluso mittente — scarta i propri (già mostrati in optimistic update)
      if (msg.author?.username === user?.username) return;
      setMessaggiChat(prev => [...prev, {
        av:    (msg.author?.username ?? '??').slice(0, 2).toUpperCase(),
        colore: 'var(--text2)',
        testo:  msg.content,
        me:    false,
      }]);
    });

    // Step completato da un altro membro — payload: { challengeId, solvedBy, solvedAt }
    socket.on('step-completed', ({ challengeId, solvedBy }) => {
      const idx = parseInt(challengeId, 10);
      if (!isNaN(idx) && idx >= 0 && idx < PASSI.length) {
        // Aggiorna il set dei passi completati per tutti i client (Bug 5)
        setPassiCompletati(prev => new Set([...prev, idx]));
        // Avanza al passo successivo se il passo attivo era quello appena completato
        setPassoAttivo(prev => (prev === idx && idx + 1 < PASSI.length) ? idx + 1 : prev);
      }
      const titolo = !isNaN(idx) ? PASSI[idx]?.titolo?.slice(0, 30) || 'passo' : 'passo';
      aggiungiLog(`${solvedBy} ✓ ${titolo}... completato`, 'var(--mint)');
    });

    // Evento di log o typing indicator — payload: { content, createdAt, author }
    socket.on('log-event', ({ content, author }) => {
      if (content === 'sta scrivendo...') {
        // Typing indicator: mostra per 2 secondi poi nasconde automaticamente
        setUtenteCheScrive(author);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setUtenteCheScrive(''), 2000);
        return;
      }
      aggiungiLog(`${author ? author + ': ' : ''}${content}`, 'var(--text2)');
    });

    // Nuovo membro entrato — payload: { username, avatar }
    socket.on('user-joined', ({ username }) => {
      const iniziali = username.slice(0, 2).toUpperCase();
      setMembriOnline(prev => {
        if (prev.find(m => m.username === username)) return prev;
        return [...prev, { iniziali, username, gradiente: 'linear-gradient(135deg,var(--cyan),var(--violet))' }];
      });
      aggiungiLog(`${username} si è unito`, 'var(--violet)');
      setMessaggiChat(prev => [...prev, { tipo: 'sys', testo: `${username} è entrato nella War Room` }]);
      aggiungiNotifica({ icon: '👥', testo: `${username} è entrato nella sala` });
    });

    // Membro uscito — payload: { username }
    socket.on('user-left', ({ username }) => {
      setMembriOnline(prev => prev.filter(m => m.username !== username));
      aggiungiLog(`${username} ha lasciato`, 'var(--text3)');
      setMessaggiChat(prev => [...prev, { tipo: 'sys', testo: `${username} ha lasciato la War Room` }]);
      aggiungiNotifica({ icon: '👋', testo: `${username} ha lasciato la sala` });
    });

    // Sala risolta — payload: { roomId, resolvedBy, resolvedAt }
    socket.on('room-resolved', ({ resolvedBy }) => {
      setUiBloccata(true);
      aggiungiNotifica({ icon: '🏆', testo: `Incidente risolto da ${resolvedBy}` });
      if (resolvedBy === user?.username) {
        // L'utente corrente ha appena risolto — apri il modal di riepilogo
        setRisolviAperto(true);
      } else {
        // Un altro membro ha risolto — mostra il modal informativo "sala chiusa"
        setRisolutore(resolvedBy || 'Il team');
        setSalaChiusaDaAltri(true);
      }
    });

    socket.on('connect_error', (err) => {
      aggiungiLog(`⚠ Connessione socket persa: ${err.message}`, 'var(--coral)');
    });

    return () => {
      socket.emit('leave-room', { roomId: id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, aggiungiLog, aggiungiNotifica, user?.username]);

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || timerScaduto) return;
    timerRef.current = setInterval(() => {
      setTempoRimanente(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerScaduto(true);
          return 0;
        }
        // Avviso a 10 minuti
        if (prev === 601) aggiungiLog('⚠️ Attenzione: meno di 10 minuti!', 'var(--coral)');
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, timerScaduto, aggiungiLog]);

  // ── Inizializzazione dopo il caricamento della sala (Bug 1-4) ──────────────────
  // Eseguito una sola volta quando sala e user sono disponibili
  useEffect(() => {
    if (!sala || !user) return;

    // Terminale: intestazione con il nome reale della sala
    const nomeSala = sala.name || sala.title || 'Incident Response';
    setRigheTerminale([
      { tipo: 'ok',  testo: `CyberNexus IR Console — ${nomeSala}` },
      { tipo: 'sep', testo: '━━━ Connessione stabilita — in attesa di eventi ━━━' },
      { tipo: 'out', testo: "Digita 'help' per vedere i comandi disponibili" },
    ]);

    // Membri online: solo l'utente corrente all'apertura (Bug 2)
    setMembriOnline([{
      iniziali: (user.username || 'TU').slice(0, 2).toUpperCase(),
      username: user.username || 'Tu',
      gradiente: 'linear-gradient(135deg,var(--violet),var(--fuchsia))',
    }]);

    // Chat: carica la storia dei messaggi salvati nel DB
    if (sala.messages?.length) {
      const storico = sala.messages.slice(-30).map(msg => {
        if (msg.type === 'system') return { tipo: 'sys', testo: msg.content };
        const autore = msg.author?.username;
        if (autore) {
          return {
            av:     autore.slice(0, 2).toUpperCase(),
            colore: autore === user?.username
              ? 'linear-gradient(135deg,var(--violet),var(--fuchsia))'
              : 'var(--text2)',
            testo:  msg.content,
            me:     autore === user?.username,
          };
        }
        return { tipo: 'sys', testo: msg.content };
      });
      setMessaggiChat(storico);
    }

  }, [sala, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll terminale ────────────────────────────────────────────────────
  useEffect(() => {
    if (termBodyRef.current) termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight;
  }, [righeTerminale]);

  // ── Auto-scroll chat ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatMsgsRef.current) chatMsgsRef.current.scrollTop = chatMsgsRef.current.scrollHeight;
  }, [messaggiChat]);

  // ── Blocca scroll body durante la sessione ───────────────────────────────────
  useEffect(() => {
    if (!id) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [id]);

  // ── ESC chiude pannello dettagli e modal ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setDettagliAperto(false); setRisolviAperto(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Punti coerenti: dichiarati qui perché usati nel useEffect dell'animazione counter
  const puntiBase     = sala?.points || (passiCompletati.size * 150);
  const bonusVelocita = tempoElapsedMin > 0 && tempoElapsedMin < 30 ? 350 : 0;
  const puntiTotali   = puntiBase + bonusVelocita;

  // ── Animazione counter punti nel resolve modal ───────────────────────────────
  useEffect(() => {
    if (!risolviAperto || !ptsCounterRef.current) return;
    const target = puntiTotali;
    const dur = 2000;
    const t0 = performance.now();
    const el = ptsCounterRef.current;
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.floor(target * e).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    };
    requestAnimationFrame(step);
  }, [risolviAperto, puntiTotali]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const toggleTema = () => {
    const nuovoTema = tema === 'dark' ? 'light' : 'dark';
    setTema(nuovoTema);
    document.documentElement.setAttribute('data-theme', nuovoTema);
  };

  const selezionaPasso = (idx) => {
    setPassoAttivo(idx);
    setDettagliAperto(true);
  };

  const segnaFatto = () => {
    if (timerScaduto || uiBloccata || passiCompletati.has(passoAttivo)) return;
    const idx = passoAttivo;
    const nuovoSet = new Set([...passiCompletati, idx]);
    setPassiCompletati(nuovoSet);
    setDettagliAperto(false);

    // Avanza automaticamente al prossimo passo non completato (Bug 5)
    const prossimo = PASSI.findIndex((_, i) => i > idx && !nuovoSet.has(i));
    if (prossimo !== -1) setPassoAttivo(prossimo);

    // Notifica gli altri via Socket.IO
    socketRef.current?.emit('step-completed', { roomId: id, challengeId: String(idx) });
    socketRef.current?.emit('log-event', { roomId: id, content: `✓ ${PASSI[idx].titolo.slice(0, 40)}` });
    aggiungiLog(`${user?.username || 'Tu'} ✓ ${PASSI[idx].titolo.slice(0, 30)}...`, 'var(--mint)');
    setRigheTerminale(prev => [...prev,
      { tipo: 'sep-active', testo: `── Passo: ${PASSI[idx].titolo.slice(0, 40)}... completato ──` },
    ]);
  };

  const apriRisolvi = () => {
    if (timerScaduto || uiBloccata) return;
    // Calcola durata reale da createdAt della sala, o stima dal timer
    const durataMin = sala?.createdAt
      ? Math.round((Date.now() - new Date(sala.createdAt).getTime()) / 60000)
      : 90 - Math.floor(tempoRimanente / 60);
    setTempoElapsedMin(durataMin);
    setRisolviAperto(true);
  };

  const confermaRisolvi = async () => {
    try {
      await warroomAPI.resolve(id);
      socketRef.current?.emit('room-resolved', { roomId: id });
    } catch { /* la UI naviga comunque */ }
    navigate('/dashboard');
  };

  const inviaWebhook = () => {
    if (webhookInvio || webhookInviato) return;
    setWebhookInvio(true);
    setTimeout(() => { setWebhookInvio(false); setWebhookInviato(true); }, 1400);
  };

  // Genera e scarica il report come PDF professionale
  const scaricaReport = () => {
    const doc = new jsPDF();
    const now  = new Date();
    const nome = titoloSala.replace(/\s+/g, '_').slice(0, 30);

    // Palette colori CyberNexus
    const C = { violet: [124, 111, 234], dark: [17, 24, 39], gray: [90, 100, 128], white: [240, 244, 255], mint: [92, 206, 138], amber: [246, 198, 82], coral: [240, 112, 96] };

    // ── Header scuro con branding ────────────────────────────────────────────────
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(...C.violet);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CyberNexus', 14, 15);
    doc.setTextColor(...C.white);
    doc.setFontSize(11);
    doc.text('Incident Response Report', 14, 24);
    doc.setTextColor(...C.gray);
    doc.setFontSize(8);
    doc.text(`Generato il ${now.toLocaleString('it-IT')}`, 196, 24, { align: 'right' });

    let y = 42;

    // Utility: titolo sezione con sfondo
    const addSectionTitle = (t) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(...C.violet);
      doc.rect(14, y - 5, 182, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(t, 17, y + 1);
      y += 12;
    };

    // Utility: riga chiave/valore
    const addField = (k, v) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.gray);
      doc.text(k + ':', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(v ?? '–'), 65, y);
      y += 7;
    };

    // ── 1. Riepilogo incidente ────────────────────────────────────────────────────
    addSectionTitle('1.  RIEPILOGO INCIDENTE');
    addField('Nome sala', titoloSala);
    addField('Severità', severita);
    addField('Stato', sala?.status === 'closed' ? 'Risolto ✓' : 'Attivo');
    addField('Data apertura', sala?.createdAt ? new Date(sala.createdAt).toLocaleString('it-IT') : '–');
    addField('Data risoluzione', now.toLocaleString('it-IT'));
    addField('Durata totale', `${tempoElapsedMin} minuti`);
    y += 4;

    // ── 2. Team ───────────────────────────────────────────────────────────────────
    addSectionTitle('2.  TEAM');
    doc.autoTable({
      startY: y,
      head: [['Username', 'Ruolo']],
      body: membriOnline.length
        ? membriOnline.map(m => [m.username, m.role || 'Analista'])
        : [['–', '–']],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: C.violet, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── 3. Passi completati ───────────────────────────────────────────────────────
    addSectionTitle('3.  PASSI COMPLETATI');
    doc.autoTable({
      startY: y,
      head: [['#', 'Passo', 'Categoria', 'Stato']],
      body: PASSI.map((p, i) => [
        String(i + 1),
        p.titolo.slice(0, 42),
        p.categoria,
        passiCompletati.has(i) ? '✓ Completato' : '◌ Non completato',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: C.violet, textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 35 } },
      didParseCell: (d) => {
        if (d.column.index === 3 && d.section === 'body') {
          d.cell.styles.textColor = d.cell.raw.startsWith('✓') ? C.mint : C.amber;
          d.cell.styles.fontStyle = 'bold';
        }
      },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── 4. Statistiche ────────────────────────────────────────────────────────────
    addSectionTitle('4.  STATISTICHE');
    addField('Passi completati', `${completati} / ${PASSI.length} (${pct}%)`);
    addField('Punti base', `${puntiBase.toLocaleString()} pts  (${completati} passi × 150)`);
    addField('Bonus velocità', bonusVelocita > 0 ? `+${bonusVelocita} pts (completata in meno di 30 min)` : 'Nessuno');
    addField('Punti totali', `${puntiTotali.toLocaleString()} pts`);
    y += 4;

    // ── 5. Timeline eventi ────────────────────────────────────────────────────────
    if (logFeed.length > 0) {
      addSectionTitle('5.  TIMELINE EVENTI');
      doc.autoTable({
        startY: y,
        head: [['Ora', 'Evento']],
        body: logFeed.map(l => [l.time, l.testo]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: C.violet, textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 20 } },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        margin: { left: 14, right: 14 },
      });
    }

    // ── Footer su ogni pagina ────────────────────────────────────────────────────
    const totPagine = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= totPagine; pg++) {
      doc.setPage(pg);
      doc.setFillColor(...C.dark);
      doc.rect(0, 285, 210, 15, 'F');
      doc.setTextColor(...C.gray);
      doc.setFontSize(8);
      doc.text(`Generato da CyberNexus · cybernexus.io · ${now.toLocaleDateString('it-IT')}`, 14, 293);
      doc.text(`Pagina ${pg} di ${totPagine}`, 196, 293, { align: 'right' });
    }

    doc.save(`CyberNexus_Report_${nome}_${now.toISOString().slice(0, 10)}.pdf`);
  };

  const eseguiComando = () => {
    if (timerScaduto || uiBloccata) return;
    const cmd = comandoInput.trim();
    if (!cmd) return;
    setComandoInput('');

    const now    = new Date();
    const prompt = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}] `;
    setRigheTerminale(prev => [...prev, { tipo: 'cmd', prompt, testo: cmd }]);

    // Dispatcher tematico: risposte basate sul comando (Bug 6)
    const lower = cmd.toLowerCase().trim();
    let output;

    if (lower === 'help') {
      const cmdSala = sala?.comandiTerminale || [];
      output = [
        ['out', 'Comandi disponibili:'],
        ['out', '  whoami     → mostra utente connesso'],
        ['out', '  status     → stato corrente della War Room'],
        ['out', '  ls / dir   → lista file scenario corrente'],
        ['out', '  help       → mostra questo messaggio'],
      ];
      if (cmdSala.length) {
        output.push(['sep', '─── Comandi scenario ───']);
        cmdSala.forEach(c => {
          const pad = c.comando.length < 10 ? c.comando.padEnd(10) : c.comando;
          output.push(['out', `  ${pad} → ${c.risposta.slice(0, 55)}`]);
        });
      }
    } else if (lower === 'ls' || lower === 'dir') {
      output = [
        ['out', `[${titoloSala}] /incident/`],
        ['warn', '  !README.txt              [ENCRYPTED]'],
        ['out',  `  /dumps/prod-01.raw       [${severita}]`],
        ['out',  '  /logs/auth.log'],
        ['out',  '  /evidence/hashes.txt'],
        ['ok',   '  /playbook/ir-guide.md'],
      ];
    } else if (lower === 'whoami') {
      output = [['ok', user?.username || 'analyst']];
    } else if (lower === 'status') {
      const tot = passiCompletati.size;
      output = [
        ['ok',  `War Room: ${titoloSala}`],
        ['out', `Severità: ${severita}`],
        ['out', `Passi completati: ${tot}/${PASSI.length} (${Math.round(tot / PASSI.length * 100)}%)`],
        ['out', `Membri online: ${membriOnline.length}`],
        [tot === PASSI.length ? 'ok' : 'warn',
          tot === PASSI.length
            ? '✓ Tutti i passi completati — pronto per la risoluzione'
            : `⏳ Passo ${passoAttivo + 1}: ${PASSI[passoAttivo]?.titolo?.slice(0, 35) || '–'}`],
      ];
    } else {
      // Cerca tra i comandi personalizzati configurati per questo scenario
      const cmdPersonalizzato = sala?.comandiTerminale?.find(
        c => c.comando.toLowerCase().trim() === lower
      );
      if (cmdPersonalizzato) {
        output = [['ok', cmdPersonalizzato.risposta]];
      } else {
        output = [['out', "Comando non riconosciuto. Digita 'help' per i comandi disponibili."]];
      }
    }

    output.forEach(([tipo, testo], i) => {
      setTimeout(() => setRigheTerminale(prev => [...prev, { tipo, testo }]), (i + 1) * 200);
    });

    // Emette log-event così tutti i membri vedono il comando nel proprio terminale (Bug 6)
    socketRef.current?.emit('log-event', { roomId: id, content: `$ ${cmd}` });
  };

  const inviaChat = () => {
    if (timerScaduto || uiBloccata || !inputChat.trim()) return;
    const testo = inputChat.trim();
    setInputChat('');
    clearTimeout(typingDebounceRef.current);
    const meAv = user?.username?.slice(0, 2).toUpperCase() || 'TU';
    // Optimistic update: il messaggio appare subito; il backend lo echeggerà a tutti
    setMessaggiChat(prev => [...prev, { av: meAv, colore: 'linear-gradient(135deg,var(--violet),var(--fuchsia))', testo, me: true }]);
    // Emette col formato atteso dal backend: { roomId, content }
    socketRef.current?.emit('chat-message', { roomId: id, content: testo });
  };

  const toggleObiettivo = (passoIdx, objIdx) => {
    const key = `${passoIdx}-${objIdx}`;
    setObiettiviCheck(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSb = (chiave) => setSbCompresse(prev => ({ ...prev, [chiave]: !prev[chiave] }));

  // ── Valori derivati ───────────────────────────────────────────────────────────
  const passoCorr = PASSI[passoAttivo] || PASSI[3];
  const completati = passiCompletati.size;
  const pct = Math.round((completati / PASSI.length) * 100);
  const timerWarning = tempoRimanente <= 600 && tempoRimanente > 0;
  const titoloSala = sala?.name || sala?.title || 'Incident Response';
  const severita   = sala?.severity || 'CRITICAL';

  // ── Render riga terminale ────────────────────────────────────────────────────
  const renderRiga = (r, i) => {
    if (r.tipo === 'cmd') return (
      <span key={i} className="t-line"><span className="t-p">{r.prompt}</span><span className="t-cmd">{r.testo}</span></span>
    );
    if (r.tipo === 'sep') return (
      <span key={i} className="t-line" style={{ color: 'var(--text3)' }}>{r.testo}</span>
    );
    if (r.tipo === 'sep-active') return (
      <span key={i} className="t-line t-ok" style={{ marginTop: 8 }}>{r.testo}</span>
    );
    if (r.tipo === 'po') return (
      <span key={i} className="t-line"><span className="t-p">{r.prompt}</span><span className={`t-${r.valT}`}>{r.val}</span></span>
    );
    return <span key={i} className={`t-line t-${r.tipo}`}>{r.testo}</span>;
  };

  // ── Loading / errore ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="warroom-app">
      <div className="wr-loading"><div className="wr-spinner" /><span>Caricamento War Room...</span></div>
    </div>
  );

  if (errore && !sala) return (
    <div className="warroom-app">
      <div className="wr-errore">{errore}</div>
    </div>
  );

  // ── Vista lista / stato vuoto (nessun id nella route) ────────────────────────
  if (!id) {
    const canCreate = user?.role === 'Admin' || user?.role === 'Manager';
    return (
      <div className="warroom-app" style={{ height: 'auto', overflow: 'visible' }}>
        <Navbar />

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 'calc(100vh - 60px)',
          gap: 14, textAlign: 'center', padding: 24, paddingTop: 80,
        }}>
          {/* ── Modale anteprima sala ── */}
          {previewSala && (
            <div className="wr-preview-overlay" onClick={() => setPreviewSala(null)}>
              <div className="wr-preview-modal" onClick={e => e.stopPropagation()}>
                <button className="wr-preview-close" onClick={() => setPreviewSala(null)}>✕</button>

                {/* Header sala */}
                <div className="wr-preview-hdr">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 24 }}>⚔</div>
                    <div>
                      <div className="wr-preview-name">{previewSala.name || previewSala.title || 'War Room'}</div>
                      <span className="wr-preview-badge" style={{
                        background: previewSala.status === 'closed' ? 'var(--amber-bg)' : 'var(--mint-bg)',
                        color:      previewSala.status === 'closed' ? 'var(--amber)' : 'var(--mint)',
                      }}>
                        {previewSala.status === 'closed' ? 'Chiusa' : 'Attiva'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corpo */}
                <div className="wr-preview-body">
                  {previewSala.description && (
                    <div className="wr-preview-desc">{previewSala.description}</div>
                  )}

                  {/* Statistiche */}
                  <div className="wr-preview-stats">
                    <div className="wr-preview-stat">
                      <span className="wr-ps-v">{previewSala.memberCount ?? previewSala.members?.length ?? 0}</span>
                      <span className="wr-ps-l">Membri</span>
                    </div>
                    <div className="wr-preview-stat">
                      <span className="wr-ps-v">{previewSala.maxMembers ?? 10}</span>
                      <span className="wr-ps-l">Max membri</span>
                    </div>
                    <div className="wr-preview-stat">
                      <span className="wr-ps-v">{PASSI.length}</span>
                      <span className="wr-ps-l">Step playbook</span>
                    </div>
                  </div>

                  {/* Anteprima passi */}
                  <div className="wr-preview-steps-lbl">📋 Playbook</div>
                  <div className="wr-preview-steps">
                    {PASSI.slice(0, 4).map((p, i) => (
                      <div key={i} className="wr-preview-step">
                        <span>{p.icon}</span>
                        <span>{p.titolo}</span>
                      </div>
                    ))}
                    {PASSI.length > 4 && (
                      <div className="wr-preview-step" style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
                        + altri {PASSI.length - 4} passi...
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer azioni */}
                <div className="wr-preview-footer">
                  <button className="wr-preview-cancel" onClick={() => setPreviewSala(null)}>Annulla</button>
                  <button
                    className="wr-preview-entra"
                    disabled={previewSala.status === 'closed'}
                    onClick={async () => {
                      try { await warroomAPI.join(previewSala._id); } catch { /* già membro */ }
                      setPreviewSala(null);
                      navigate(`/warroom/${previewSala._id}`);
                    }}
                  >
                    ⚔ Entra nella sala
                  </button>
                </div>
              </div>
            </div>
          )}

          {saleLoading ? (
            <div className="wr-loading">
              <div className="wr-spinner" />
              <span>Caricamento War Room...</span>
            </div>
          ) : sale.length > 0 ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>
                ⚔ {sale.length} War Room attiv{sale.length === 1 ? 'a' : 'e'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 520 }}>
                {sale.map((s) => (
                  <button
                    key={s._id}
                    onClick={() => setPreviewSala(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px', borderRadius: 10,
                      border: '0.5px solid var(--border2)', background: 'var(--bg2)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(124,111,234,.15)', border: '0.5px solid rgba(124,111,234,.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>⚔</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)', marginBottom: 3 }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>
                        {s.type ?? 'Incident'} ·{' '}
                        <span style={{
                          color: s.severity === 'CRITICAL' ? 'var(--coral)'
                               : s.severity === 'HIGH'     ? 'var(--amber)'
                               : 'var(--mint)',
                        }}>
                          {s.severity ?? 'MEDIUM'}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--violet)', fontFamily: "'JetBrains Mono',monospace",
                      padding: '3px 8px', borderRadius: 5,
                      background: 'var(--violet-bg)', border: '0.5px solid rgba(124,111,234,.3)',
                      flexShrink: 0,
                    }}>
                      Anteprima →
                    </div>
                  </button>
                ))}
              </div>
              {canCreate && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    marginTop: 8, padding: '9px 22px', borderRadius: 8,
                    background: 'linear-gradient(135deg,var(--violet),var(--fuchsia))',
                    border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  + Crea War Room
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: 'rgba(124,111,234,.12)', border: '0.5px solid rgba(124,111,234,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34, marginBottom: 4,
              }}>⚔</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)' }}>
                Nessuna War Room attiva
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 360, lineHeight: 1.65 }}>
                Non ci sono War Room disponibili al momento.
                {canCreate
                  ? ' Crea una nuova sessione per iniziare.'
                  : ' Torna a controllare più tardi.'}
              </div>
              {canCreate && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    marginTop: 6, padding: '10px 28px', borderRadius: 8,
                    background: 'linear-gradient(135deg,var(--violet),var(--fuchsia))',
                    border: 'none', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  + Crea War Room
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── JSX principale ────────────────────────────────────────────────────────────
  return (
    <div className="warroom-app">
      <div className="scan-line" />

      {/* ── Timeout overlay ── */}
      {timerScaduto && (
        <div className="timeout-overlay">
          <div className="to-modal">
            <div className="to-bar" />
            <div className="to-inner">
              <span className="to-emoji">⏰</span>
              <div className="to-title">Tempo scaduto!</div>
              <div className="to-sub">Il tempo a disposizione per risolvere <strong>{titoloSala}</strong> è terminato. La sessione War Room è stata chiusa automaticamente.</div>
              <div className="to-stats">
                <div className="to-stat"><div className="tos-v" style={{ color: 'var(--coral)' }}>{completati}/{PASSI.length}</div><div className="tos-l">Task fatti</div></div>
                <div className="to-stat"><div className="tos-v" style={{ color: 'var(--amber)' }}>{sala?.durataMinuti || 90}:00</div><div className="tos-l">Tempo limite</div></div>
                <div className="to-stat"><div className="tos-v" style={{ color: 'var(--text3)' }}>{(completati * 150).toLocaleString()}</div><div className="tos-l">Pts parziali</div></div>
              </div>
              <div className={`to-sol ${solAperta ? 'open' : ''}`}>
                <div className="to-sol-tr" onClick={() => setSolAperta(p => !p)}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <div className="to-sol-title">Vedi la soluzione completa</div>
                  <div className="to-sol-cv">▾</div>
                </div>
                <div className="to-sol-bd">
                  <div className="to-sol-step">
                    <div className="to-sol-step-t">🔒 Isolamento rete</div>
                    <div className="to-cmd-block">
                      <span className="rc"><span className="p">$ </span>ssh admin@firewall-01</span>
                      <span className="rc"><span className="p">fw# </span>set interface eth0 access-list ISOLATE in</span>
                      <span className="rc"><span className="ok">OK ✓ server-prod-01 isolated</span></span>
                    </div>
                  </div>
                  <div className="to-sol-step">
                    <div className="to-sol-step-t">🔬 Analisi Volatility</div>
                    <div className="to-cmd-block">
                      <span className="rc"><span className="p">$ </span>volatility3 -f dump.raw windows.pslist</span>
                      <span className="rc"><span className="w">⚠ PID 1234 lockbit3.exe</span></span>
                      <span className="rc"><span className="e">✗ ESTABLISHED 185.220.101.48:8443 → C2!</span></span>
                    </div>
                  </div>
                  <div className="to-sol-step">
                    <div className="to-sol-step-t">⚠️ Blocco C2 + Recovery</div>
                    <div className="to-cmd-block">
                      <span className="rc"><span className="p">fw# </span>block ip 185.220.101.48</span>
                      <span className="rc"><span className="ok">✓ C2 bloccato</span></span>
                      <span className="rc"><span className="ok">✓ CVE-2024-3400 patchato</span></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="to-btn-row">
                <button className="to-btn to-btn-primary" onClick={() => navigate('/dashboard')}>← Torna alla dashboard</button>
                <button className="to-btn to-btn-ghost" onClick={() => setSolAperta(true)}>Vedi soluzione</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale sala chiusa da un altro membro ── */}
      {salaChiusaDaAltri && (
        <div className="resolve-overlay">
          <div className="rm">
            <div className="rm-bar" />
            <div className="rm-in" style={{ textAlign: 'center' }}>
              <span className="rm-emoji">🔒</span>
              <div className="rm-title">Sala chiusa</div>
              <div className="rm-sub">
                <strong>{risolutore}</strong> ha risolto l'incidente e chiuso la sala.
              </div>
              <div className="rm-grid" style={{ marginBottom: 20 }}>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--mint)' }}>{completati}/{PASSI.length}</div><div className="rms-l">Step</div></div>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--violet)' }}>{membriOnline.length}</div><div className="rms-l">Analisti</div></div>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--amber)' }}>{tempoElapsedMin || '—'}m</div><div className="rms-l">Durata</div></div>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--coral)', fontSize: 12 }}>{severita}</div><div className="rms-l">Severità</div></div>
              </div>
              <button className="rm-download-btn" onClick={scaricaReport}>⬇ Scarica report PDF</button>
              <button className="rm-close" onClick={() => navigate('/dashboard')}>← Torna alla dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve modal ── */}
      {risolviAperto && (
        <div className="resolve-overlay" onClick={(e) => e.target === e.currentTarget && setRisolviAperto(false)}>
          <div className="rm">
            <div className="rm-bar" />
            <div className="rm-in">
              <span className="rm-emoji">🏆</span>
              <div className="rm-title">Incidente risolto!</div>
              <div className="rm-sub"><strong>{titoloSala}</strong> — playbook completato e findings documentati.</div>
              <div className="rm-pts">
                <span className="rm-pts-v" ref={ptsCounterRef}>0</span>
                <div className="rm-pts-l">Punti guadagnati dal team</div>
                <div className="rm-bonus">
                  {completati} passi × 150pt
                  {bonusVelocita > 0 ? ` + ⚡ bonus velocità +${bonusVelocita}pt` : ''}
                  {' '}· {tempoElapsedMin}m impiegati
                </div>
              </div>
              <div className="rm-grid">
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--mint)' }}>{completati}/{PASSI.length}</div><div className="rms-l">Task</div></div>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--violet)' }}>{membriOnline.length}</div><div className="rms-l">Analisti</div></div>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--amber)' }}>{tempoElapsedMin}m</div><div className="rms-l">Tempo</div></div>
                <div className="rm-stat"><div className="rms-v" style={{ color: 'var(--coral)', fontSize: 13 }}>{severita}</div><div className="rms-l">Severità</div></div>
              </div>
              <div className="rm-team">
                {membriOnline.slice(0, 4).map((m) => (
                  <div key={m.username} className="rm-mb">
                    <div className="rm-av" style={{ background: m.gradiente }}>{m.iniziali}</div>
                    <div className="rm-av-n">{m.username}</div>
                  </div>
                ))}
              </div>
              <div className="rm-tech">
                <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace", marginRight: 4 }}>Powered by:</span>
                <span className="rm-tp" style={{ color: 'var(--mint)',   borderColor: 'rgba(92,206,138,.3)',  background: 'var(--mint-bg)'   }}>🔑 SHA-256 flags</span>
                <span className="rm-tp" style={{ color: 'var(--amber)',  borderColor: 'rgba(246,198,82,.3)', background: 'var(--amber-bg)'  }}>⚡ Rate limiting</span>
                <span className="rm-tp" style={{ color: 'var(--violet)', borderColor: 'rgba(124,111,234,.3)',background: 'var(--violet-bg)' }}>🔗 MongoDB</span>
                <span className="rm-tp" style={{ color: 'var(--cyan)',   borderColor: 'rgba(91,196,212,.3)', background: 'var(--cyan-bg)'   }}>🔔 Webhook</span>
              </div>
              {/* Il webhook viene inviato dal backend automaticamente a risoluzione */}
              <div className="rm-webhook">
                <div className="rm-wh-hdr">
                  <div className="rm-wh-ico">🔔</div>
                  <div className="rm-wh-info">
                    <div className="rm-wh-title">Notifica webhook</div>
                    <div className="rm-wh-sub">Inviata automaticamente dal backend a chiusura sala</div>
                  </div>
                </div>
                <div className="rm-wh-body">
                  <div className="rm-wh-sent">
                    ✓ Il webhook viene inviato dal backend quando si clicca
                    "Torna alla dashboard". Configura <strong>WEBHOOK_URL</strong> nel pannello Admin per
                    ricevere notifiche esterne.
                  </div>
                </div>
              </div>
              <button className="rm-download-btn" onClick={scaricaReport}>⬇ Scarica report PDF</button>
              <button className="rm-close" onClick={confermaRisolvi}>✓ Torna alla dashboard</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="wr-navbar">
        <Link className="nav-logo" to="/">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <defs><linearGradient id="nlg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7C6FEA"/><stop offset="100%" stopColor="#5BC4D4"/></linearGradient></defs>
            <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3" fill="rgba(124,111,234,0.15)" stroke="url(#nlg2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          CyberNexus
        </Link>
        <Link className="nav-back" to="/dashboard">← War Room</Link>
        <div className="nav-inc">
          <div className="ni-dot" />
          <div className="ni-title">{titoloSala}</div>
          <div className="ni-badge">{severita}</div>
          <div className="ni-sep" />
          <div className="ni-timer-wrap">
            <div className={`ni-timer ${timerWarning ? 'warning' : ''}`}>{formatTime(tempoRimanente)}</div>
            <div className="ni-tlbl">rimanenti</div>
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-avs">
            {membriOnline.map((m, i) => (
              <div key={m.username} className="nav-av" style={{ background: m.gradiente, zIndex: membriOnline.length - i }}>{m.iniziali}</div>
            ))}
          </div>
          <div className="online-pill"><div className="ol-dot" />{membriOnline.length} online</div>
          <div className="mode-toggle" onClick={toggleTema}>
            <div className="toggle-track"><div className={`toggle-thumb ${tema === 'light' ? 'light' : ''}`} /></div>
            <span>{tema === 'dark' ? 'Dark' : 'Light'}</span>
          </div>
          {user && <NavDropdown user={user} initials={user.username?.slice(0, 2).toUpperCase() || 'US'} />}
        </div>
      </nav>

      {/* ── Progress banner ── */}
      <div className="prog-banner">
        <div className="pb-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a12 12 0 008.5 3A12 12 0 0112 21 12 12 0 013.5 6 12 12 0 0012 3"/></svg>
        </div>
        <div className="pb-info">
          <div className="pb-lbl">Playbook: {sala?.type || 'Ransomware Enterprise'}</div>
          <div className="pb-row">
            <div className="pb-title">{completati} di {PASSI.length} passi completati</div>
            <div className="pb-bar"><div className="pb-fill" style={{ width: `${pct}%` }} /></div>
            <div className="pb-pct">{pct}%</div>
            <div className="pb-rem">· {PASSI.length - completati} rimanenti</div>
          </div>
        </div>
        <button className="resolve-btn" disabled={timerScaduto || uiBloccata} onClick={apriRisolvi}>
          <span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Risolvi incidente
          </span>
        </button>
      </div>

      {/* ── War shell ── */}
      <div className="war-shell">

        {/* Toggle sidebar sinistra */}
        <div
          className={`stoggle ltoggle ${!sinistraAperta ? 'closed' : ''}`}
          style={{ left: sinistraAperta ? 'var(--lw)' : 0 }}
          onClick={() => setSinistraAperta(p => !p)}
        >{sinistraAperta ? '‹' : '›'}</div>

        {/* Toggle sidebar destra */}
        <div
          className={`stoggle rtoggle ${!destraAperta ? 'closed' : ''}`}
          style={{ right: destraAperta ? 'var(--rw)' : 0 }}
          onClick={() => setDestraAperta(p => !p)}
        >{destraAperta ? '›' : '‹'}</div>

        {/* ── Sidebar sinistra ── */}
        <div className={`col-left ${!sinistraAperta ? 'hidden' : ''}`}>
          <div className="sb-scroll">

            {/* IOC */}
            <div className={`sb-sec ${sbCompresse.ioc ? 'collapsed' : ''}`}>
              <div className="sb-hdr" onClick={() => toggleSb('ioc')}>
                <span className="sb-ico">🔎</span>
                <div className="sb-nm">IOC</div>
                <div className="sb-ct">{IOC_DEFAULT.length}</div>
                <div className="sb-cv">▾</div>
              </div>
              <div className="sb-body">
                {IOC_DEFAULT.map((ioc, i) => (
                  <div key={i} className="ioc-row">
                    <span className="ioc-t" style={{ background: ioc.tipoBg, color: ioc.tipoCol }}>{ioc.tipo}</span>
                    <span className="ioc-v">{ioc.valore}</span>
                    <span className="ioc-s" style={{ background: ioc.statoBg, color: ioc.statoCol }}>{ioc.stato}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mappa rete */}
            <div className={`sb-sec ${sbCompresse.net ? 'collapsed' : ''}`}>
              <div className="sb-hdr" onClick={() => toggleSb('net')}>
                <span className="sb-ico">🗺</span>
                <div className="sb-nm">Mappa rete</div>
                <div className="sb-ct">5 nodi</div>
                <div className="sb-cv">▾</div>
              </div>
              <div className="sb-body">
                <svg width="100%" viewBox="0 0 244 190" xmlns="http://www.w3.org/2000/svg">
                  <line x1="80"  y1="44"  x2="122" y2="95"  stroke="rgba(240,112,96,.4)"  strokeWidth="1.5" strokeDasharray="4,3"/>
                  <line x1="164" y1="44"  x2="122" y2="95"  stroke="rgba(240,112,96,.4)"  strokeWidth="1.5" strokeDasharray="4,3"/>
                  <line x1="122" y1="95"  x2="122" y2="135" stroke="rgba(246,198,82,.35)" strokeWidth="1.5" strokeDasharray="4,3"/>
                  <line x1="122" y1="135" x2="200" y2="158" stroke="rgba(92,206,138,.4)"  strokeWidth="1.5"/>
                  <line x1="200" y1="158" x2="232" y2="106" stroke="rgba(240,112,96,.65)" strokeWidth="1.5" strokeDasharray="3,3">
                    <animate attributeName="strokeDashoffset" from="0" to="18" dur=".9s" repeatCount="indefinite"/>
                  </line>
                  <g transform="translate(58,30)"><rect width="44" height="26" rx="6" fill="rgba(240,112,96,.12)" stroke="rgba(240,112,96,.5)" strokeWidth="1"/><text x="22" y="17" textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="8" fill="#F07060" fontWeight="600">prod-01</text></g>
                  <circle cx="80" cy="43" r="4" fill="var(--coral)"><animate attributeName="opacity" values="1;0.3;1" dur="1.3s" repeatCount="indefinite"/></circle>
                  <g transform="translate(142,30)"><rect width="44" height="26" rx="6" fill="rgba(240,112,96,.12)" stroke="rgba(240,112,96,.5)" strokeWidth="1"/><text x="22" y="17" textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="8" fill="#F07060" fontWeight="600">prod-03</text></g>
                  <circle cx="164" cy="43" r="4" fill="var(--coral)"><animate attributeName="opacity" values="1;0.3;1" dur="1.3s" begin=".3s" repeatCount="indefinite"/></circle>
                  <g transform="translate(100,82)"><rect width="44" height="26" rx="6" fill="rgba(246,198,82,.1)" stroke="rgba(246,198,82,.4)" strokeWidth="1"/><text x="22" y="17" textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="8" fill="#F6C652" fontWeight="600">DB-server</text></g>
                  <circle cx="122" cy="95" r="4" fill="var(--amber)"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
                  <g transform="translate(100,122)"><rect width="44" height="26" rx="6" fill="rgba(92,206,138,.08)" stroke="rgba(92,206,138,.35)" strokeWidth="1"/><text x="22" y="17" textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="8" fill="#5CCE8A" fontWeight="600">firewall</text></g>
                  <circle cx="122" cy="135" r="4" fill="var(--mint)"/>
                  <g transform="translate(218,93)"><rect width="28" height="26" rx="5" fill="rgba(240,112,96,.2)" stroke="rgba(240,112,96,.65)" strokeWidth="1"/><text x="14" y="17" textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="7" fill="#F07060" fontWeight="700">C2</text></g>
                  <circle cx="232" cy="106" r="4" fill="var(--coral)"><animate attributeName="opacity" values="1;0.2;1" dur=".75s" repeatCount="indefinite"/></circle>
                  <g transform="translate(170,146)"><rect width="52" height="26" rx="5" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.07)" strokeWidth="1"/><text x="26" y="17" textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize="7" fill="#4a5a7a">wks-07/12</text></g>
                </svg>
                <div className="net-legend">
                  <span style={{ color: 'var(--coral)' }}>● compromesso</span>
                  <span style={{ color: 'var(--amber)' }}>● rischio</span>
                  <span style={{ color: 'var(--mint)' }}>● sicuro</span>
                </div>
              </div>
            </div>

            {/* Log live */}
            <div className={`sb-sec ${sbCompresse.log ? 'collapsed' : ''}`}>
              <div className="sb-hdr" onClick={() => toggleSb('log')}>
                <span className="sb-ico">🔔</span>
                <div className="sb-nm">Log live</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 4 }}><div className="tld" /></div>
                <div className="sb-cv">▾</div>
              </div>
              <div className="sb-body" style={{ padding: '8px 10px' }}>
                <div className="log-feed">
                  {logFeed.map((l, i) => (
                    <div key={i} className={`log-row ${l.fresh ? 'fresh' : ''}`}>
                      <div className="log-time">{l.time}</div>
                      <div className="log-dot" style={{ background: l.colore }} />
                      <div className="log-txt">{l.testo}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Centro ── */}
        <div className="col-center">

          {/* Step header */}
          <div className="step-hdr">
            <div className="sh-ico">{passoCorr.icon}</div>
            <div className="sh-info">
              <div className="sh-badge">
                {passoCorr.categoria}{!passiCompletati.has(passoAttivo) ? ' · attivo' : ''}
              </div>
              <div className="sh-title">{passoCorr.titolo}</div>
              <div className="sh-desc">{passoCorr.desc}</div>
            </div>
            <div className="sh-btn-group">
              <button className="sh-guide-btn" onClick={() => setDettagliAperto(true)}>
                📋 Guida e obiettivi
              </button>
              <button
                className="sh-done-btn"
                disabled={timerScaduto || uiBloccata || passiCompletati.has(passoAttivo)}
                onClick={segnaFatto}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {passiCompletati.has(passoAttivo) ? 'Completato ✓' : 'Segna fatto'}
              </button>
            </div>
          </div>

          {/* Terminale */}
          <div className="center-scroll">
            <div className="terminal-card">
              <div className="term-hdr">
                <div className="term-dot" style={{ background: '#ff5f57' }} />
                <div className="term-dot" style={{ background: '#ffbd2e' }} />
                <div className="term-dot" style={{ background: '#28ca41' }} />
                <div className="term-title">analyst@cybernexus — incident-console #{id?.slice(-3) || '005'}</div>
                <div className="term-live"><div className="tld" />LIVE</div>
              </div>
              <div className="term-body" ref={termBodyRef}>
                {righeTerminale.map((r, i) => renderRiga(r, i))}
                <span className="t-line"><span className="t-p">[NOW]  </span><span className="t-cur" /></span>
              </div>
              <div className="term-inp-row">
                <span className="t-prompt">$</span>
                <input
                  className="t-inp"
                  value={comandoInput}
                  onChange={e => setComandoInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && eseguiComando()}
                  placeholder="inserisci comando..."
                  disabled={timerScaduto || uiBloccata}
                />
                <button className="t-run" onClick={eseguiComando} disabled={timerScaduto || uiBloccata}>RUN ↵</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar destra ── */}
        <div className={`col-right ${!destraAperta ? 'hidden' : ''}`}>

          {/* Pannello dettagli step — si sovrappone alla chat */}
          <div className={`step-details ${dettagliAperto ? 'open' : ''}`}>
            <div className="sd-hdr">
              <div className="sd-ico">{passoCorr.icon}</div>
              <div className="sd-info">
                <div className="sd-badge">{passoCorr.categoria}</div>
                <div className="sd-title">{passoCorr.titolo}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: 'var(--text3)', padding: '2px 7px', borderRadius: 5, background: 'var(--bg3)', border: '0.5px solid var(--border)' }}>
                  {completati} / {PASSI.length}
                </div>
                <div className="sd-close" onClick={() => setDettagliAperto(false)} title="Chiudi pannello">✕</div>
              </div>
            </div>

            <div className="sd-scroll">
              <div className="sd-guide-lbl">📋 Cosa fare</div>
              {/* dangerouslySetInnerHTML sicuro: contenuto statico, non da input utente */}
              <div className="sd-guide-text" dangerouslySetInnerHTML={{ __html: passoCorr.guida }} />

              <div className="sd-obj-lbl">✓ Obiettivi</div>
              <div className="obj-list">
                {passoCorr.obiettivi.map((obj, i) => {
                  const key = `${passoAttivo}-${i}`;
                  const fatto = !!obiettiviCheck[key];
                  return (
                    <div key={i} className={`obj-item ${fatto ? 'done' : ''}`} onClick={() => toggleObiettivo(passoAttivo, i)}>
                      <div className="obj-chk">{fatto ? '✓' : ''}</div>
                      {obj}
                    </div>
                  );
                })}
              </div>

              {/* Playbook completo */}
              <div className="sd-guide-lbl sd-pb-lbl">📖 Playbook completo</div>
              {GRUPPI_PLAYBOOK.map(g => (
                <div key={g.key} className={`acc-ph ${gruppiAperti[g.key] ? 'open' : ''}`}>
                  <div className="acc-tr" onClick={() => setGruppiAperti(prev => ({ ...prev, [g.key]: !prev[g.key] }))}>
                    <div className="acc-dot" style={{ background: g.colore }} />
                    <div className="acc-nm" style={{ color: g.colore }}>{g.nome}</div>
                    <div className="acc-bg" style={{ background: g.colBg, color: g.colore, padding: '2px 7px', borderRadius: 4, fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                      {g.indici.filter(i => passiCompletati.has(i)).length}/{g.indici.length}
                      {g.indici.every(i => passiCompletati.has(i)) ? ' ✓' : ''}
                    </div>
                    <div className="acc-cv">▾</div>
                  </div>
                  <div className="acc-bd">
                    {g.indici.map(idx => {
                      const p = PASSI[idx];
                      const fatto = passiCompletati.has(idx);
                      const attivo = idx === passoAttivo && !fatto;
                      return (
                        <div key={idx} className={`acc-st ${fatto ? 'done' : attivo ? 'active' : ''}`} onClick={() => selezionaPasso(idx)}>
                          <div className="acc-ck">{fatto ? '✓' : ''}</div>
                          <div>
                            <div className="as-tx">{p.titolo}</div>
                            <div className="as-mt">
                              <span className="as-tag">{p.tag}</span>
                              <div className="as-av" style={{ background: p.avColore }}>{p.avIni}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat — occupa tutta l'altezza quando il pannello è chiuso */}
          <div className="chat-sec">
            <div className="chat-hdr">
              <div className="chat-hdr-t">
                💬 Team chat
                <div className="ol-dot" style={{ marginLeft: 5 }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{membriOnline.length} online</span>
            </div>
            <div className="chat-msgs" ref={chatMsgsRef}>
              {messaggiChat.map((m, i) => {
                if (m.tipo === 'sys') return (
                  <div key={i} className="chat-msg">
                    <div><div className="cm-bub cm-sys">{m.testo}</div></div>
                  </div>
                );
                return (
                  <div key={i} className={`chat-msg ${m.me ? 'me' : ''}`}>
                    <div className="cm-av" style={{ background: m.colore }}>{m.av}</div>
                    <div className="cm-bub">{m.testo}</div>
                  </div>
                );
              })}
            </div>
            {/* Indicatore di digitazione: appare quando un altro membro sta scrivendo */}
            {utenteCheScrive && (
              <div className="chat-typing">{utenteCheScrive} sta scrivendo...</div>
            )}
            <div className="chat-inp-row">
              <input
                className="chat-inp"
                value={inputChat}
                onChange={e => {
                  setInputChat(e.target.value);
                  // Debounce 1s: emette typing indicator solo se l'input non è vuoto
                  clearTimeout(typingDebounceRef.current);
                  if (e.target.value.trim()) {
                    typingDebounceRef.current = setTimeout(() => {
                      socketRef.current?.emit('log-event', { roomId: id, content: 'sta scrivendo...' });
                    }, 1000);
                  }
                }}
                onKeyDown={e => e.key === 'Enter' && inviaChat()}
                placeholder={uiBloccata ? 'Sala chiusa' : 'Scrivi al team...'}
                disabled={timerScaduto || uiBloccata}
              />
              <button className="chat-send" onClick={inviaChat} disabled={timerScaduto || uiBloccata}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
