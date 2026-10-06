// Bundle esm/entry.js as a host bundler would, and check the result: it
// resolves through "exports", carries no Monaco, and keeps the peers external.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [path.join(here, 'entry.js')],
  bundle: true,
  format: 'esm',
  write: false,
  metafile: true,
  platform: 'browser',
  external: ['monaco-editor', 'monaco-editor/*', 'react', 'react/*', '@gmb/bitmark-parser', '@gmb/bitmark-parser/*'],
  logLevel: 'error',
});
// Input paths are relative to the working directory; compare absolute ones.
const inputs = Object.keys(result.metafile.inputs).map((i) => path.resolve(i));
const fromDist = inputs.filter((i) => i.includes(`${path.sep}bitmark-editor${path.sep}dist${path.sep}esm${path.sep}`));
const monaco = inputs.filter((i) => i.includes('monaco-editor'));
const bytes = result.outputFiles[0].contents.length;
console.log(JSON.stringify({ fromDist: fromDist.length, monaco: monaco.length, kb: Math.round(bytes / 1024) }));
if (fromDist.length === 0 || monaco.length > 0) process.exit(1);
