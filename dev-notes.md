# CyberNexus — note di sviluppo

## Stack
- Frontend: React + Vite, React Router, MUI, Axios, Socket.IO client
- Backend: Node.js, Express, MongoDB Atlas, Mongoose
- Auth: JWT (access token 15min + refresh token 7gg), bcrypt
- Real-time: Socket.IO
- Sicurezza: Helmet, express-rate-limit
- Docs: Swagger

## Struttura
cybernexus/
├── backend/
│   ├── models/         → schemi Mongoose
│   ├── routes/         → endpoint Express
│   ├── middleware/     → auth JWT, rate limit
│   ├── controllers/    → logica delle routes
│   ├── config/         → db connection
│   ├── sockets/        → Socket.IO handlers
│   └── server.js
└── frontend/
    └── src/
        ├── components/ → componenti riutilizzabili
        ├── pages/      → una per ogni schermata
        ├── context/    → AuthContext, NotificationsContext
        ├── hooks/      → custom hooks
        └── services/   → chiamate Axios

## Modelli MongoDB

### User
- username (string, unique)
- email (string, unique)  
- passwordHash (string)
- role: Guest | Player | Analyst | Manager | Admin
- points (number, default 0)
- solvedChallenges: [ref Challenge]
- streak (number)
- createdAt

### Challenge
- title, description, category, difficulty, points
- flagHash (SHA-256 della flag in chiaro)
- files: [string]
- hints: [{text, cost}]
- solvedBy: [ref User]
- createdBy: ref User

### WARRoom
- title, type, severity, points
- briefing, playbook: [{step, description}]
- status: open | active | closed
- team: [ref User]
- createdAt, resolvedAt

### Submission
- user: ref User
- challenge: ref Challenge
- correct (boolean)
- submittedAt

## Endpoints principali
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/users/me
GET  /api/challenges
POST /api/challenges/:id/submit  ← sha256 flag check
GET  /api/leaderboard            ← MongoDB aggregation
GET  /api/warroom
POST /api/warroom/:id/join
POST /api/warroom/:id/resolve

## Socket.IO events
join-room, leave-room
step-completed, chat-message
log-event, room-resolved

## Tecniche avanzate
- Flag hashing: SHA-256 (crypto nativo Node.js)
- Rate limiting: express-rate-limit su /api/challenges/:id/submit
- Helmet: tutti gli header HTTP
- MongoDB aggregation: leaderboard con $group + $sort
- Webhook: POST su URL esterno a risoluzione War Room

## Variabili .env backend
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=5005
CLIENT_ORIGIN=http://localhost:5173
BACKEND_URL=http://localhost:5005
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
WEBHOOK_URL=

## Variabili .env frontend
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000

## Convenzioni
- Tutti i commenti e variabili in inglese
- Componenti React in PascalCase
- File utils/services in camelCase
- Errori sempre con status code HTTP corretto

## Stato sviluppo

### Completato
- Setup repo GitHub (privata, entrambi collaboratori)
- Struttura cartelle backend/ e frontend/
- Dipendenze backend installate (express, mongoose, bcryptjs,
  jsonwebtoken, cors, helmet, express-rate-limit, socket.io,
  swagger-ui-express, yamljs, nodemon)
- Dipendenze frontend installate (react, vite, react-router-dom,
  @mui/material, axios, socket.io-client)
- .gitignore configurato
- package.json backend con script start e dev
- server.js — Express + helmet + cors + rate limiting globale
- config/db.js — connessione MongoDB Atlas con Mongoose
- middleware/verificaUtenti.js — JWT protect + authorize per ruolo
- models/User.js — utente con ruoli, punti, streak, CTF stats
- models/Challenge.js — challenge CTF con flag SHA-256, hint, allegati
- models/WARRoom.js — sala collaborativa con chat, lavagna, inviteCode
- models/Submission.js — log invii flag con audit trail
- routes/auth.js + controllers/authController.js — register, login, refresh, logout
- routes/users.js + controllers/usersController.js — profilo, aggiornamento, lista Admin
- routes/challenges.js + controllers/challengesController.js — CRUD challenge, submit flag, hint
- routes/warroom.js + controllers/warroomController.js — CRUD sala, join, resolve + webhook
- routes/leaderboard.js + controllers/leaderboardController.js — classifica con aggregation pipeline
- sockets/warroom.js — eventi Socket.IO con autenticazione JWT nell'handshake
- seed.js — script popolamento DB con utenti e challenge di test
- .claude/ aggiunto al .gitignore

### Completato — Backend (aggiuntivo)
- services/webhook.js — notifica esterna a risoluzione War Room
- swagger.yaml — documentazione API
- config/passport.js — strategie OAuth Google e GitHub
- routes/auth.js aggiornato con /google e /github
- GET /api/users/me/activity — submission corrette 
  raggruppate per giorno, ultimi 60 giorni
- GET /api/users/me/submissions — submission corrette 
  con punti e date per grafico progressione

### Completato — Frontend
- React Router v6 setup (App.jsx + main.jsx)
- AuthContext.jsx — accessToken in memoria, refreshToken in localStorage
- api.js — Axios instance con interceptor 401 auto-refresh
- ProtectedRoute.jsx — redirect login / ruolo insufficiente
- Login.jsx — login + registrazione, animazioni, tema dark/light; "Hai dimenticato?" mostra messaggio
- Dashboard.jsx — rank reale da leaderboard API, war room count reale, war room cards da API con navigazione
- CTFArena.jsx — griglia sfide, filtri, modale submit flag, hint API; paginazione corretta (usa data.pages)
- Landing.jsx — convertita dal prototipo HTML; route /ctf e /warroom collegate; form registrazione wired a authAPI.register()
- Leaderboard.jsx — podio, classifica completa, modale profilo; tab Globale/Settimanale/Amici con re-fetch
- WarRoom.jsx — lista sale (/warroom) e dettaglio sala (/warroom/:id); authLoading fix; route lista aggiunta in App.jsx
- Admin.jsx — pannello completo; modifica sfide con pre-popolamento form e PATCH; search bar filtro utenti/sfide; bottoni stub con toast; navigazione "Osserva" → /warroom/:id
- Fix bug solveCount virtual nel backend (Challenge.js)
- Fix categorie CTF Arena e Admin allineate ai valori enum del backend
- Fix authLoading guard in tutte le pagine (CTFArena, Dashboard, Admin, Leaderboard, WarRoom)
- Fix navigazione admin panel (redirect corretto per ruolo)
- Rate limiter aumentato in sviluppo per evitare blocchi durante i test
- WarRoom.jsx — Socket.IO reale: join-room/leave-room, chat-message, user-joined/left, step-completed, log-event, room-resolved; getMemoryToken() nell'handshake; warroomAPI.join() all'ingresso; rimossi tutti gli eventi e chat simulati
- OAuth Google e GitHub con Passport.js (config/passport.js, route /api/auth/google e /api/auth/github); OAuthCallback.jsx; User.js esteso con oauthProvider e oauthId
- Profile dropdown (NavDropdown.jsx) in tutte le navbar: avatar, username, email, badge ruolo, logout; chiusura on outside-click
- Notifiche reali via NotificationsContext (rimossi tutti i dati falsi NOTIF_TPL e ACTIVITY_ITEMS); bell dropdown con badge unread; feed live nella Dashboard
- Aggiornamento punti e classifica real-time dopo submit flag: aggiornaUser() in AuthContext aggiorna lo stato globale; visibilitychange su Dashboard e Leaderboard per re-fetch al ritorno dalla CTF Arena
- getMe ora fa query fresca dal DB (User.findById) invece di restituire il snapshot caricato dal middleware
- War Room fix completo: passi/utenti/log/chat reali,
  step sincronizzati via Socket.IO, terminale tematico,
  preview sala prima di entrare, report PDF con grafica
  CyberNexus, punti coerenti nel modal di risoluzione,
  webhook info reale
- Dashboard: solo War Room reali dal DB, nessun dato
  hardcoded
- Fix bug submit flag CTF — ora controlla data.correct 
  prima di aggiornare punti
- WarRoom.jsx Socket.IO reale completo — chat, log eventi, 
  typing indicator, notifiche presenza, report JSON scaricabile
- Modale Termini di servizio e Privacy Policy nella Landing.jsx
- Navbar.jsx + Navbar.css — componente condiviso usato da tutte le pagine
  (prefix `cn-`, props: centerContent, rightExtra)
  WarRoom vista incidente mantiene wr-navbar specializzata (timer + severità)
- Navbar.jsx — componente condiviso con logo, voci menu, 
  toggle dark/light, notifiche, admin pill, dropdown profilo; 
  usata in tutte le pagine al posto delle navbar inline
- Dashboard.jsx — tutte le sezioni ora dinamiche: heatmap 
  60 giorni da API activity, progressione punti da submissions, 
  categorie risolte calcolate dal DB, achievement calcolati 
  su dati reali (streak, punti, solve count, top 10)

### Da fare — Altro
- Deploy Render (backend) + Vercel (frontend)
- Test end-to-end completo War Room con 2 utenti
- ZIP consegna per Teams
---

## Note importanti per la collega

### Convenzioni backend
- Il backend usa **CommonJS** (`require` / `module.exports`), non ES modules.
- La porta del backend è **5005** (non 3000 o 5000).

### File .env
Il file `.env` **non è su GitHub** e va creato manualmente in `backend/`:

```
MONGO_URI=<stringa connessione MongoDB Atlas>
JWT_SECRET=cybernexus_jwt_secret_2026
JWT_REFRESH_SECRET=cybernexus_refresh_secret_2026
PORT=5005
CLIENT_ORIGIN=http://localhost:5173
WEBHOOK_URL=
```

### Avvio in locale
```bash
# Terminale 1 — backend
cd backend && npm run dev

# Terminale 2 — frontend
cd frontend && npm run dev
```

### Popolare il database (prima esecuzione)
```bash
cd backend && node seed.js
```
Crea: 1 Admin (`admin@cybernexus.com` / `Admin123!`), 3 Player di esempio, 3 challenge di test.

### Pagine ancora da convertire dai prototipi HTML
Tutte convertite e collegate. Rimane solo la chat Socket.IO reale in WarRoom.jsx.