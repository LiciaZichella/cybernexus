const User = require('../models/User');


const getLeaderboard = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const pipeline = [ //mongo elabora i dati con una sequenza di fasi, direttamente nel database
      
      {
        $group: {
          _id:               '$_id',
          username:          { $first: '$username' },
          avatar:            { $first: '$avatar' },
          points:            { $first: '$points' },
          role:              { $first: '$role' },
          streak:            { $first: '$streak' },
          warRoomsCompleted: { $first: '$warRoomsCompleted' },
          
          solvedCount: {
            $sum: { $size: { $ifNull: ['$solvedChallenges', []] } },
          },
        },
      },

      
      { $sort: { points: -1, username: 1 } }, //se uguaglianza ordine alfabetico

      
      {
        $facet: { //contemporaneamente piu sotto-pipeline paralleli sugli stessi dati 
          metadata: [{ $count: 'total' }],
          classifica: [
            { $skip: skip },
            { $limit: limit },
            
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

    const [result] = await User.aggregate(pipeline); //il risultato darebbe metadata e classifica 

    const total = result.metadata[0]?.total ?? 0; //tot utenti

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
