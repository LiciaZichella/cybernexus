const User = require('../models/User');

// GET /api/users/me — profilo completo dell'utente autenticato (sempre fresco dal DB)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/me — aggiorna username, bio e avatar
const updateMe = async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;

    // Costruisce dinamicamente solo i campi presenti nella richiesta
    const updates = {};
    if (username !== undefined) updates.username = username.trim();
    if (bio      !== undefined) updates.bio      = bio.trim();
    if (avatar   !== undefined) updates.avatar   = avatar.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare fornito.' });
    }

    // Controlla conflitto username con altri utenti
    if (updates.username) {
      const taken = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } });
      if (taken) return res.status(409).json({ error: 'Username già in uso.' });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,            // restituisce il documento aggiornato
      runValidators: true,  // applica le validazioni dello schema
    });

    res.json({ user: updated.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:id — profilo pubblico di un qualsiasi utente
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    // CastError: id malformato
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users — lista tutti gli utenti (solo Admin)
const getAllUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ points: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      users: users.map((u) => u.toPublicJSON()),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/:id/role — cambia il ruolo di un utente (solo Admin)
const changeUserRole = async (req, res) => {
  try {
    const RUOLI_VALIDI = ['Guest', 'Player', 'Analyst', 'Manager', 'Admin'];
    const { role } = req.body;

    // Verifica che il ruolo sia uno dei valori accettati dall'enum
    if (!role || !RUOLI_VALIDI.includes(role)) {
      return res.status(400).json({
        error: `Ruolo non valido. Valori ammessi: ${RUOLI_VALIDI.join(', ')}.`,
      });
    }

    // Un Admin non può modificare il proprio ruolo
    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({ error: 'Non puoi modificare il tuo stesso ruolo.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    // CastError: id malformato
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMe, updateMe, getUserById, getAllUsers, changeUserRole };
