const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifica il JWT nell'header Authorization: Bearer <token>
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accesso negato: token mancante.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Carica l'utente dal DB per avere dati aggiornati (escluso passwordHash)
    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato.' });
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

// Limita l'accesso ai soli ruoli specificati
// Uso: authorize('Admin', 'Manager')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Accesso riservato a: ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
