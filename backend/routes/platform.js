const express   = require('express');
const User      = require('../models/User');
const Challenge = require('../models/Challenge');
const WARRoom   = require('../models/WARRoom');

const router = express.Router();


router.get('/stats', async (req, res) => {
  try {
    const [utenti, sfide, warroom, top3] = await Promise.all([
      User.countDocuments(),
      Challenge.countDocuments({ isActive: true }),
      WARRoom.countDocuments({ status: 'active' }),
      
      User.find()
        .sort({ points: -1 })
        .limit(3)
        .select('username points'),
    ]);

    res.json({
      utenti,
      sfide,
      warroom,
      top3: top3.map(u => ({ _id: u._id, username: u.username, points: u.points })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
