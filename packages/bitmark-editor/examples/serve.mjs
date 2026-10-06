// Two origins, so the package and the parser are cross-origin as on jsDelivr
// (PLAN-020 D12):
//   http://localhost:4611  the host site (static/, and angular/dist when built)
//   http://localhost:4612  the "CDN": /pkg/ → the package's dist, /parser/ → the parser package
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
// The parser package root: its main entry is dist/index.cjs (it exports no ./package.json).
const parser = path.resolve(path.dirname(createRequire(path.join(pkg, 'package.json')).resolve('@gmb/bitmark-parser')), '..');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

const serve = (port, routes, headers) =>
  createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const route = Object.keys(routes).find((r) => url.startsWith(r));
    let file = route && path.join(routes[route], url.slice(route.length) || 'index.html');
    if (file && existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file || !file.startsWith(routes[route]) || !existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', ...headers });
    createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`http://localhost:${port}`));

serve(
  4611,
  {
    '/angular/': path.join(here, 'angular/dist/browser/'),
    // A host bundler's copy of bundled.js alone (relocated.html).
    '/relocated/': path.join(pkg, 'dist/bundled/'),
    '/': path.join(here, 'static/'),
  },
  { 'Cache-Control': 'no-store' },
);
serve(
  4612,
  { '/pkg/': path.join(pkg, 'dist/'), '/parser/': `${parser}/` },
  { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=31536000, immutable' },
);
