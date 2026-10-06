// Build @gmb/bitmark-editor (PLAN-021 Step 11):
//   dist/esm/      the core, elements, React adapter and engine worker; no
//                  Monaco inside (the host injects it, PLAN-020 D8)
//   dist/types/    type declarations
//   dist/bundled/  the elements with their own Monaco (D4): a small loader,
//                  Monaco as monaco.js + monaco.css, the worker files
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const src = (p) => path.join(root, 'src', p);
const common = { bundle: true, logLevel: 'warning', legalComments: 'linked', sourcemap: true, target: 'es2022' };

rmSync(dist, { recursive: true, force: true });

// /esm: one bundle per entry, shared code in chunks; peers stay external.
await build({
  ...common,
  entryPoints: {
    index: src('index.ts'),
    'elements/index': src('elements/index.ts'),
    'react/index': src('react/index.tsx'),
    engineWorker: src('engine/worker/engineWorker.ts'),
  },
  outdir: path.join(dist, 'esm'),
  format: 'esm',
  splitting: true,
  chunkNames: 'chunks/[name]-[hash]',
  jsx: 'automatic',
  external: ['monaco-editor', 'monaco-editor/*', '@gmb/bitmark-parser', '@gmb/bitmark-parser/*', 'react', 'react/*', 'react-dom'],
});

// /bundled: the loader and Monaco as separate entries, so a lazy page loads
// Monaco only on its trigger (D12); the workers as classic scripts for the
// blob-URL trampoline; the engine worker as a module.
await build({
  ...common,
  minify: true,
  entryPoints: { bundled: src('bundled/index.ts'), monaco: src('bundled/monaco.ts') },
  outdir: path.join(dist, 'bundled'),
  format: 'esm',
  loader: { '.ttf': 'file' },
  assetNames: '[name]',
});
await build({
  ...common,
  minify: true,
  entryPoints: {
    'editor.worker': 'monaco-editor/editor/editor.worker',
    'json.worker': 'monaco-editor/language/json/json.worker',
  },
  outdir: path.join(dist, 'bundled'),
  format: 'iife',
});
await build({
  ...common,
  minify: true,
  entryPoints: { engineWorker: src('engine/worker/engineWorker.ts') },
  outdir: path.join(dist, 'bundled'),
  format: 'esm',
});

// Types (tests excluded).
execSync('npx tsc -p tsconfig.build.json', { cwd: root, stdio: 'inherit' });

// Sizes, for the README.
const report = (dir) => {
  for (const f of readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory() || f.endsWith('.map') || f.endsWith('.LEGAL.txt')) continue;
    const raw = statSync(p).size;
    const br = brotliCompressSync(execSync(`cat "${p}"`, { maxBuffer: 1 << 28 })).length;
    console.log(`${(raw / 1024).toFixed(0).padStart(7)} KB  ${(br / 1024).toFixed(0).padStart(6)} KB br  ${path.relative(dist, p)}`);
  }
};
report(path.join(dist, 'esm'));
report(path.join(dist, 'bundled'));
