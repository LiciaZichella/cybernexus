const crypto  = require('crypto');
const WARRoom = require('../models/WARRoom');
const { inviaWebhook } = require('../services/webhook');

// Istanza Socket.IO iniettata da server.js dopo l'avvio
let io = null;
const setIo = (ioInstance) => { io = ioInstance; };

// Utility: genera un codice invito casuale di 8 caratteri
const generaInviteCode = () => crypto.randomBytes(4).toString('hex');

// GET /api/warroom — lista War Room (attive per utenti, tutte per Admin/Manager)
const getWARRooms = async (req, res) => {
  try {
    const isStaff = ['Admin', 'Manager'].includes(req.user.role);
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

    // Sala privata: solo membri e staff possono vederla
    const isStaff  = ['Admin', 'Manager'].includes(req.user.role);
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

// POST /api/warroom — crea War Room (solo Admin o Manager)
const createWARRoom = async (req, res) => {
  try {
    const { name, description, isPrivate, maxMembers, challenges, comandiTerminale, tasks, tipo } = req.body;

    const roomData = {
      name,
      description,
      isPrivate: !!isPrivate,
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
    console.error('Errore createWARRoom:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/warroom/:id/join — entra in una War Room
const joinWARRoom = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id);
    if (!room)                return res.status(404).json({ error: 'War Room non trovata.' });
    if (room.status !== 'active') return res.status(400).json({ error: 'La sala è chiusa.' });
    if (room.isFull)          return res.status(400).json({ error: 'La sala è al completo.' });
    if (room.hasMember(req.user._id)) {
      return res.status(400).json({ error: 'Sei già membro di questa sala.' });
    }

    // Sala privata: richiede inviteCode nel body
    if (room.isPrivate) {
      if (!req.body.inviteCode || req.body.inviteCode !== room.inviteCode) {
        return res.status(403).json({ error: 'Codice invito errato o mancante.' });
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

    // Solo owner, Admin o Manager possono risolvere la sala
    const isStaff  = ['Admin', 'Manager'].includes(req.user.role);
    const isOwner  = room.owner._id.equals(req.user._id);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Solo il proprietario o lo staff può chiudere la sala.' });
    }

    room.status = 'closed';
    await room.save();

    // Payload del webhook con il riepilogo della sessione
    const webhookPayload = {
      event:     'warroom.resolved',
      resolvedAt: new Date().toISOString(),
      room: {
        id:          room._id,
        name:        room.name,
        owner:       room.owner.username,
        memberCount: room.memberCount,
        members:     room.members.map((m) => m.user.username),
        challenges:  room.challenges.map((c) => ({
          id:     c.challenge,
          status: c.status,
        })),
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

// POST /api/warroom/:id/observe — entra come Observer (non conta nei maxMembers)
const joinAsObserver = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });
    if (room.status !== 'active') return res.status(400).json({ error: 'La sala è chiusa.' });

    // Se già membro (in qualsiasi ruolo) non duplica
    if (room.hasMember(req.user._id)) {
      return res.json({ message: 'Già nella sala.' });
    }

    room.members.push({ user: req.user._id, role: 'Observer' });
    room.messages.push({
      author:  req.user._id,
      content: `${req.user.username} sta osservando la sessione.`,
      type:    'system',
    });
    await room.save();

    res.json({ message: 'Accesso come Observer confermato.' });
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
  getWARRooms, getWARRoomById, createWARRoom, joinWARRoom, resolveWARRoom,
  patchTask, joinAsObserver, getReport, deleteWARRoom, setIo,
};
