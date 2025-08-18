// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());

// ===== CORS + expor 'Date' (essencial para o ClockService) =====
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
  // Garante que sempre haja um Date coerente
  res.header('Date', new Date().toUTCString());

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.header('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.sendStatus(204);
});

// ===== Caminho do "banco" (arquivo JSON) =====
const DB_PATH = path.join(__dirname, 'db.json');

// Carrega banco (ou cria default)
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_e) {
    return { marcacoes: [] };
  }
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Falha ao salvar db.json:', e);
  }
}

// ===== Endpoints =====

// Hora do servidor (para sincronizar relógio no frontend)
app.get('/time', (_req, res) => {
  const now = new Date();
  // reforça headers também na rota
  res.header('Access-Control-Expose-Headers', 'Date');
  res.header('Cache-Control', 'no-store');
  res.header('Date', now.toUTCString());

  res.json({
    serverIso: now.toISOString(),
    serverEpochMs: now.getTime()
  });
});

// Lista marcações
app.get('/marcacoes', (_req, res) => {
  const db = loadDB();
  res.json(db.marcacoes || []);
});

// Cria marcação (usa hora do servidor)
app.post('/marcacoes', (req, res) => {
  const db = loadDB();
  const body = req.body || {};

  const serverNowIso = new Date().toISOString();

  const nova = {
    id: nanoid(6),
    usuario: body.usuario ?? 'Desconhecido',
    tipo: body.tipo ?? 'entrada',
    data: serverNowIso,               // horário oficial do servidor
    origem: body.origem ?? 'online',
    // campos opcionais enviados pelo cliente
    lat: body.lat,
    lng: body.lng,
    accuracyMeters: body.accuracyMeters,
    timeZone: body.timeZone,
    agrupadorId: body.agrupadorId
  };

  db.marcacoes = db.marcacoes || [];
  db.marcacoes.push(nova);
  saveDB(db);
  res.status(201).json(nova);
});

// Healthcheck simples
app.get('/', (_req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`API on http://${HOST}:${PORT}`);
});
