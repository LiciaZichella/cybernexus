const express  = require('express');
const jwt      = require('jsonwebtoken');
const passport = require('../config/passport');
const { register, login, refresh, logout } = require('../controllers/authController');
const { protect } = require('../middleware/verificaUtenti');

const router = express.Router();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const generateTokens = (userId) => {
  const accessToken  = jwt.sign({ id: userId }, process.env.JWT_SECRET,         { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET,  { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.post('/logout',   protect, logout);

/* ── Google OAuth ───────────────────────────────────────────────────────────── */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_ORIGIN}/login?error=oauth` }),
  async (req, res) => {
    try {
      const User = require('../models/User');
      const { accessToken, refreshToken } = generateTokens(req.user._id);
      await User.findByIdAndUpdate(req.user._id, { refreshToken });
      // Invia entrambi i token al frontend così non serve un round-trip di refresh
      res.redirect(`${CLIENT_ORIGIN}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch {
      res.redirect(`${CLIENT_ORIGIN}/login?error=oauth`);
    }
  }
);

/* ── GitHub OAuth ───────────────────────────────────────────────────────────── */
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${CLIENT_ORIGIN}/login?error=oauth` }),
  async (req, res) => {
    try {
      const User = require('../models/User');
      const { accessToken, refreshToken } = generateTokens(req.user._id);
      await User.findByIdAndUpdate(req.user._id, { refreshToken });
      res.redirect(`${CLIENT_ORIGIN}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch {
      res.redirect(`${CLIENT_ORIGIN}/login?error=oauth`);
    }
  }
);

module.exports = router;
