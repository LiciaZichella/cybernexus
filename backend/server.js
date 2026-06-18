require('dotenv').config();

const http        = require('http');
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { Server }  = require('socket.io');
const swaggerUi   = require('swagger-ui-express');
const YAML        = require('yamljs');
const connectDB           = require('./config/db');
const passport            = require('./config/passport');
const warroomSocket       = require('./sockets/warroom');
const warroomController   = require('./controllers/warroomController');

const app        = express();
const httpServer = http.createServer(app);


const io = new Server(httpServer, {
  cors: {
    origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});
warroomSocket(io);
warroomController.setIo(io);   
app.set('io', io);             


connectDB();


app.use(helmet());


app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());


const swaggerDoc = YAML.load('./swagger.yaml');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));


app.set('trust proxy', 1);


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova tra qualche minuto.' },
});
app.use(limiter);


app.use('/api/auth',  require('./routes/auth'));


app.use('/api/users',      require('./routes/users'));


app.use('/api/challenges', require('./routes/challenges'));


app.use('/api/warroom',      require('./routes/warroom'));


app.use('/api/leaderboard',  require('./routes/leaderboard'));


app.use('/api/admin', require('./routes/admin'));


app.use('/api/platform', require('./routes/platform'));


app.get('/', (req, res) => {
  res.json({ message: 'CyberNexus API running' });
});


process.on('unhandledRejection', (err) => {
  console.error(`Errore non gestito: ${err.message}`);
  process.exit(1);
});

const PORT = process.env.PORT || 5005;
httpServer.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Swagger UI disponibile su http://localhost:${PORT}/api/docs`);
});
