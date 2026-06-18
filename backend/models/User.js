const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username obbligatorio'],
      unique: true,
      trim: true,
      minlength: [3, 'Username minimo 3 caratteri'],
      maxlength: [30, 'Username massimo 30 caratteri'],
    },

    email: {
      type: String,
      required: [true, 'Email obbligatoria'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato email non valido'],
    },

    passwordHash: {
      type: String,
      required: false,
      minlength: [8, 'Password minimo 8 caratteri'],
      select: false, // esclusa di default dalle query
    },

    oauthProvider: { type: String, default: null },
    oauthId:       { type: String, default: null, select: false },

    // Ruolo per controllo accessi
    role: {
      type: String,
      enum: ['Guest', 'Player', 'Analyst', 'Manager', 'Admin'],
      default: 'Player',
    },

    // Punteggio accumulato risolvendo le CTF challenge
    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Challenge risolte: riferimenti ai documenti Challenge
    solvedChallenges: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
      default: [],
    },

    // Avatar scelto dall'utente (URL o percorso relativo)
    avatar: {
      type: String,
      default: '',
    },

    // Biografia/presentazione del profilo
    bio: {
      type: String,
      maxlength: [300, 'Bio massimo 300 caratteri'],
      default: '',
    },

    // Giorni consecutivi di attività
    streak: {
      type: Number,
      default: 0,
    },

    // Data dell'ultima attività (per calcolo streak giornaliero)
    lastActivityDate: {
      type: Date,
      default: null,
    },

    // Numero di War Room completate come membro attivo (per badge War Hero)
    warRoomsCompleted: {
      type: Number,
      default: 0,
    },

    // Account sospeso dall'amministratore
    isBanned: {
      type: Boolean,
      default: false,
    },

    // Refresh token per rotazione JWT
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true, // aggiunge createdAt e updatedAt automaticamente
  }
);

// Hash della password prima del salvataggio (solo se presente e modificata)
UserSchema.pre('save', async function () {
  if (!this.passwordHash || !this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Metodo d'istanza: confronta password in chiaro con l'hash
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Metodo d'istanza: rappresentazione pubblica senza campi sensibili
UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    points: this.points,
    solvedChallenges: this.solvedChallenges,
    streak: this.streak,
    warRoomsCompleted: this.warRoomsCompleted,
    avatar: this.avatar,
    bio: this.bio,
    isBanned: this.isBanned,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
