// PLAN-022 Phase 0: two origins, so the "CDN" is cross-origin as jsDelivr is.
//   http://localhost:4601  the host site: static/ pages, and Monaco 0.46 AMD at /monaco046/
//   http://localhost:4602  the "CDN": bundled/dist at /editor/, the parser at /parser/
// The CDN sends `Access-Control-Allow-Origin: *` and immutable caching, as
// jsDelivr does for an exact version.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const serve = (port, routes, headers) =>
  createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const route = Object.keys(routes).find((r) => url.startsWith(r));
    const file = route && path.join(routes[route], url.slice(route.length) || 'index.html');
    if (!file || !file.startsWith(routes[route]) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      ...headers,
    });
    createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`http://localhost:${port}`));

serve(
  4601,
  {
    '/monaco046/': path.join(here, 'node_modules/monaco-046/min/'),
    '/': path.join(here, 'static/'),
  },
  { 'Cache-Control': 'no-store' },
);
serve(
  4602,
  {
    '/editor/': path.join(here, 'bundled/dist/'),
    '/parser/': path.join(here, 'node_modules/@gmb/bitmark-parser/'),
  },
  { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=31536000, immutable' },
);
// The Angular spike's production build (`ng build`).
serve(4603, { '/': path.join(here, 'angular/dist/angular/browser/') }, { 'Cache-Control': 'no-store' });
