const User       = require('../models/User');
const Submission = require('../models/Submission');


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const updateMe = async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;

    
    const updates = {};
    if (username !== undefined) updates.username = username.trim();
    if (bio      !== undefined) updates.bio      = bio.trim();
    if (avatar   !== undefined) updates.avatar   = avatar.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare fornito.' });
    }

    
    if (updates.username) {
      const taken = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } }); //utente con quell'username ma id diverso
      if (taken) return res.status(409).json({ error: 'Username già in uso.' });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,            
      runValidators: true,  
    });

    res.json({ user: updated.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });

    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};


const getAllUsers = async (req, res) => { //solo Admin
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [users, total] = await Promise.all([ //find + count in parallelo
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


const changeUserRole = async (req, res) => { //solo Admin
  try {
    const RUOLI_VALIDI = ['Guest', 'Player', 'Analyst', 'Admin'];
    const { role } = req.body;

    
    if (!role || !RUOLI_VALIDI.includes(role)) {
      return res.status(400).json({
        error: `Ruolo non valido. Valori ammessi: ${RUOLI_VALIDI.join(', ')}.`,
      });
    }

    
    if (req.params.id === req.user._id.toString()) { //admin non può auto-declassarsi e perdere i permessi
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
    
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};


const getMeActivity = async (req, res) => { //heatmap 60 giorni
  try {
    const sessantaGiorniFa = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const submissions = await Submission.find({
      user:      req.user._id,
      isCorrect: true,
      createdAt: { $gte: sessantaGiorniFa }, //data maggiore o uguale a 60 giorni fa
    }).select('createdAt').lean();

    
    const contaPerGiorno = {};
    submissions.forEach(s => {
      const giorno = new Date(s.createdAt).toISOString().slice(0, 10);
      contaPerGiorno[giorno] = (contaPerGiorno[giorno] || 0) + 1;
    });

    
    const oggi = new Date();
    const attivita = Array.from({ length: 60 }, (_, i) => { //sequenza di giorni
      const data   = new Date(oggi.getTime() - (59 - i) * 24 * 60 * 60 * 1000);
      const chiave = data.toISOString().slice(0, 10);
      return { date: chiave, count: contaPerGiorno[chiave] || 0 };
    });

    res.json({ activity: attivita });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getMeSubmissions = async (req, res) => { //storico flag risolte
  try {
    const submissions = await Submission.find({
      user:      req.user._id,
      isCorrect: true,
    })
      .select('createdAt pointsAwarded challenge')
      .sort({ createdAt: -1 })
      .populate('challenge', 'title category')
      .lean();

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getMeAttempts = async (req, res) => { //quali sfide tentate
  try {
    const submissions = await Submission.find({ user: req.user._id })
      .select('challenge isCorrect')
      .lean();

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const banUser = async (req, res) => { //solo admin
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({ error: 'Non puoi bannare il tuo account.' });
    }

    const { ban } = req.body; 
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: !!ban },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};


const exportUsersCSV = async (req, res) => { //csv utenti , solo admin
  try {
    const users = await User.find().sort({ points: -1 }).lean();

    
    const SEP = ';'; //ecxel in italiano usa il punto e virgola
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`; //con le virgolette il CSV si romperebbe, raddoppio quelle interne

    
    const formattaData = (d) => {
      const dt = new Date(d);
      const gg = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const aaaa = dt.getFullYear();
      const hh = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      return `${gg}/${mm}/${aaaa} ${hh}:${mi}`;
    };

    const righe = [['Username', 'Email', 'Ruolo', 'Punti', 'Data Registrazione'].join(SEP)];
    users.forEach(u => {
      righe.push([
        esc(u.username),
        esc(u.email),
        esc(u.role),
        u.points ?? 0,
        esc(formattaData(u.createdAt)),
      ].join(SEP));
    });

    
    const oggi = new Date();
    const dataFile = `${String(oggi.getDate()).padStart(2, '0')}${String(oggi.getMonth() + 1).padStart(2, '0')}${oggi.getFullYear()}`;
    const nomeFile = `cybernexus_utenti_${dataFile}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeFile}"`);
    
    res.send('﻿' + righe.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getUserActivity = async (req, res) => { //come getMyActivity ma per un id qualsiasi e distribuzione per categoria
  try {
    const userId = req.params.id;
    const sessantaGiorniFa = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    
    const submissionsHeatmap = await Submission.find({
      user:      userId,
      isCorrect: true,
      createdAt: { $gte: sessantaGiorniFa },
    }).select('createdAt').lean();

    
    const contaPerGiorno = {};
    submissionsHeatmap.forEach(s => {
      const giorno = new Date(s.createdAt).toISOString().slice(0, 10);
      contaPerGiorno[giorno] = (contaPerGiorno[giorno] || 0) + 1;
    });

    
    const oggi = new Date();
    const activity = Array.from({ length: 60 }, (_, i) => {
      const data   = new Date(oggi.getTime() - (59 - i) * 24 * 60 * 60 * 1000);
      const chiave = data.toISOString().slice(0, 10);
      return { date: chiave, count: contaPerGiorno[chiave] || 0 };
    });

    
    const Challenge = require('../models/Challenge');
    const submissionsCategorie = await Submission.find({
      user:      userId,
      isCorrect: true,
    }).populate('challenge', 'category').lean();

    
    const conteCategorie = {};
    submissionsCategorie.forEach(s => {
      const cat = s.challenge?.category;
      if (cat) conteCategorie[cat] = (conteCategorie[cat] || 0) + 1;
    });

    
    const totale = Object.values(conteCategorie).reduce((a, b) => a + b, 0);
    const categorie = Object.entries(conteCategorie).map(([nome, count]) => ({
      nome,
      count,
      pct: totale > 0 ? Math.round((count / totale) * 100) : 0,
    }));

    res.json({ activity, categorie });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
}; //deve restituire heatmap e categorie, dati reali per i grafici a barre e ciambella

module.exports = { getMe, updateMe, getUserById, getAllUsers, changeUserRole, getMeActivity, getMeSubmissions, getMeAttempts, exportUsersCSV, getUserActivity, banUser };
