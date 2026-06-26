require('dotenv').config();  //caricamento variabili d'ambiente

const http        = require('http');
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { Server }  = require('socket.io'); //destructuring, solo classe Server
const swaggerUi   = require('swagger-ui-express');
const YAML        = require('yamljs');
const connectDB           = require('./config/db'); //import nostri moduli
const passport            = require('./config/passport');
const warroomSocket       = require('./sockets/warroom');
const warroomController   = require('./controllers/warroomController');

const app        = express();
const httpServer = http.createServer(app); //no app.listen perchè socket.io si deve agganciare allo stesso server


const io = new Server(httpServer, { //server Socket.IO
  cors: {
    origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});
warroomSocket(io);
warroomController.setIo(io);   
app.set('io', io);             


connectDB(); //connessione a MongoDB


app.use(helmet()); //aggiunge header HTTP per mitigare attacchi comuni


app.use(cors({  //senza il frontend riceverebbe errori CORS, di default il browser blocca le chiamate cross-origin
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());


const swaggerDoc = YAML.load('./swagger.yaml');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));


app.set('trust proxy', 1); //fix del deploy, indica a Express che è dietro un revers proxy (Render)


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova tra qualche minuto.' },
});
app.use(limiter); //applico a tutte le rotte dopo questo controllo

//Montaggio rotte
app.use('/api/auth',  require('./routes/auth'));


app.use('/api/users',      require('./routes/users'));


app.use('/api/challenges', require('./routes/challenges'));


app.use('/api/warroom',      require('./routes/warroom'));


app.use('/api/leaderboard',  require('./routes/leaderboard'));


app.use('/api/admin', require('./routes/admin'));


app.use('/api/platform', require('./routes/platform'));


app.get('/', (req, res) => { //rotta di cortesia per verificare il deploy
  res.json({ message: 'CyberNexus API running' });
});

//promise rifiutata senza gestione
process.on('unhandledRejection', (err) => { //listner: se una promise va in errore senza essere gestita da un try/catch
  console.error(`Errore non gestito: ${err.message}`);
  process.exit(1);
});
  
const PORT = process.env.PORT || 5005;
httpServer.listen(PORT, () => {    //no app perchè c'è anche socket.IO
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Swagger UI disponibile su http://localhost:${PORT}/api/docs`);
});
