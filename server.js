// server.js
const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const defaults = jsonServer.defaults({
  static: false // evita tentar servir 'public/'
});

// CORS + expor cabeçalhos + garantir 'Date'
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Expose-Headers', 'Date');
  // a maioria dos servers já enviam 'Date', mas garantimos:
  res.header('Date', new Date().toUTCString());
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

server.use(defaults);
server.use(router);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Mock API running on http://${HOST}:${PORT}`);
});
