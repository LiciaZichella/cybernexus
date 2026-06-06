const mongoose = require('mongoose');

// Schema task per la Kanban board
const TaskSchema = new mongoose.Schema(
  {
    titolo:      { type: String, required: true, trim: true },
    descrizione: { type: String, default: '' },
    stato:       { type: String, enum: ['todo', 'in_corso', 'in_review', 'fatto'], default: 'todo' },
    assegnatoA:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creatoIl:    { type: Date, default: Date.now },
  },
  { _id: true }
);

// Singolo messaggio della chat di sala
const MessageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: [2000, 'Messaggio massimo 2000 caratteri'] },
    type: { type: String, enum: ['text', 'system', 'flag_attempt'], default: 'text' },
  },
  { timestamps: true }
);

// Nota condivisa fissata nella lavagna della sala
const NoteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: [5000, 'Nota massimo 5000 caratteri'] },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const WARRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome sala obbligatorio'],
      trim: true,
      maxlength: [80, 'Nome massimo 80 caratteri'],
    },

    description: {
      type: String,
      maxlength: [500, 'Descrizione massimo 500 caratteri'],
      default: '',
    },

    // Creatore della sala
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Membri con ruolo interno alla sala (Observer = sola lettura, non conta in maxMembers)
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['Lead', 'Member', 'Observer'], default: 'Member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    // Challenge su cui la sala sta lavorando
    challenges: [
      {
        challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
        status: { type: String, enum: ['in_progress', 'solved', 'abandoned'], default: 'in_progress' },
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        solvedAt: { type: Date },
      },
    ],

    // Chat interna della sala
    messages: [MessageSchema],

    // Lavagna condivisa con note e appunti
    notes: [NoteSchema],

    // Codice invito per accesso diretto alla sala privata
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // null ammesso senza violare unique
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    // Tipo di scenario — usato per selezionare gli eventi automatici nel socket
    tipo: {
      type: String,
      enum: ['Ransomware', 'DDoS', 'Phishing', 'Data Breach', 'Supply Chain', 'Zero-Day'],
      default: 'Ransomware',
    },

    // Stato operativo della sala
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },

    maxMembers: {
      type: Number,
      default: 10,
      min: [2, 'Minimo 2 membri'],
      max: [50, 'Massimo 50 membri'],
    },

    // Task Kanban board
    tasks: [TaskSchema],

    // Comandi terminale personalizzati per questo scenario
    comandiTerminale: [
      {
        comando:  { type: String, required: true, trim: true },
        risposta: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: numero corrente di membri
WARRoomSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// Virtual: sala piena o no (gli Observer non contano nel limite)
WARRoomSchema.virtual('isFull').get(function () {
  const membriAttivi = this.members.filter(m => m.role !== 'Observer').length;
  return membriAttivi >= this.maxMembers;
});

// Metodo d'istanza: verifica se un utente è già membro
WARRoomSchema.methods.hasMember = function (userId) {
  return this.members.some((m) => m.user.equals(userId));
};

module.exports = mongoose.model('WARRoom', WARRoomSchema);
