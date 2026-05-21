const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
    },

    // Contesto: invio individuale o da una War Room
    warRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WARRoom',
      default: null,
    },

    // Flag inviata — non esposta di default
    submittedFlag: {
      type: String,
      required: true,
      select: false,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },

    // Punti assegnati (0 se errata o già risolta in precedenza)
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },

    // IP del client, utile per audit e anti-bruteforce
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt = timestamp dell'invio
  }
);

// Indice composto: evita query lente su (user, challenge) e supporta
// il controllo "questo utente ha già risolto questa challenge"
SubmissionSchema.index({ user: 1, challenge: 1 });

// Indice per recuperare rapidamente tutte le submission di una challenge
SubmissionSchema.index({ challenge: 1, isCorrect: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
