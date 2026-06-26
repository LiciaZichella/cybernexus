const crypto  = require('crypto');
const WARRoom = require('../models/WARRoom');
const User    = require('../models/User');
const { inviaWebhook } = require('../services/webhook');
const { timeoutScenario } = require('../sockets/warroom');


let io = null; //server.js inietta l'istanza Socket.IO dentro setIo
const setIo = (ioInstance) => { io = ioInstance; };


const generaInviteCode = () => crypto.randomBytes(4).toString('hex'); //casuale e imprevedibile


const getWARRooms = async (req, res) => {
  try {
    const isStaff = req.user.role === 'Admin';
    const filter  = isStaff ? {} : { status: 'active' };

    const rooms = await WARRoom.find(filter) //filtro cambia in base a chi chiede
      .select('-messages -notes')     
      .populate('owner', 'username')
      .sort({ createdAt: -1 });

    res.json({ total: rooms.length, rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getWARRoomById = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id)
      .populate('owner', 'username avatar')
      .populate('members.user', 'username avatar')
      .populate('challenges.challenge', 'title category difficulty points')
      .populate('messages.author', 'username')
      .populate('tasks.assegnatoA', 'username');

    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });

    
    const isStaff  = req.user.role === 'Admin'; //se la sala è privata e non sei ne mebro ne Admin allora 403
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


const createWARRoom = async (req, res) => { //solo Admin
  try {
    const { name, description, isPrivate, maxMembers, challenges, comandiTerminale, tasks, tipo } = req.body;

    const roomData = {
      name,
      description,
      isPrivate:     !!isPrivate,
      accessoLibero: req.body.accessoLibero !== false, 
      maxMembers,
      challenges,
      tipo:      tipo || 'Ransomware',
      owner:     req.user._id,
      
      members:          [{ user: req.user._id, role: 'Lead' }],
      comandiTerminale: Array.isArray(comandiTerminale) ? comandiTerminale : [],
      tasks:            Array.isArray(tasks) ? tasks : [],
    };

    
    if (isPrivate) {
      roomData.inviteCode = generaInviteCode();
    }

    const room = await WARRoom.create(roomData);
    res.status(201).json({ room, inviteCode: room.inviteCode || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const joinWARRoom = async (req, res) => {
  try {
    
    const ruoliAmmessi = ['Analyst', 'Admin']; //accesso solo a ruoli consentiti
    if (!ruoliAmmessi.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Devi essere almeno Analyst per entrare in una War Room. Risolvi sfide CTF per guadagnare 500 punti.',
      });
    }

    const room = await WARRoom.findById(req.params.id); //serie di controlli
    if (!room)                return res.status(404).json({ error: 'War Room non trovata.' });
    if (room.status !== 'active') return res.status(400).json({ error: 'La sala non è attiva.' });
    if (room.isFull)          return res.status(400).json({ error: 'La sala è al completo.' });
    if (room.hasMember(req.user._id)) {
      return res.status(400).json({ error: 'Sei già membro di questa sala.' });
    }

    
    if (!room.accessoLibero || room.isPrivate) {
      if (!req.body.inviteCode || req.body.inviteCode !== room.inviteCode) {
        return res.status(403).json({ error: 'Codice invito non valido.' });
      }
    }

    room.members.push({ user: req.user._id, role: 'Member' });

    
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


const resolveWARRoom = async (req, res) => { //valida, calcola punti, chiude, emette evento, assegna punti, manda webhook
  try {
    const room = await WARRoom.findById(req.params.id)
      .populate('owner',   'username')
      .populate('members.user', 'username');

    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });
    if (room.status === 'closed') {
      return res.status(400).json({ error: 'La sala è già chiusa.' });
    }

    
    const isStaff  = req.user.role === 'Admin';
    const isOwner  = room.owner._id.equals(req.user._id);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Solo il proprietario o lo staff può chiudere la sala.' });
    }

    room.status = 'closed'; //solo owner o un admin chiude
    await room.save();

    
    const puntiBase = (room.passiCompletati?.length || 0) * 150;
    const durataMs  = Date.now() - new Date(room.createdAt).getTime();
    const durataMin = Math.floor(durataMs / 60000);
    const bonus     = durataMin < 30 ? 350 : durataMin < 60 ? 150 : 0;
    const puntiTotali = puntiBase + bonus;

    
    if (io) { //emissione evento real-time: sala chiusa 
      io.of('/warroom').to(req.params.id).emit('room-resolved', {
        roomId:          req.params.id,
        resolvedBy:      req.user.username,
        resolvedAt:      new Date(),
        puntiTotali,
        passiCompletati: room.passiCompletati?.length || 0,
        durataMin,
      });
    }

    
    const timers = timeoutScenario.get(req.params.id);
    if (timers) {
      timers.forEach(clearTimeout);
      timeoutScenario.delete(req.params.id);
    }

    
    await Promise.all(
      room.members.map(m => User.findByIdAndUpdate(m.user, {
        $inc: {
          warRoomsCompleted: 1,
          ...(puntiBase > 0 ? { points: puntiTotali } : {}), //assegna punti solo se la sala ha avuto progressi; altrimenti incrementa solo il contatore
        },
      }))
    );

    
    const webhookPayload = { //collegamento a sevices/webhook.js
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

    
    inviaWebhook(webhookPayload);

    res.json({ message: 'War Room chiusa con successo.', room: webhookPayload.room });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'ID non valido.' });
    res.status(500).json({ error: err.message });
  }
};


const isMembroOStaff = (room, userId, userRole) => {
  if (userRole === 'Admin') return true;
  const membro = room.members.find(m => {
    const mId = (m.user?._id ?? m.user)?.toString() ?? ''; //id mancante deiventa stringa vuota e userId trasformato in stringa per === corretta
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



const getReport = async (req, res) => {
  try {
    const room = await WARRoom.findById(req.params.id)
      .populate('members.user', 'username');
    if (!room) return res.status(404).json({ error: 'War Room non trovata.' });

    if (!isMembroOStaff(room, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Devi essere membro della sala per scaricare il report.' });
    }

    
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
    const eventiLog = room.messages.filter(m => m.type === 'system').length; //filter: conta quanti soddisfano una condizione

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
      members:       [],  
      comandiTerminale: Array.isArray(comandiTerminale) ? comandiTerminale : [],
      tasks:            Array.isArray(tasks) ? tasks : [],
      status:        'draft',
    });
    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


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
