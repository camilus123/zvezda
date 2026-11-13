// Optional tiny static server (the app also runs straight from index.html).
// Usage: node tools/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const port = +process.argv[2] || 8080;
http.createServer((req, res) => {
  const p = path.normalize(path.join(root, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
  const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end('not found'); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }).end(d); });
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
