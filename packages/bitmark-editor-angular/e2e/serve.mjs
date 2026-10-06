// Serve the example's production build (`ng build example`) on :4621.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/example/browser');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.ttf': 'font/ttf' };
createServer((req, res) => {
  let file = path.join(root, decodeURIComponent((req.url ?? '/').split('?')[0]));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(4621, () => console.log('http://localhost:4621'));
