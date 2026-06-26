'use strict';

const https = require('https');
const http  = require('http');


//per ora abbiamo usato un webhook.site ma si può ampliare a endpoint come Discord, Slack...
const inviaWebhook = (payload) => {
  const url = process.env.WEBHOOK_URL;
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
        res.resume(); 
      }
    );

    req.on('error', (err) => console.error(`[webhook] errore: ${err.message}`)); //listner: se fallisce la richiesta logga l'errore( fire and forget)
    req.write(body); //scrive corpo
    req.end();
  } catch (err) {
    console.error(`[webhook] URL non valido: ${err.message}`);
  }
};

module.exports = { inviaWebhook };
