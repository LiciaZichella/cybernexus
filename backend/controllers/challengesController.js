const crypto     = require('crypto');
const Challenge  = require('../models/Challenge');
const Submission = require('../models/Submission');
const User       = require('../models/User');

// Utility: hash SHA-256 di una stringa (flag plaintext → digest hex)
const sha256 = (str) => crypto.createHash('sha256').update(str.trim()).digest('hex');

// GET /api/challenges — lista challenge attive con filtri opzionali
const getChallenges = async (req, res) => {
  try {
    const filter = { isActive: true };

    // Filtri opzionali via query string: ?category=Web&difficulty=Easy&search=sql
    if (req.query.category)   filter.category   = req.query.category;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    // Ricerca per titolo (case-insensitive)
    if (req.query.search) {
      filter.title = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip  = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Challenge.find(filter)
        .select('-flag')               // carica solvedBy per il virtual solveCount, ma non espone la flag
        .sort({ points: 1 })
        .populate('author', 'username')
        .skip(skip)
        .limit(limit),
      Challenge.countDocuments(filter),
    ]);

    // Converte in JSON (include il virtual solveCount), poi rimuove solvedBy dalla risposta
    const challenges = docs.map(ch => {
      const obj = ch.toJSON();
      delete obj.solvedBy;
      return obj;
    });

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      challenges,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/challenges/:id — dettaglio singola challenge attiva
const getChallengeById = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, isActive: true })
      .select('-flag')
      .populate('author', 'username');

    if (!challenge) return res.status(404).json({ error: 'Challenge non trovata.' });

    // Indica se l'utente corrente l'ha già risolta
    const alreadySolved = challenge.solvedBy.some((s) => s.user.equals(req.user._id));

    res.json({ challenge, alreadySolved });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/challenges — crea nuova challenge (solo Admin)
const createChallenge = async (req, res) => {
  try {
    const { title, description, category, difficulty, points, flag, hints, attachments, tags } = req.body;

    if (!flag) return res.status(400).json({ error: 'Flag obbligatoria.' });

    // Salva l'hash SHA-256 della flag — mai il plaintext
    const challenge = await Challenge.create({
      title,
      description,
      category,
      difficulty,
      points,
      flag: sha256(flag),
      hints,
      attachments,
      tags,
      author: req.user._id,
    });

    res.status(201).json({ challenge });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Titolo già in uso.' });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/challenges/:id/submit — invio flag
const submitFlag = async (req, res) => {
  try {
    const { flag, warRoom } = req.body;

    if (!flag) return res.status(400).json({ error: 'Flag mancante.' });

    // Carica la flag hashata (select: false nel modello)
    const challenge = await Challenge.findOne({ _id: req.params.id, isActive: true }).select('+flag');
    if (!challenge) return res.status(404).json({ error: 'Challenge non trovata.' });

    // Controlla se l'utente ha già risolto questa challenge
    const alreadySolved = challenge.solvedBy.some((s) => s.user.equals(req.user._id));
    if (alreadySolved) {
      return res.status(400).json({ error: 'Hai già risolto questa challenge.' });
    }

    const isCorrect = sha256(flag) === challenge.flag;
    const pointsAwarded = isCorrect ? challenge.points : 0;

    // Registra la submission (la flag inviata viene hashata per l'audit)
    await Submission.create({
      user:          req.user._id,
      challenge:     challenge._id,
      warRoom:       warRoom || null,
      submittedFlag: sha256(flag),   // non salviamo plaintext neanche qui
      isCorrect,
      pointsAwarded,
      ipAddress:     req.ip,
    });

    if (isCorrect) {
      // Aggiunge utente alla lista solve della challenge
      challenge.solvedBy.push({ user: req.user._id });
      await challenge.save();

      // Carica utente per aggiornare streak e ruolo
      const utente = await User.findById(req.user._id);
      if (!utente) return res.status(404).json({ error: 'Utente non trovato.' });

      // Calcolo streak giornaliero
      const oggi       = new Date();
      const oggiStr    = oggi.toISOString().slice(0, 10);
      const ultimaStr  = utente.lastActivityDate
        ? new Date(utente.lastActivityDate).toISOString().slice(0, 10)
        : null;

      let nuovoStreak = utente.streak;
      if (ultimaStr === null || ultimaStr < oggiStr) {
        // Controlla se ieri era l'ultimo giorno attivo (streak continua) o no (reset)
        const ieri = new Date(oggi.getTime() - 86400000).toISOString().slice(0, 10);
        nuovoStreak = ultimaStr === ieri ? utente.streak + 1 : 1;
      }

      // Promozione automatica a Analyst a 500 punti (solo se ruolo attuale è Player o Guest)
      const nuoviPunti = utente.points + challenge.points;
      const promuovi   = nuoviPunti >= 500 && ['Player', 'Guest'].includes(utente.role);

      // Aggiorna tutto in una sola operazione
      utente.points += challenge.points;
      utente.solvedChallenges.addToSet(challenge._id);
      utente.streak           = nuovoStreak;
      utente.lastActivityDate = oggi;
      if (promuovi) utente.role = 'Analyst';
      await utente.save();

      // Notifica real-time a tutti i client connessi (CTFArena live feed)
      req.app.get('io')?.emit('flag:catturata', {
        username:  utente.username,
        challenge: challenge.title,
        category:  challenge.category,
        points:    challenge.points,
      });

      return res.json({
        correct:       true,
        points:        challenge.points,
        pointsAwarded: challenge.points,
        message:       'Flag corretta! Punti assegnati.',
        nuovoStreak,
        promosso:      promuovi ? 'Analyst' : null,
      });
    }

    res.json({ correct: false, pointsAwarded: 0, message: 'Flag errata.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/challenges/:id — aggiorna una challenge esistente (solo Admin)
const updateChallenge = async (req, res) => {
  try {
    const { title, description, category, difficulty, points, flag, hints, isActive } = req.body;
    const updates = {};
    if (title       !== undefined) updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (category    !== undefined) updates.category    = category;
    if (difficulty  !== undefined) updates.difficulty  = difficulty;
    if (points      !== undefined) updates.points      = Number(points);
    if (isActive    !== undefined) updates.isActive    = isActive;
    if (hints       !== undefined) updates.hints       = hints;
    if (flag)                      updates.flag        = sha256(flag);

    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge non trovata.' });
    res.json({ challenge });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/challenges/:id — elimina una challenge (solo Admin)
const deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndDelete(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Sfida non trovata.' });
    res.json({ message: 'Sfida eliminata.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// GET /api/challenges/:id/hint?index=0 — sblocca un suggerimento
const getHint = async (req, res) => {
  try {
    const index = parseInt(req.query.index);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'Parametro index mancante o non valido.' });
    }

    const challenge = await Challenge.findOne({ _id: req.params.id, isActive: true });
    if (!challenge) return res.status(404).json({ error: 'Challenge non trovata.' });

    const hint = challenge.hints[index];
    if (!hint) return res.status(404).json({ error: `Hint ${index} non esiste.` });

    // Controlla se l'utente ha abbastanza punti per sbloccarla
    const user = await User.findById(req.user._id);
    if (hint.cost > 0 && user.points < hint.cost) {
      return res.status(400).json({
        error: `Punti insufficienti. Necessari: ${hint.cost}, disponibili: ${user.points}.`,
      });
    }

    // Scala i punti solo se la hint ha un costo
    if (hint.cost > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { points: -hint.cost } });
    }

    res.json({ hint: hint.text, cost: hint.cost });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getChallenges, getChallengeById, createChallenge, updateChallenge, deleteChallenge, submitFlag, getHint };
