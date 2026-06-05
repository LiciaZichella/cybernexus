const crypto  = require('crypto');
const WARRoom = require('../models/WARRoom');
const { inviaWebhook } = require('../services/webhook');

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
      .populate('challenges.challenge', 'title category difficulty points');

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
    const { name, description, isPrivate, maxMembers, challenges } = req.body;

    const roomData = {
      name,
      description,
      isPrivate: !!isPrivate,
      maxMembers,
      challenges,
      owner: req.user._id,
      // Il creatore entra automaticamente come Lead
      members: [{ user: req.user._id, role: 'Lead' }],
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

module.exports = { getWARRooms, getWARRoomById, createWARRoom, joinWARRoom, resolveWARRoom };
