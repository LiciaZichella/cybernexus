const User = require('../models/User');

// GET /api/leaderboard — classifica globale con aggregation pipeline
const getLeaderboard = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const pipeline = [
      // Raggruppa ogni utente su se stesso calcolando solvedCount dall'array
      {
        $group: {
          _id:               '$_id',
          username:          { $first: '$username' },
          avatar:            { $first: '$avatar' },
          points:            { $first: '$points' },
          role:              { $first: '$role' },
          streak:            { $first: '$streak' },
          warRoomsCompleted: { $first: '$warRoomsCompleted' },
          // $ifNull gestisce utenti con array non ancora inizializzato
          solvedCount: {
            $sum: { $size: { $ifNull: ['$solvedChallenges', []] } },
          },
        },
      },

      // Ordina per punti decrescenti; a parità ordine alfabetico username
      { $sort: { points: -1, username: 1 } },

      // $facet esegue in parallelo conteggio totale e slice paginata
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          classifica: [
            { $skip: skip },
            { $limit: limit },
            // Rinomina _id in id per coerenza con il resto delle API
            {
              $project: {
                _id:        0,
                id:                '$_id',
                username:          1,
                avatar:            1,
                points:            1,
                role:              1,
                streak:            1,
                warRoomsCompleted: 1,
                solvedCount:       1,
              },
            },
          ],
        },
      },
    ];

    const [result] = await User.aggregate(pipeline);

    const total = result.metadata[0]?.total ?? 0;

    res.json({
      total,
      page,
      pages:      Math.ceil(total / limit),
      classifica: result.classifica,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getLeaderboard };
