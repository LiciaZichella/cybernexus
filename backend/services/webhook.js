'use strict';

const https = require('https');
const http  = require('http');



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

    req.on('error', (err) => console.error(`[webhook] errore: ${err.message}`));
    req.write(body);
    req.end();
  } catch (err) {
    console.error(`[webhook] URL non valido: ${err.message}`);
  }
};

module.exports = { inviaWebhook };
