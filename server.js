// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());

// ===== CORS + expor 'Date' =====
const ALLOWED_HEADERS = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'Cache-Control',
  'Pragma'
].join(', ');

const ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.header('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.header('Access-Control-Expose-Headers', 'Date');
  res.header('Cache-Control', 'no-store');
  res.header('Date', new Date().toUTCString());
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.options('*', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.header('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.sendStatus(204);
});

// ===== DB =====
const DB_PATH = path.join(__dirname, 'db.json');
function loadDB() { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return { marcacoes: [] }; } }
function saveDB(db) { try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch (e) { console.error('save db.json:', e); } }

// ===== Horário =====
// Aceita marcação offline até 12h distante do horário atual do servidor
const MAX_ACCEPTED_SKEW_MS = 12 * 60 * 60 * 1000; // 12h

function chooseOfficialEpochMs(approxServerMs) {
  const now = Date.now();
  if (typeof approxServerMs === 'number' && Number.isFinite(approxServerMs)) {
    if (Math.abs(approxServerMs - now) <= MAX_ACCEPTED_SKEW_MS) {
      return Math.round(approxServerMs); // mantém a hora enviada
    }
  }
  return now; // fora da janela -> usa agora (política simples para MVP)
}

// ===== Endpoints =====
app.get('/time', (_req, res) => {
  const now = new Date();
  res.header('Access-Control-Expose-Headers', 'Date');
  res.header('Cache-Control', 'no-store');
  res.header('Date', now.toUTCString());
  res.json({ serverIso: now.toISOString(), serverEpochMs: now.getTime() });
});

app.get('/marcacoes', (_req, res) => {
  const db = loadDB();
  res.header('Cache-Control', 'no-store');
  res.json(db.marcacoes || []);
});

app.post('/marcacoes', (req, res) => {
  const db = loadDB();
  const body = req.body || {};

  const officialEpochMs = chooseOfficialEpochMs(body.approxServerMs);
  const serverNowIso = new Date(officialEpochMs).toISOString();

  const nova = {
    id: nanoid(6),
    usuario: body.usuario ?? 'Desconhecido',
    tipo: body.tipo ?? 'entrada',
    data: serverNowIso,
    origem: body.origem ?? 'online',

    // localização/opcionais
    lat: body.lat,
    lng: body.lng,
    accuracyMeters: body.accuracyMeters,
    timeZone: body.timeZone,
    agrupadorId: body.agrupadorId,

    // upsert/identificação offline
    clientId: body.clientId || null,
    deviceWallIso: body.deviceWallIso || null,

    // auditoria (NÃO exibida ao usuário final)
    offlineConfidence: body.offlineConfidence || null,     // 'perf' | 'offset'
    suspectClockSkew: !!body.suspectClockSkew,
    skewMs: (typeof body.skewMs === 'number' ? Math.round(body.skewMs) : null),
    deviceUtcOffsetMin: (typeof body.deviceUtcOffsetMin === 'number' ? body.deviceUtcOffsetMin : null),
    networkAtMark: body.networkAtMark || null,

    // ecoa a base usada pelo servidor (útil p/ debug)
    approxServerMs: (typeof body.approxServerMs === 'number' ? Math.round(body.approxServerMs) : null)
  };

  db.marcacoes = db.marcacoes || [];
  db.marcacoes.push(nova);
  saveDB(db);

  res.header('Cache-Control', 'no-store');
  res.status(201).json(nova);
});

app.get('/', (_req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`API on http://${HOST}:${PORT}`));
