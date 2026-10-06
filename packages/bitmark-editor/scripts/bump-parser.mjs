// Bump the pinned default parser version (PLAN-020 D13) to the latest
// @gmb/bitmark-parser on npm: the DEFAULT_PARSER_VERSION constant and the
// dev dependency. Prints the new version, or nothing when already current.
// `--check` only reports. Run by .github/workflows/bitmark-editor-parser-bump.yml.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const constantFile = path.join(root, 'src/engine/loadBitmarkEngine.ts');
const source = readFileSync(constantFile, 'utf8');
const current = source.match(/DEFAULT_PARSER_VERSION = '(\d+\.\d+\.\d+)'/)?.[1];
if (!current) throw new Error('DEFAULT_PARSER_VERSION not found');
const latest = execSync('npm view @gmb/bitmark-parser@latest version', { encoding: 'utf8' }).trim();

const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
if (!newer(latest, current)) process.exit(0);
console.log(latest);
if (process.argv.includes('--check')) process.exit(0);

writeFileSync(constantFile, source.replace(`DEFAULT_PARSER_VERSION = '${current}'`, `DEFAULT_PARSER_VERSION = '${latest}'`));
const pkgFile = path.join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
pkg.devDependencies['@gmb/bitmark-parser'] = `^${latest}`;
writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
