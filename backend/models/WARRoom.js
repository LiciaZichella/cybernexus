const mongoose = require('mongoose');


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


const MessageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: [2000, 'Messaggio massimo 2000 caratteri'] },
    type: { type: String, enum: ['text', 'system', 'flag_attempt'], default: 'text' },
  },
  { timestamps: true }
);


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

    
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['Lead', 'Member'], default: 'Member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    
    challenges: [
      {
        challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
        status: { type: String, enum: ['in_progress', 'solved', 'abandoned'], default: 'in_progress' },
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        solvedAt: { type: Date },
      },
    ],

    
    messages: [MessageSchema],

    
    notes: [NoteSchema],

    
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, //vincolo unicità solo ai documenti che hanno il campo
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    
    tipo: {
      type: String,
      enum: ['Ransomware', 'DDoS', 'Phishing', 'Data Breach', 'Supply Chain', 'Zero-Day'],
      default: 'Ransomware',
    },

    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },

    durataMinuti: {
      type: Number,
      default: 90,
      min: [10, 'Durata minima 10 minuti'],
      max: [480, 'Durata massima 480 minuti'],
    },

    
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'active',
    },

    
    accessoLibero: {
      type: Boolean,
      default: true,
    },

    
    passiCompletati: {
      type: [Number],
      default: [],
    },

    maxMembers: {
      type: Number,
      default: 10,
      min: [2, 'Minimo 2 membri'],
      max: [50, 'Massimo 50 membri'],
    },

    
    tasks: [TaskSchema],

    
    comandiTerminale: [
      {
        comando:  { type: String, required: true, trim: true },
        risposta: { type: String, required: true },
      },
    ],

    
    playbook: [
      {
        step:        { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        guida:       { type: String, default: '' },
        obiettivi:   [{ type: String }],
      },
    ],

    // IOC (Indicators of Compromise) specifici per questo scenario (opzionale)
    iocs: [
      {
        tipo:   { type: String, required: true },
        valore: { type: String, required: true },
        stato:  { type: String, default: '⚠ Attivo' },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);


WARRoomSchema.virtual('memberCount').get(function () {
  return this.members.length; //quanti membri
});


WARRoomSchema.virtual('isFull').get(function () { //la sala è piena?
  return this.members.length >= this.maxMembers;
});


WARRoomSchema.methods.hasMember = function (userId) { //questo utente è membro della sala?
  return this.members.some((m) => m.user.equals(userId)); //se almeno un elemento soddisfa la codizione true
};

module.exports = mongoose.model('WARRoom', WARRoomSchema);
