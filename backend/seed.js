require('dotenv').config();

const crypto    = require('crypto');
const mongoose  = require('mongoose');
const User      = require('./models/User');
const Challenge = require('./models/Challenge');


const sha256 = (str) => crypto.createHash('sha256').update(str.trim()).digest('hex');


const utenti = [
  {
    username:     'admin',
    email:        'admin@cybernexus.com',
    passwordHash: 'Admin123!',
    role:         'Admin',
  },
  {
    username:     'hacker01',
    email:        'hacker01@example.com',
    passwordHash: 'Player123!',
    role:         'Player',
  },
  {
    username:     'ctf_player',
    email:        'ctfplayer@example.com',
    passwordHash: 'Player123!',
    role:         'Player',
  },
  {
    username:     'ghost_byte',
    email:        'ghostbyte@example.com',
    passwordHash: 'Player123!',
    role:         'Player',
  },
];


const challengeData = [
  {
    title:       'Cookie Monster',
    description: 'Il sito memorizza qualcosa di interessante nei cookie. Trovala.',
    category:    'Web',
    difficulty:  'Easy',
    points:      100,
    flag:        'FLAG{c00k1e_m0nst3r_found}',
    hints: [
      { text: 'Apri gli strumenti sviluppatore e guarda la scheda Application.', cost: 0 },
      { text: 'Cerca un cookie con un nome insolito.', cost: 10 },
    ],
    tags: ['cookies', 'web', 'recon'],
  },
  {
    title:       'Caesar Cipher',
    description: 'Il messaggio cifrato è: "plevkzex{ebldl_pVcW3e_3hzh}". Decriptalo.',
    category:    'Crypto',
    difficulty:  'Medium',
    points:      250,
    flag:        'FLAG{julius_cAeS3r_easy}',
    hints: [
      { text: 'Giulio Cesare usava uno shift fisso sulle lettere.', cost: 0 },
      { text: 'Prova uno shift di 12.', cost: 25 },
    ],
    tags: ['caesar', 'cipher', 'classical-crypto'],
  },
  {
    title:       'Memory Dump',
    description: 'Ti è stato fornito un dump di memoria. Trova la stringa nascosta al suo interno.',
    category:    'Forensics',
    difficulty:  'Hard',
    points:      400,
    flag:        'FLAG{m3m0ry_dump_4n4lys1s}',
    hints: [
      { text: 'Usa strings per estrarre le stringhe leggibili dal dump.', cost: 0 },
      { text: "Filtra l'output cercando il prefisso cybernexus{.", cost: 40 },
    ],
    tags: ['forensics', 'memory', 'strings'],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connesso a MongoDB.');

    
    await User.deleteMany({});
    await Challenge.deleteMany({});
    console.log('Collezioni User e Challenge azzerate.');

    
    const utentiCreati = await User.create(utenti);
    console.log(`${utentiCreati.length} utenti inseriti:`);
    utentiCreati.forEach((u) => console.log(`  - ${u.role.padEnd(7)} ${u.username} (${u.email})`));

    
    const admin = utentiCreati[0];

    
    const challenges = challengeData.map((c) => ({
      ...c,
      flag:     sha256(c.flag),
      isActive: true,
      author:   admin._id,
    }));

    const challengeCreate = await Challenge.create(challenges);
    console.log(`${challengeCreate.length} challenge inserite:`);
    challengeCreate.forEach((c) =>
      console.log(`  - [${c.category.padEnd(9)}] [${c.difficulty.padEnd(6)}] ${c.title} (${c.points} pt)`)
    );

    console.log('\nSeed completato con successo.');
  } catch (err) {
    console.error(`Errore durante il seed: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
