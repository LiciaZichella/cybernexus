const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const WARRoom = require('../models/WARRoom');


const EVENTI_SCENARIO = {
  ransomware: [
    { minuto: 0,  messaggio: '🔴 Rilevata firma ransomware su server-prod-01',        tipo: 'critico' },
    { minuto: 3,  messaggio: '🟡 Hash identificato: 4a7b9f2c → LockBit 3.0',          tipo: 'warning' },
    { minuto: 7,  messaggio: '🔴 Secondo server compromesso: server-prod-03',          tipo: 'critico' },
    { minuto: 12, messaggio: "🟡 CVE-2024-3400 confermato come vettore d'ingresso",   tipo: 'warning' },
    { minuto: 18, messaggio: '🟢 IP C2 185.220.101.48 identificato',                  tipo: 'info' },
  ],
  data_breach: [
    { minuto: 0,  messaggio: '🔴 Traffico anomalo dal database clienti',              tipo: 'critico' },
    { minuto: 4,  messaggio: '🟡 Esfiltrazione dati in corso verso IP esterno',       tipo: 'warning' },
    { minuto: 9,  messaggio: '🔴 Credenziali admin compromesse',                      tipo: 'critico' },
    { minuto: 15, messaggio: '🟡 Volume dati esfiltrati: ~2.3GB',                    tipo: 'warning' },
  ],
  ddos: [
    { minuto: 0,  messaggio: '🔴 Flood di connessioni rilevato: 50k req/sec',        tipo: 'critico' },
    { minuto: 5,  messaggio: '🟡 Botnet identificata: 1200 IP sorgente',             tipo: 'warning' },
    { minuto: 10, messaggio: '🟢 Rate limiting attivato sul load balancer',          tipo: 'info' },
  ],
};


const normalizzaTipo = (tipo) => {
  if (!tipo) return 'ransomware';
  const t = tipo.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (t.includes('breach') || t.includes('data')) return 'data_breach';
  if (t.includes('ddos') || t.includes('dos'))    return 'ddos';
  return 'ransomware';
};


const timeoutScenario = new Map();


const autenticaSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token mancante.'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('username avatar role');
    if (!user) return next(new Error('Utente non trovato.'));

    
    socket.data.user = user;
    next();
  } catch {
    next(new Error('Token non valido o scaduto.'));
  }
};


const warroomSocket = (io) => {
  
  const warNS = io.of('/warroom');

  warNS.use(autenticaSocket);

  warNS.on('connection', (socket) => {
    const { user } = socket.data;
    console.log(`Socket connesso: ${user.username} (${socket.id})`);

    
    socket.on('join-room', async ({ roomId }, ack) => {
      try {
        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (room.status !== 'active') return ack?.({ error: 'La sala è chiusa.' });

        
        if (!room.hasMember(user._id)) {
          return ack?.({ error: 'Non sei membro di questa sala.' });
        }

        socket.join(roomId);
        socket.data.roomId = roomId;

        
        socket.to(roomId).emit('user-joined', {
          username: user.username,
          avatar:   user.avatar,
        });

        
        const stanza = warNS.adapter.rooms.get(roomId);
        if (stanza && stanza.size === 1 && !timeoutScenario.has(roomId)) {
          const chiave = normalizzaTipo(room.tipo || '');
          const eventi = EVENTI_SCENARIO[chiave] || EVENTI_SCENARIO.ransomware;
          const timers = eventi.map(({ minuto, messaggio, tipo }) =>
            setTimeout(() => {
              warNS.to(roomId).emit('log-event', {
                content:   messaggio,
                tipo,
                createdAt: new Date(),
                author:    null,
              });
            }, minuto * 60 * 1000)
          );
          timeoutScenario.set(roomId, timers);
        }

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    
    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { username: user.username });
    });

    
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

        
        const salvato = room.messages[room.messages.length - 1];

        const payload = {
          _id:       salvato._id,
          content:   salvato.content,
          type:      'text',
          createdAt: salvato.createdAt,
          author: { username: user.username, avatar: user.avatar },
        };

        
        warNS.to(roomId).emit('chat-message', payload);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    
    socket.on('step-completed', async ({ roomId, stepIndex }, ack) => {
      try {
        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (!room.hasMember(user._id)) return ack?.({ error: 'Accesso negato.' });

        warNS.to(roomId).emit('step-completed', {
          stepIndex,
          solvedBy:  user.username,
          solvedAt:  new Date(),
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    
    socket.on('log-event', async ({ roomId, content, tipo }, ack) => {
      try {
        if (!content?.trim()) return ack?.({ error: 'Contenuto evento vuoto.' });

        const room = await WARRoom.findById(roomId);
        if (!room) return ack?.({ error: 'War Room non trovata.' });
        if (!room.hasMember(user._id)) return ack?.({ error: 'Accesso negato.' });

        
        
        const testoDB = tipo === 'terminal'
          ? `[terminale] ${user.username} ha eseguito un comando`
          : content.trim();

        room.messages.push({
          author:  user._id,
          content: testoDB,
          type:    'system',
        });
        await room.save();

        warNS.to(roomId).emit('log-event', {
          content:   content.trim(),
          createdAt: new Date(),
          author:    user.username,
          tipo,
        });

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    
    socket.on('disconnect', () => {
      console.log(`Socket disconnesso: ${user.username} (${socket.id})`);
      if (socket.data.roomId) {
        socket.to(socket.data.roomId).emit('user-left', { username: user.username });

        
        const stanza = warNS.adapter.rooms.get(socket.data.roomId);
        if (!stanza || stanza.size === 0) {
          const timers = timeoutScenario.get(socket.data.roomId);
          if (timers) {
            timers.forEach(clearTimeout);
            timeoutScenario.delete(socket.data.roomId);
          }
        }
      }
    });
  });
};

module.exports = warroomSocket;
module.exports.timeoutScenario = timeoutScenario;
