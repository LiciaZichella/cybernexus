const mongoose = require('mongoose');

const HintSchema = new mongoose.Schema({
  text: { type: String, required: true },
  cost: { type: Number, default: 0, min: 0 }, 
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

    
    flag: {
      type: String,
      required: [true, 'Flag obbligatoria'],
      select: false,
    },

    
    hints: [HintSchema],

    
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    
    tags: [{ type: String, trim: true, lowercase: true }],

    
    solvedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        solvedAt: { type: Date, default: Date.now },
      },
    ],

    
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    
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


ChallengeSchema.virtual('solveCount').get(function () {
  return (this.solvedBy ?? []).length;
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
