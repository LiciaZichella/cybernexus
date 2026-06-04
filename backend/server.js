require('dotenv').config();

const http        = require('http');
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { Server }  = require('socket.io');
const swaggerUi   = require('swagger-ui-express');
const YAML        = require('yamljs');
const connectDB      = require('./config/db');
const passport       = require('./config/passport');
const warroomSocket  = require('./sockets/warroom');

const app        = express();
const httpServer = http.createServer(app);

// Socket.IO montato sull'HTTP server con CORS allineato al frontend
const io = new Server(httpServer, {
  cors: {
    origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});
warroomSocket(io);

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

// Passport (senza sessioni — solo OAuth stateless con JWT)
app.use(passport.initialize());

// Documentazione API — montata PRIMA del rate limiter per non essere soggetta al limite
const swaggerDoc = YAML.load('./swagger.yaml');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Rate limiting globale: 500 req/15min in sviluppo, 100 in produzione
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova tra qualche minuto.' },
});
app.use(limiter);

// Route autenticazione
app.use('/api/auth',  require('./routes/auth'));

// Route utenti
app.use('/api/users',      require('./routes/users'));

// Route challenge
app.use('/api/challenges', require('./routes/challenges'));

// Route War Room
app.use('/api/warroom',      require('./routes/warroom'));

// Route leaderboard
app.use('/api/leaderboard',  require('./routes/leaderboard'));

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
httpServer.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Swagger UI disponibile su http://localhost:5005/api/docs`);
});
