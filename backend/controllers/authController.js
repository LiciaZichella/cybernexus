const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Genera access token (breve durata) e refresh token (lunga durata)
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email e password sono obbligatori.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({ error: `${field} già in uso.` });
    }

    // passwordHash viene hashata dal pre-save hook del modello
    const user = await User.create({ username, email, passwordHash: password });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Salva il refresh token sul documento utente
    user.refreshToken = refreshToken;
    await user.save({ validateModifiedOnly: true });

    res.status(201).json({ accessToken, refreshToken, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }

    // Carica esplicitamente passwordHash (select: false nel modello)
    const user = await User.findOne({ email }).select('+passwordHash +refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Credenziali non valide.' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateModifiedOnly: true });

    res.json({ accessToken, refreshToken, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token mancante.' });
    }

    // Verifica firma e scadenza
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token non valido o scaduto.' });
    }

    // Controlla che corrisponda a quello salvato (rotazione token)
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token non riconosciuto.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateModifiedOnly: true });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    // req.user è disponibile grazie al middleware protect
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ message: 'Logout effettuato.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, refresh, logout };
