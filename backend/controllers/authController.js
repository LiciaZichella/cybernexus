const jwt = require('jsonwebtoken');
const User = require('../models/User');


const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};


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

    
    const user = await User.create({ username, email, passwordHash: password });

    const { accessToken, refreshToken } = generateTokens(user._id);

    
    user.refreshToken = refreshToken;
    await user.save({ validateModifiedOnly: true });

    res.status(201).json({ accessToken, refreshToken, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }

    
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


const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token mancante.' });
    }

    
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token non valido o scaduto.' });
    }

    
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token non riconosciuto.' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateModifiedOnly: true });

    res.json({ accessToken, refreshToken: newRefreshToken }); //rotazione refresh token
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const logout = async (req, res) => {
  try {
    
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ message: 'Logout effettuato.' }); //solo un utente loggato puo effettuare un logout - collegamento middleware controller con req.user
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, refresh, logout };
