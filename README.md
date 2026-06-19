# CyberNexus

Piattaforma educativa di cybersecurity sviluppata per l'esame di **Fondamenti del Web**
(Corso di Laurea in Ingegneria Informatica e dell'Automazione, A.A. 2025/2026).

L'applicazione è una Single Page Application con client-side rendering e combina due moduli:

- **CTF Arena** — sfide capture-the-flag individuali con verifica della flag tramite hashing SHA-256, suggerimenti a costo di punti, categorie e livelli di difficoltà.
- **War Room** — simulatore collaborativo di incident response in tempo reale: un team entra in una sala che rappresenta un incidente informatico (ransomware, data breach, DDoS), segue un playbook, usa un terminale simulato, comunica via chat e genera un report finale.

I due moduli formano un percorso di crescita: prima si risolvono sfide CTF da soli per guadagnare punti ed esperienza, poi si mettono alla prova quelle competenze in scenari di emergenza simulati con altri.

---

## Funzionalità principali

- Autenticazione con email/password (JWT) e login social con **Google** e **GitHub** (OAuth).
- Sistema di ruoli progressivi: **Guest → Player → Analyst → Admin**. A 500 punti un Player viene promosso automaticamente ad Analyst e sblocca l'accesso alle War Room.
- CTF Arena con filtri per categoria e difficoltà, ricerca, hint sbloccabili a costo di punti, verifica flag con SHA-256.
- War Room collaborativa in tempo reale (Socket.IO): chat, terminale condiviso, playbook a step sincronizzati, board Kanban, report PDF.
- Leaderboard globale con classifica, podio e profili utente.
- Dashboard personale con statistiche, heatmap di attività, progressione punti e achievement.
- Pannello Admin per la gestione di utenti, sfide e War Room.
- Documentazione delle API con **Swagger**.

---

## Stack tecnologico

**Frontend**
- React + Vite
- React Router
- Material UI + CSS personalizzato
- Axios
- Socket.IO client
- jsPDF (generazione report)

**Backend**
- Node.js + Express (CommonJS)
- MongoDB Atlas + Mongoose
- JWT (access token 15 min + refresh token 7 giorni) + bcrypt
- Passport.js (OAuth Google e GitHub)
- Socket.IO
- Helmet, express-rate-limit (sicurezza)
- swagger-ui-express + yamljs (documentazione)

---

## Struttura del progetto

```
cybernexus/
├── backend/
│   ├── models/         schemi Mongoose (User, Challenge, WARRoom, Submission)
│   ├── routes/         endpoint Express
│   ├── controllers/    logica delle route
│   ├── middleware/     autenticazione JWT e autorizzazione per ruolo
│   ├── config/         connessione DB e strategie OAuth
│   ├── sockets/        gestione eventi Socket.IO (War Room)
│   ├── services/       webhook di notifica esterna
│   ├── swagger.yaml    documentazione OpenAPI 3.0
│   ├── seed.js         popolamento iniziale del database
│   └── server.js       entrypoint Express
└── frontend/
    └── src/
        ├── pages/      una pagina per schermata (Landing, Login, Dashboard, CTFArena, WarRoom, Leaderboard, Admin)
        ├── components/ componenti riutilizzabili (Navbar, KanbanBoard, ProtectedRoute, ...)
        ├── context/    stato globale (AuthContext, NotificationsContext)
        └── services/   istanza Axios e chiamate API
```

---

## Requisiti

- Node.js 18 o superiore
- npm
- Un cluster MongoDB Atlas (o un'istanza MongoDB raggiungibile)

---

## Installazione e avvio in locale

### 1. Clonare la repository

```bash
git clone https://github.com/LiciaZichella/cybernexus.git
cd cybernexus
```

### 2. Backend

```bash
cd backend
npm install
```

Creare un file `.env` dentro `backend/` (vedi la sezione *Variabili d'ambiente*), poi avviare:

```bash
npm run dev
```

Il backend parte sulla porta **5005**.

### 3. Frontend

In un secondo terminale:

```bash
cd frontend
npm install
npm run dev
```

Il frontend parte sulla porta **5173**.

### 4. Popolare il database (solo alla prima esecuzione)

```bash
cd backend
node seed.js
```

Lo script crea un utente Admin, alcuni utenti Player di esempio e alcune sfide CTF di test.

---

## Variabili d'ambiente

I file `.env` non sono inclusi nella repository. Vanno creati manualmente a partire dai
file `.env.example` forniti, inserendo i propri valori. **Non inserire mai chiavi reali nella repository.**

### `backend/.env`

```
MONGO_URI=                      # stringa di connessione MongoDB Atlas
JWT_SECRET=                     # stringa segreta per gli access token
JWT_REFRESH_SECRET=             # stringa segreta per i refresh token
PORT=5005
CLIENT_ORIGIN=http://localhost:5173
BACKEND_URL=http://localhost:5005
GOOGLE_CLIENT_ID=               # credenziali OAuth Google
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=               # credenziali OAuth GitHub
GITHUB_CLIENT_SECRET=
WEBHOOK_URL=                    # opzionale: URL per la notifica webhook (es. webhook.site)
```

### `frontend/.env`

```
VITE_API_URL=http://localhost:5005
VITE_SOCKET_URL=http://localhost:5005
```

In produzione queste due variabili vanno impostate con l'URL pubblico del backend.

---

## Documentazione delle API (Swagger)

Con il backend in esecuzione, la documentazione interattiva è disponibile su:

```
http://localhost:5005/api/docs
```

Da questa pagina è possibile consultare tutti gli endpoint, vedere i parametri e le risposte,
e provare le chiamate direttamente dal browser. Per gli endpoint protetti, effettuare prima
il login, copiare l'`accessToken` ricevuto e inserirlo con il pulsante **Authorize**.

---

## Credenziali di test

Dopo aver eseguito il seed, è possibile accedere con:

| Ruolo  | Email                   | Password   |
|--------|-------------------------|------------|
| Admin  | admin@cybernexus.com    | Admin123!  |
| Player | hacker01@example.com    | Player123! |

---

## Deploy

L'applicazione è deployata online:

- **Frontend (Netlify):** `<URL-DA-INSERIRE>`
- **Backend (Render):** `<URL-DA-INSERIRE>`
- **Documentazione API:** `<URL-BACKEND>/api/docs`

> Nota: il backend è ospitato su un piano gratuito che mette in pausa il servizio dopo un
> periodo di inattività. La prima richiesta dopo una pausa può richiedere alcuni secondi
> per "risvegliare" il server.

---

## Modello dei dati

**User** — username, email, passwordHash, role (Guest/Player/Analyst/Admin), points,
solvedChallenges, streak, warRoomsCompleted, isBanned, oauthProvider, createdAt.

**Challenge** — title, description, category, difficulty, points, flagHash (SHA-256 della
flag), hints `[{ text, cost }]`, attachments, solvedBy, isActive.

**WARRoom** — name, description, tipo (ransomware/data_breach/ddos), severity, durataMinuti,
status (draft/active/closed), members `[{ user, role }]`, playbook, tasks, iocs,
comandiTerminale, inviteCode, isPrivate.

**Submission** — user, challenge, warRoom, submittedFlag, isCorrect, pointsAwarded,
ipAddress, createdAt.

---

## Tecniche avanzate e sicurezza

- **Hashing flag con SHA-256**: le flag non sono mai salvate in chiaro nel database.
- **Aggregation pipeline MongoDB**: classifica e statistiche calcolate lato database.
- **Rate limiting**: limite sulle richieste di autenticazione e sull'invio delle flag, per prevenire abusi e bruteforce.
- **JWT con refresh token**: access token a breve durata in memoria, refresh token per il rinnovo della sessione.
- **Autorizzazione per ruolo (RBAC)**: middleware che protegge le route in base al ruolo dell'utente.
- **Socket.IO con autenticazione JWT** nell'handshake per la War Room.
- **Webhook fire-and-forget**: alla risoluzione di una War Room il backend invia una notifica POST a un URL esterno configurabile.
- **Helmet**: header HTTP di sicurezza.

---

## Autori

Progetto realizzato in coppia per l'esame di Fondamenti del Web.
