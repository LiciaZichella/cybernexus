# CyberNexus

Piattaforma educativa per la cybersecurity con CTF Arena e War Room collaborativa real-time.  
Gli utenti risolvono sfide Capture The Flag, collaborano in team su scenari di incident response e scalano la classifica globale.

---

## Stack tecnologico

| Layer | Tecnologie |
|---|---|
| **Frontend** | React 18 + Vite, React Router v6, Material UI, Axios, Socket.IO client v4 |
| **Backend** | Node.js + Express, MongoDB Atlas, Mongoose, JWT + bcrypt, Socket.IO, Helmet, express-rate-limit |
| **Documentazione API** | Swagger UI — disponibile su `/api/docs` |

---

## Funzionalità principali

### CTF Arena
- Griglia di sfide filtrabili per categoria e difficoltà
- Verifica flag con SHA-256 lato backend (nessuna flag in chiaro nel DB)
- Suggerimenti a pagamento scalati in punti
- Rate limiting su `/api/challenges/:id/submit` contro il brute-force

### War Room collaborativa
- Stanze di incident response in real-time via Socket.IO
- Playbook a step, chat di squadra, log eventi live
- Countdown timer con avviso a 10 minuti
- Webhook POST su URL esterno alla risoluzione della sala
- Codice invito per stanze private

### Leaderboard
- Classifica globale calcolata con MongoDB aggregation pipeline (`$group` + `$sort`)
- Podio top-3, paginazione, pannello profilo con radar chart e heatmap attività

### Admin Panel
- Gestione utenti: cambio ruolo, lista paginata
- Gestione sfide CTF: creazione con preview hash SHA-256 in tempo reale
- Gestione War Room: creazione, monitoraggio stato
- Configurazione webhook globale

---

## Avvio in locale

### Prerequisiti
- Node.js 18+
- npm
- Account MongoDB Atlas (o istanza locale)

### 1. Clona il repository e installa le dipendenze

```bash
git clone <url-repo>
cd cybernexus

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configura le variabili d'ambiente

**`backend/.env`**
```env
MONGO_URI=<stringa connessione MongoDB Atlas>
JWT_SECRET=cybernexus_jwt_secret_2026
JWT_REFRESH_SECRET=cybernexus_refresh_secret_2026
PORT=5005
CLIENT_ORIGIN=http://localhost:5173
WEBHOOK_URL=
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5005
VITE_SOCKET_URL=http://localhost:5005
```

### 3. Popola il database (prima esecuzione)

```bash
cd backend && node seed.js
```

Crea 1 Admin, 3 Player di esempio e 3 challenge di test con flag nel formato `FLAG{...}`.

### 4. Avvia i server

```bash
# Terminale 1 — Backend (porta 5005)
cd backend && npm run dev

# Terminale 2 — Frontend (porta 5173)
cd frontend && npm run dev
```

Apri [http://localhost:5173](http://localhost:5173) nel browser.

---

## Credenziali demo

| Ruolo | Email | Password |
|---|---|---|
| Admin | admin@cybernexus.com | Admin123! |
| Player | hacker01@example.com | Player123! |
| Player | ctfplayer@example.com | Player123! |

---

## Struttura del progetto

```
cybernexus/
├── backend/
│   ├── config/          → connessione MongoDB
│   ├── controllers/     → logica degli endpoint
│   ├── middleware/      → autenticazione JWT, autorizzazione per ruolo
│   ├── models/          → schemi Mongoose (User, Challenge, WARRoom, Submission)
│   ├── routes/          → definizione delle route Express
│   ├── services/        → webhook.js
│   ├── sockets/         → handler Socket.IO (namespace /warroom)
│   ├── swagger.yaml     → specifica OpenAPI 3.0.0
│   ├── seed.js          → script popolamento DB
│   └── server.js        → entry point
└── frontend/
    └── src/
        ├── components/  → componenti riutilizzabili (ProtectedRoute, ecc.)
        ├── context/     → AuthContext (token in memoria + refresh)
        ├── hooks/       → custom hooks
        ├── pages/       → Landing, Login, Dashboard, CTFArena,
        │                  Leaderboard, WarRoom, Admin
        └── services/    → api.js (Axios + interceptor 401 auto-refresh)
```

---

## Documentazione API

Swagger UI disponibile su **[http://localhost:5005/api/docs](http://localhost:5005/api/docs)** a backend avviato.

### Endpoint principali

| Metodo | Path | Descrizione |
|---|---|---|
| `POST` | `/api/auth/register` | Registrazione nuovo utente |
| `POST` | `/api/auth/login` | Login — restituisce access + refresh token |
| `POST` | `/api/auth/refresh` | Rinnova l'access token |
| `GET` | `/api/users/me` | Profilo dell'utente autenticato |
| `PATCH` | `/api/users/:id/role` | Cambia ruolo utente (solo Admin) |
| `GET` | `/api/challenges` | Lista sfide CTF |
| `POST` | `/api/challenges/:id/submit` | Invia una flag (rate limited) |
| `GET` | `/api/challenges/:id/hint` | Ottieni un suggerimento |
| `GET` | `/api/warroom` | Lista War Room |
| `POST` | `/api/warroom/:id/join` | Entra in una War Room |
| `POST` | `/api/warroom/:id/resolve` | Chiudi la sala e invia webhook |
| `GET` | `/api/leaderboard` | Classifica globale |

---

## Deploy

| Servizio | URL |
|---|---|
| Backend (Render) | `[URL Render]` |
| Frontend (Vercel) | `[URL Vercel]` |
