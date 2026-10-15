// Local test server: node dev-server.js  (uses in-memory sqlite, password "test")
process.env.LOCAL_DB = process.env.LOCAL_DB || '1';
process.env.OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'test';
const http = require('http'), fs = require('fs'), path = require('path');
const api = require('./api/index.js');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.png': 'image/png' };
http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    let b = ''; req.on('data', (c) => (b += c));
    req.on('end', () => { try { req.body = b ? JSON.parse(b) : {}; } catch { req.body = {}; } api(req, res); });
    return;
  }
  let p = req.url.split('?')[0];
  if (p === '/owner' || p.startsWith('/r/') || p === '/') p = '/index.html';
  const f = path.join(__dirname, 'public', p);
  if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('nf'); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('dev on', process.env.PORT || 3000));
