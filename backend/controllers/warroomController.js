const crypto  = require('crypto');
const WARRoom = require('../models/WARRoom');
const User    = require('../models/User');
const { inviaWebhook } = require('../services/webhook');
const { timeoutScenario } = require('../sockets/warroom');

// Istanza Socket.IO iniettata da server.js dopo l'avvio
let io = null;
const setIo = (ioInstance) => { io = ioInstance; };

// Utility: genera un codice invito casuale di 8 caratteri
const generaInviteCode = () => crypto.randomBytes(4).toString('hex');

// GET /api/warroom — lista War Room (attive per utenti, tutte per Admin)
const getWARRooms = async (req, res) => {
  try {
    const isStaff = req.user.role === 'Admin';
    const filter  = isStaff ? {} : { status: 'active' };

    const rooms = await WARRoom.find(filter)
      .select('-messages -notes')     // escludi chat e lavagna dalla lista
      .populate('owner', 'username')
      .sort({ createdAt: -1 });

    res.json({ total: rooms.length, rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/warroom/:id — dettaglio completo di una War Room
const getWARRoomById = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id)
      .populate('owner', 'username avatar')
      .populate('members.user', 'username avatar')
      .populate('challenges.challenge', 'title category difficulty points')
      .populate('messages.author', 'username')
      .populate('tasks.assegnatoA', 'username');

    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });

    // Sala privata: solo membri e Admin possono vederla
    const isStaff  = req.user.role === 'Admin';
    const isMember = room.hasMember(req.user._id);
    if (room.isPrivate && !isMember && !isStaff) {
      return res.status(403).json({ error: 'Accesso negato: sala privata.' });
    }

    res.json({ room });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/warroom — crea War Room (solo Admin)
const createWARRoom = async (req, res) => {
  try {
    const { name, description, isPrivate, maxMembers, challenges, comandiTerminale, tasks, tipo } = req.body;

    const roomData = {
      name,
      description,
      isPrivate:     !!isPrivate,
      accessoLibero: req.body.accessoLibero !== false, // default true
      maxMembers,
      challenges,
      tipo:      tipo || 'Ransomware',
      owner:     req.user._id,
      // Il creatore entra automaticamente come Lead
      members:          [{ user: req.user._id, role: 'Lead' }],
      comandiTerminale: Array.isArray(comandiTerminale) ? comandiTerminale : [],
      tasks:            Array.isArray(tasks) ? tasks : [],
    };

    // Sala privata: genera codice invito univoco
    if (isPrivate) {
      roomData.inviteCode = generaInviteCode();
    }

    const room = await WARRoom.create(roomData);
    res.status(201).json({ room, inviteCode: room.inviteCode || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/warroom/:id/join — entra in una War Room
const joinWARRoom = async (req, res) => {
  try {
    // Ruolo minimo: Analyst per entrare come membro attivo
    const ruoliAmmessi = ['Analyst', 'Admin'];
    if (!ruoliAmmessi.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Devi essere almeno Analyst per entrare in una War Room. Risolvi sfide CTF per guadagnare 500 punti.',
      });
    }

    const room = await WARRoom.findById(req.params.id);
    if (!room)                return res.status(404).json({ error: 'War Room non trovata.' });
    if (room.status !== 'active') return res.status(400).json({ error: 'La sala non è attiva.' });
    if (room.isFull)          return res.status(400).json({ error: 'La sala è al completo.' });
    if (room.hasMember(req.user._id)) {
      return res.status(400).json({ error: 'Sei già membro di questa sala.' });
    }

    // Sala privata: richiede inviteCode nel body (il check ruolo è già stato fatto sopra)
    if (!room.accessoLibero || room.isPrivate) {
      if (!req.body.inviteCode || req.body.inviteCode !== room.inviteCode) {
        return res.status(403).json({ error: 'Codice invito non valido.' });
      }
    }

    room.members.push({ user: req.user._id, role: 'Member' });

    // Messaggio di sistema nella chat della sala
    room.messages.push({
      author:  req.user._id,
      content: `${req.user.username} è entrato nella sala.`,
      type:    'system',
    });

    await room.save();
    res.json({ message: 'Accesso alla sala confermato.', memberCount: room.memberCount });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/warroom/:id/resolve — chiude la sala e notifica via webhook
const resolveWARRoom = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id)
      .populate('owner',   'username')
      .populate('members.user', 'username');

    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });
    if (room.status === 'closed') {
      return res.status(400).json({ error: 'La sala è già chiusa.' });
    }

    // Solo owner o Admin possono risolvere la sala
    const isStaff  = req.user.role === 'Admin';
    const isOwner  = room.owner._id.equals(req.user._id);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Solo il proprietario o lo staff può chiudere la sala.' });
    }

    room.status = 'closed';
    await room.save();

    // Calcola punti reali prima di emettere l'evento
    const puntiBase = (room.passiCompletati?.length || 0) * 150;
    const durataMs  = Date.now() - new Date(room.createdAt).getTime();
    const durataMin = Math.floor(durataMs / 60000);
    const bonus     = durataMin < 30 ? 350 : durataMin < 60 ? 150 : 0;
    const puntiTotali = puntiBase + bonus;

    // Notifica tutti i client nella sala che l'incidente è risolto
    if (io) {
      io.of('/warroom').to(req.params.id).emit('room-resolved', {
        roomId:          req.params.id,
        resolvedBy:      req.user.username,
        resolvedAt:      new Date(),
        puntiTotali,
        passiCompletati: room.passiCompletati?.length || 0,
        durataMin,
      });
    }

    // Cancella i timer degli eventi automatici scenario
    const timers = timeoutScenario.get(req.params.id);
    if (timers) {
      timers.forEach(clearTimeout);
      timeoutScenario.delete(req.params.id);
    }

    // Assegna punti e incrementa warRoomsCompleted a tutti i membri
    await Promise.all(
      room.members.map(m => User.findByIdAndUpdate(m.user, {
        $inc: {
          warRoomsCompleted: 1,
          ...(puntiBase > 0 ? { points: puntiTotali } : {}),
        },
      }))
    );

    // Payload del webhook con il riepilogo della sessione
    const webhookPayload = {
      event:      'warroom.resolved',
      resolvedAt: new Date().toISOString(),
      room: {
        id:              room._id,
        name:            room.name,
        owner:           room.owner.username,
        memberCount:     room.memberCount,
        members:         room.members.map((m) => m.user.username),
        challenges:      room.challenges.map((c) => ({
          id:     c.challenge,
          status: c.status,
        })),
        durataMin:       durataMin,
        puntiTotali:     puntiTotali,
        passiCompletati: room.passiCompletati?.length || 0,
      },
    };

    // Fire-and-forget: la risposta non aspetta il webhook
    inviaWebhook(webhookPayload);

    res.json({ message: 'War Room chiusa con successo.', room: webhookPayload.room });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// Utility: controlla che l'utente sia membro o Admin
const isMembroOStaff = (room, userId, userRole) => {
  if (userRole === 'Admin') return true;
  const membro = room.members.find(m => {
    const mId = (m.user?._id ?? m.user)?.toString() ?? '';
    return mId === userId.toString();
  });
  return !!membro;
};

// PATCH /api/warroom/:id/task/:taskId — aggiorna stato di un task Kanban
const patchTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { stato } = req.body;
    const statiValidi = ['todo', 'in_corso', 'in_review', 'fatto'];
    if (!statiValidi.includes(stato)) {
      return res.status(400).json({ error: 'Stato non valido.' });
    }

    const room = await WARRoom.findById(id);
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });

    if (!isMembroOStaff(room, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Devi essere membro della sala per aggiornare i task.' });
    }

    const task = room.tasks.id(taskId);
    if (!task) return res.status(404).json({ error: 'Task non trovato.' });

    task.stato = stato;
    await room.save();

    // Notifica in real-time tutti i client nella stanza
    if (io) {
      io.of('/warroom').to(id).emit('task:update', {
        taskId,
        nuovoStato:   stato,
        aggiornatoDa: req.user.username,
      });
    }

    res.json({ task });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};


// GET /api/warroom/:id/report — riepilogo dati reali per il PDF
const getReport = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id)
      .populate('members.user', 'username');
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });

    if (!isMembroOStaff(room, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Devi essere membro della sala per scaricare il report.' });
    }

    // Calcola durata in formato leggibile
    let durata = '—';
    if (room.createdAt) {
      const fine = room.status === 'closed' ? (room.updatedAt || new Date()) : new Date();
      const ms = fine - room.createdAt;
      const ore = Math.floor(ms / 3600000);
      const min = Math.floor((ms % 3600000) / 60000);
      durata = ore > 0 ? `${ore}h ${min}min` : `${min}min`;
    }

    const taskCompletati = room.tasks.filter(t => t.stato === 'fatto').length;
    const membriCoinvolti = room.members.map(m => ({
      username: m.user?.username || '—',
      ruolo:    m.role,
    }));
    const eventiLog = room.messages.filter(m => m.type === 'system').length;

    res.json({
      nome:            room.name,
      tipo:            room.tipo || 'Ransomware',
      durata,
      taskCompletati,
      taskTotali:      room.tasks.length,
      membriCoinvolti,
      eventiLog,
      esito:           room.status === 'closed' ? 'contenuto' : 'non risolto',
      generatoIl:      new Date(),
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/warroom/draft — salva bozza War Room (solo Admin)
const saveDraft = async (req, res) => {
  try {
    const { name, description, isPrivate, maxMembers, challenges, comandiTerminale, tasks, tipo, accessoLibero } = req.body;
    const room = await WARRoom.create({
      name,
      description,
      isPrivate:     !!isPrivate,
      accessoLibero: accessoLibero !== false,
      maxMembers:    maxMembers || 10,
      challenges:    challenges || [],
      tipo:          tipo || 'Ransomware',
      owner:         req.user._id,
      members:       [],  // bozza: nessun membro attivo
      comandiTerminale: Array.isArray(comandiTerminale) ? comandiTerminale : [],
      tasks:            Array.isArray(tasks) ? tasks : [],
      status:        'draft',
    });
    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/warroom/:id/status — cambia stato (es. draft → active)
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Stato non valido.' });
    }
    const room = await WARRoom.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/warroom/:id/step — segna un passo playbook come completato
const markStep = async (req, res) => {
  try {
    const { stepIndex } = req.body;
    if (typeof stepIndex !== 'number' || stepIndex < 0) {
      return res.status(400).json({ error: 'stepIndex non valido.' });
    }
    const room = await WARRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });

    if (!isMembroOStaff(room, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Devi essere membro della sala per segnare i passi.' });
    }

    // Aggiungi solo se non già presente
    if (!room.passiCompletati.includes(stepIndex)) {
      room.passiCompletati.push(stepIndex);
      await room.save();
    }

    res.json({ passiCompletati: room.passiCompletati });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/warroom/:id — elimina una War Room (solo Admin)
const deleteWARRoom = async (req, res) => {
  try {
    const room = await WARRoom.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });
    res.json({ message: 'War Room eliminata.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getWARRooms, getWARRoomById, createWARRoom, saveDraft, updateStatus,
  joinWARRoom, resolveWARRoom, patchTask, getReport,
  markStep, deleteWARRoom, setIo,
};
