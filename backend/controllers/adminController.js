const User       = require('../models/User');
const Submission = require('../models/Submission');
const Challenge  = require('../models/Challenge');
const WARRoom    = require('../models/WARRoom');


const getStats = async (req, res) => {
  try {
    const setteGiorniFa = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalUtenti, totalFlag, totalSfide, warRoomAttive, aggReg] = await Promise.all([
      User.countDocuments(),
      Submission.countDocuments({ isCorrect: true }),
      Challenge.countDocuments(),
      WARRoom.countDocuments({ status: 'active' }),
      
      User.aggregate([
        { $match: { createdAt: { $gte: setteGiorniFa } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            n:   { $sum: 1 },
          },
        },
      ]),
    ]);

    
    const oggi = new Date();
    const regUltimi7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(oggi.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const chiave = d.toISOString().slice(0, 10);
      return aggReg.find(r => r._id === chiave)?.n ?? 0;
    });

    res.json({ totalUtenti, totalFlag, totalSfide, warRoomAttive, regUltimi7 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getActivity = async (req, res) => {
  try {
    const [submissions, warrooms, nuoviUtenti] = await Promise.all([
      Submission.find({ isCorrect: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'username')
        .populate('challenge', 'title')
        .lean(),
      WARRoom.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const eventi = [];

    submissions.forEach(s => {
      eventi.push({
        tipo:   'flag',
        ico:    '🚩',
        bg:     'var(--v1)',
        testo:  s.user?.username ?? '—',
        azione: `ha catturato la flag di "${s.challenge?.title ?? '—'}"`,
        quando: s.createdAt,
        extra:  s.pointsAwarded > 0 ? `+${s.pointsAwarded} pts` : null,
      });
    });

    warrooms.forEach(w => {
      eventi.push({
        tipo:   'warroom',
        ico:    '🚨',
        bg:     'rgba(240,112,96,.1)',
        testo:  null,
        azione: `War Room aperta: "${w.name}" — ${w.tipo}`,
        quando: w.createdAt,
        extra:  null,
      });
    });

    nuoviUtenti.forEach(u => {
      eventi.push({
        tipo:   'utente',
        ico:    '👤',
        bg:     'var(--v1)',
        testo:  null,
        azione: `Nuovo utente registrato: ${u.username}`,
        quando: u.createdAt,
        extra:  null,
      });
    });

    eventi.sort((a, b) => new Date(b.quando) - new Date(a.quando));

    res.json({ eventi: eventi.slice(0, 15) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getStats, getActivity };
