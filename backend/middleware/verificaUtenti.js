const jwt = require('jsonwebtoken');
const User = require('../models/User');


const protect = async (req, res, next) => { //sei autenticato?
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {  //deve avere forma Bearer<token>, standard per i JWT
    return res.status(401).json({ error: 'Accesso negato: token mancante.' });
  }

  const token = authHeader.split(' ')[1]; //spezzo negli spazi, prendo secondo elemento

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account sospeso. Contatta l\'amministratore.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token scaduto.' });
    }
    return res.status(401).json({ error: 'Token non valido.' });
  }
};


const RANK = { Guest: 0, Player: 1, Analyst: 2, Admin: 3 }; //assegno ai ruoli un numero di gerarchia




const authorize = (...roles) => { //hai il ruolo giusto? restituisce un middleware
  const sogliaMinima = Math.min(...roles.map(r => RANK[r] ?? 99));
  return (req, res, next) => {
    if ((RANK[req.user.role] ?? -1) < sogliaMinima) { //se ammetti piu ruoli la soglia è quello del piu basso di loro
      return res.status(403).json({ error: 'Permessi insufficienti.' });
    }
    next();
  };
};

module.exports = { protect, authorize };
