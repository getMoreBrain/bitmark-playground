// PLAN-020 Phase 0: build the `/bundled` prototype into bundled/dist.
import { build } from 'esbuild';
import { statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(here, 'dist');
const common = { bundle: true, minify: true, logLevel: 'warning', legalComments: 'none' };

// The main entry: ESM, CSS extracted beside it, the codicon font as a file.
await build({
  ...common,
  entryPoints: { bundled: path.join(here, 'entry.ts') },
  outdir,
  format: 'esm',
  loader: { '.ttf': 'file' },
  assetNames: '[name]',
});

// The workers: classic scripts, so a blob worker can importScripts() them.
await build({
  ...common,
  entryPoints: {
    'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
    'json.worker': 'monaco-editor/esm/vs/language/json/json.worker.js',
  },
  outdir,
  format: 'iife',
});

for (const f of readdirSync(outdir)) {
  console.log(`${(statSync(path.join(outdir, f)).size / 1024).toFixed(0).padStart(6)} KB  ${f}`);
}

// The `/esm` prototype: the core alone, no Monaco inside (D8).
await build({
  ...common,
  minify: false,
  entryPoints: { 'esm/core': path.join(here, '../proto/core.ts') },
  outdir,
  format: 'esm',
});
console.log(`${(statSync(path.join(outdir, 'esm/core.js')).size / 1024).toFixed(0).padStart(6)} KB  esm/core.js`);
