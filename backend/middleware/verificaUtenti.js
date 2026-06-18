const jwt = require('jsonwebtoken');
const User = require('../models/User');


const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accesso negato: token mancante.' });
  }

  const token = authHeader.split(' ')[1];

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


const RANK = { Guest: 0, Player: 1, Analyst: 2, Admin: 3 };




const authorize = (...roles) => {
  const sogliaMinima = Math.min(...roles.map(r => RANK[r] ?? 99));
  return (req, res, next) => {
    if ((RANK[req.user.role] ?? -1) < sogliaMinima) {
      return res.status(403).json({ error: 'Permessi insufficienti.' });
    }
    next();
  };
};

module.exports = { protect, authorize };
