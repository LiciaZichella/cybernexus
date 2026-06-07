'use strict';

const https = require('https');
const http  = require('http');

/**
 * Invia un webhook POST in fire-and-forget.
 * Gli errori sono solo loggati — non bloccano il flusso chiamante.
 *
 * @param {object} payload  Oggetto che verrà serializzato come JSON nel body
 */
const inviaWebhook = (payload) => {
  const url = process.env.WEBHOOK_URL;
  console.log('[webhook] WEBHOOK_URL:', url || 'NON CONFIGURATO');
  if (!url) return;

  try {
    const body      = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    const lib       = parsedUrl.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: parsedUrl.hostname,
        port:     parsedUrl.port || undefined,
        path:     parsedUrl.pathname + parsedUrl.search,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume(); // consuma la risposta per liberare il socket
        console.log(`[webhook] inviato — status: ${res.statusCode}`);
      }
    );

    req.on('error', (err) => console.error(`[webhook] errore: ${err.message}`));
    req.write(body);
    req.end();
  } catch (err) {
    console.error(`[webhook] URL non valido: ${err.message}`);
  }
};

module.exports = { inviaWebhook };
