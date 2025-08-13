// server.js
const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const defaults = jsonServer.defaults();

server.use((req, res, next) => {
  // CORS básico
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);

  // 🔑 Expor o header Date para o browser (essencial pro ClockService)
  res.header('Access-Control-Expose-Headers', 'Date');

  // Garantia extra (a maioria dos servers já manda Date automaticamente)
  res.header('Date', new Date().toUTCString());

  next();
});

server.use(defaults);
server.use(router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Mock API on http://localhost:' + PORT));
