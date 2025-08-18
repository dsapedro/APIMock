// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const Sntp = require('sntp'); // npm i sntp

const app = express();
app.use(express.json());

// === CORS + expor 'Date' e desativar cache (cliente precisa ver hora nova) ===
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Expose-Headers', 'Date');
  res.header('Cache-Control', 'no-store');
  // Sempre envia um Date (hora do host) — útil como fallback/inspeção:
  res.header('Date', new Date().toUTCString());
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// === “Banco” (arquivo JSON) ===
const DB_PATH = path.join(__dirname, 'db.json');
function loadDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { marcacoes: [] };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// === NTP via NTP.br com cache em memória ===
// Usamos servidores do pool.ntp.br (sincronizados à HLB - Observatório Nacional)
const NTP_SERVERS = [
  'a.st1.ntp.br',
  'b.st1.ntp.br',
  'c.st1.ntp.br',
  'pool.ntp.br'
];
// Cacheamos por ~30s para não estressar o NTP
let lastNtp = { epoch: null, iso: null, at: 0 };
const NTP_CACHE_MS = 30_000;

async function getHLBNowMs() {
  const now = Date.now();
  if (lastNtp.epoch && (now - lastNtp.at) < NTP_CACHE_MS) {
    return lastNtp.epoch + (now - lastNtp.at); // avança o relógio do cache
  }
  // Tenta servidores em ordem
  for (const host of NTP_SERVERS) {
    try {
      // Sntp.time retorna { t: epochMs, rtt, ... }
      const { t } = await Sntp.time({ host, port: 123, resolveReference: true, timeout: 2000 });
      lastNtp = { epoch: t, iso: new Date(t).toISOString(), at: Date.now() };
      return t;
    } catch (e) {
      // tenta o próximo
    }
  }
  // Fallback: relógio do host (pode não ser HLB, mas evita quebrar)
  return Date.now();
}

// Endpoint oficial de hora (HLB via NTP.br)
app.get('/time', async (req, res) => {
  try {
    const serverEpochMs = await getHLBNowMs();
    res.json({ serverIso: new Date(serverEpochMs).toISOString(), serverEpochMs });
  } catch (e) {
    // Fallback duro
    const t = Date.now();
    res.json({ serverIso: new Date(t).toISOString(), serverEpochMs: t });
  }
});

// === Marcações ===
app.get('/marcacoes', (req, res) => {
  const db = loadDB();
  res.json(db.marcacoes || []);
});

app.post('/marcacoes', async (req, res) => {
  const db = loadDB();
  const body = req.body || {};

  // Hora oficial do servidor (HLB) no momento do POST
  const serverEpochMs = await getHLBNowMs();

  const nova = {
    id: nanoid(4),
    ...body,
    // Normaliza carimbo de data/hora no servidor:
    data: new Date(serverEpochMs).toISOString(),
    hora: new Date(serverEpochMs).toLocaleTimeString('pt-BR', { hour12: false }),
  };

  db.marcacoes = db.marcacoes || [];
  db.marcacoes.push(nova);
  saveDB(db);
  res.status(201).json(nova);
});

// Healthcheck
app.get('/', (_req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`API on http://${HOST}:${PORT}`);
});
