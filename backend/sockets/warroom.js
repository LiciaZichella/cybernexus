const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const WARRoom = require('../models/WARRoom');

// Middleware Socket.IO: verifica JWT nell'handshake prima di accettare la connessione
const autenticaSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token mancante.'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('username avatar role');
    if (!user) return next(new Error('Utente non trovato.'));

    // Attacca i dati utente al socket per usarli negli handler
    socket.data.user = user;
    next();
  } catch {
    next(new Error('Token non valido o scaduto.'));
  }
};

// Handler principale — riceve l'istanza io e registra tutti gli eventi
const warroomSocket = (io) => {
  // Namespace dedicato alle War Room
  const warNS = io.of('/warroom');

  warNS.use(autenticaSocket);

  warNS.on('connection', (socket) => {
    const { user } = socket.data;
    console.log(`Socket connesso: ${user.username} (${socket.id})`);

    // join-room — entra nella stanza Socket.IO corrispondente alla War Room
    socket.on('join-room', async ({ roomId }, ack) => {
      try {
        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (room.status !== 'active') return ack?.({ error: 'La sala è chiusa.' });

        // Verifica che l'utente sia membro registrato della War Room
        if (!room.hasMember(user._id)) {
          return ack?.({ error: 'Non sei membro di questa sala.' });
        }

        socket.join(roomId);
        socket.data.roomId = roomId;

        // Notifica gli altri membri dell'ingresso
        socket.to(roomId).emit('user-joined', {
          username: user.username,
          avatar:   user.avatar,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // leave-room — lascia la stanza corrente
    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { username: user.username });
    });

    // chat-message — salva nel DB e fa broadcast a tutta la stanza
    socket.on('chat-message', async ({ roomId, content }, ack) => {
      try {
        if (!content?.trim()) return ack?.({ error: 'Messaggio vuoto.' });

        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (!room.hasMember(user._id)) return ack?.({ error: 'Accesso negato.' });

        const nuovoMessaggio = {
          author:  user._id,
          content: content.trim(),
          type:    'text',
        };
        room.messages.push(nuovoMessaggio);
        await room.save();

        // Recupera il documento appena inserito (ha _id e timestamps)
        const salvato = room.messages[room.messages.length - 1];

        const payload = {
          _id:       salvato._id,
          content:   salvato.content,
          type:      'text',
          createdAt: salvato.createdAt,
          author: { username: user.username, avatar: user.avatar },
        };

        // Invia a tutti nella stanza, mittente incluso
        warNS.to(roomId).emit('chat-message', payload);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // step-completed — aggiorna lo status di una challenge nella War Room
    socket.on('step-completed', async ({ roomId, challengeId }, ack) => {
      try {
        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (!room.hasMember(user._id)) return ack?.({ error: 'Accesso negato.' });

        const entry = room.challenges.find((c) => c.challenge.equals(challengeId));
        if (!entry) return ack?.({ error: 'Challenge non presente in questa sala.' });

        entry.status    = 'solved';
        entry.solvedAt  = new Date();

        // Messaggio di sistema automatico nella chat
        room.messages.push({
          author:  user._id,
          content: `${user.username} ha completato uno step.`,
          type:    'system',
        });

        await room.save();

        warNS.to(roomId).emit('step-completed', {
          challengeId,
          solvedBy:  user.username,
          solvedAt:  entry.solvedAt,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // log-event — registra un evento di sistema nella chat della stanza
    socket.on('log-event', async ({ roomId, content }, ack) => {
      try {
        if (!content?.trim()) return ack?.({ error: 'Contenuto evento vuoto.' });

        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (!room.hasMember(user._id)) return ack?.({ error: 'Accesso negato.' });

        room.messages.push({
          author:  user._id,
          content: content.trim(),
          type:    'system',
        });
        await room.save();

        warNS.to(roomId).emit('log-event', {
          content:   content.trim(),
          createdAt: new Date(),
          author:    user.username,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // room-resolved — notifica tutti i membri che la sala è stata risolta
    // Tipicamente chiamato dal controller warroom dopo aver chiuso la sala
    socket.on('room-resolved', async ({ roomId }, ack) => {
      try {
        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });

        // Solo owner, Admin o Manager possono emettere questo evento
        const isStaff = ['Admin', 'Manager'].includes(user.role);
        const isOwner = room.owner.equals(user._id);
        if (!isOwner && !isStaff) return ack?.({ error: 'Permesso negato.' });

        warNS.to(roomId).emit('room-resolved', {
          roomId,
          resolvedBy: user.username,
          resolvedAt: new Date(),
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    // Pulizia alla disconnessione
    socket.on('disconnect', () => {
      console.log(`Socket disconnesso: ${user.username} (${socket.id})`);
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('user-left', { username: user.username });
      }
    });
  });
};

module.exports = warroomSocket;
