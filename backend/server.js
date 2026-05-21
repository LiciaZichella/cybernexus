require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// Connessione al database
connectDB();

// Sicurezza HTTP headers
app.use(helmet());

// CORS: consente richieste dal frontend (variabile d'ambiente o default localhost:5173)
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Parsing del body JSON e form URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting globale: max 100 richieste per IP ogni 15 minuti
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova tra qualche minuto.' },
});
app.use(limiter);

// Route autenticazione
app.use('/api/auth', require('./routes/auth'));

// Route base — health check
app.get('/', (req, res) => {
  res.json({ message: 'CyberNexus API running' });
});

// Gestione promise rigettate non catturate
process.on('unhandledRejection', (err) => {
  console.error(`Errore non gestito: ${err.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
