const mongoose = require('mongoose');

const HintSchema = new mongoose.Schema({
  text: { type: String, required: true },
  cost: { type: Number, default: 0, min: 0 }, // punti sottratti per sbloccarla
});

const ChallengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Titolo obbligatorio'],
      unique: true,
      trim: true,
      maxlength: [100, 'Titolo massimo 100 caratteri'],
    },

    description: {
      type: String,
      required: [true, 'Descrizione obbligatoria'],
    },

    // Categoria tecnica della challenge
    category: {
      type: String,
      required: [true, 'Categoria obbligatoria'],
      enum: ['Web', 'Crypto', 'Forensics', 'Pwn', 'Reverse', 'OSINT', 'Misc'],
    },

    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Insane'],
      required: [true, 'Difficoltà obbligatoria'],
    },

    points: {
      type: Number,
      required: [true, 'Punteggio obbligatorio'],
      min: [1, 'Il punteggio deve essere almeno 1'],
    },

    // Flag corretta — esclusa di default dalle query
    flag: {
      type: String,
      required: [true, 'Flag obbligatoria'],
      select: false,
    },

    // Suggerimenti opzionali con costo in punti
    hints: [HintSchema],

    // File allegati (URL o percorso relativo)
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    // Tag liberi (es. 'sql-injection', 'jwt', 'buffer-overflow')
    tags: [{ type: String, trim: true, lowercase: true }],

    // Utenti che hanno risolto la challenge
    solvedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        solvedAt: { type: Date, default: Date.now },
      },
    ],

    // Autore/creatore della challenge
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Visibile agli utenti o ancora in draft
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: numero totale di solve
ChallengeSchema.virtual('solveCount').get(function () {
  return this.solvedBy.length;
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
