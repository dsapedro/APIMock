// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());

// === CORS + expor 'Date' (essencial pro ClockService) ===
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Expose-Headers', 'Date');
  res.header('Cache-Control', 'no-store');
  // Garantir Date (a maioria dos servidores já envia, mas garantimos)
  res.header('Date', new Date().toUTCString());
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// === Caminho do "banco" (arquivo JSON) ===
const DB_PATH = path.join(__dirname, 'db.json');

// Carrega banco (ou cria default)
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { marcacoes: [] };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// === Endpoints ===
app.get('/marcacoes', (req, res) => {
  const db = loadDB();
  res.json(db.marcacoes || []);
});

app.post('/marcacoes', (req, res) => {
  const db = loadDB();
  const body = req.body || {};
  const nova = {
    id: nanoid(4),
    ...body
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
