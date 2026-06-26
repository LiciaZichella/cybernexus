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
      select: false, 
    },

    oauthProvider: { type: String, default: null },
    oauthId:       { type: String, default: null, select: false },

    
    role: {
      type: String,
      enum: ['Guest', 'Player', 'Analyst', 'Admin'],
      default: 'Player',
    },

    
    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    
    solvedChallenges: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
      default: [],
    },

    
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

    
    warRoomsCompleted: {
      type: Number,
      default: 0,
    },

    
    isBanned: {
      type: Boolean,
      default: false,
    },

    
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true, // aggiunge automaticamente createdAt e updateAt
  }
);


UserSchema.pre('save', async function () { //funzione normale perchè devo usare this
  if (!this.passwordHash || !this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});


UserSchema.methods.comparePassword = async function (plainPassword) { //si devono sempre confrontare hashate
  return bcrypt.compare(plainPassword, this.passwordHash);
};


UserSchema.methods.toPublicJSON = function () { //versione sicura dell'utente da inviare al frontend, senza passwordHash, tocken, oauthId
  return { //uso this quindi function normale
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
}; //lo usano getMe, login, register...

module.exports = mongoose.model('User', UserSchema);
