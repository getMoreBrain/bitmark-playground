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
// Only within the peer range's major (e.g. `>=7.7.0 <8`): a new major is a
// breaking change for hosts, so it needs a person, not a bot.
const pkgFile = path.join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
const below = Number(/<\s*(\d+)/.exec(pkg.peerDependencies['@gmb/bitmark-parser'])?.[1] ?? Infinity);
const versions = JSON.parse(
  execSync('npm view @gmb/bitmark-parser versions --json', { encoding: 'utf8' }),
).filter((v) => /^\d+\.\d+\.\d+$/.test(v) && Number(v.split('.')[0]) < below);
const npmLatest = execSync('npm view @gmb/bitmark-parser@latest version', { encoding: 'utf8' }).trim();
if (Number(npmLatest.split('.')[0]) >= below) {
  console.error(`@gmb/bitmark-parser ${npmLatest} is outside the peer range (<${below}): not bumped to it`);
}

const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
const latest = versions.reduce((best, v) => (newer(v, best) ? v : best), current);
if (!newer(latest, current)) process.exit(0);
console.log(latest);
if (process.argv.includes('--check')) process.exit(0);

writeFileSync(constantFile, source.replace(`DEFAULT_PARSER_VERSION = '${current}'`, `DEFAULT_PARSER_VERSION = '${latest}'`));
pkg.devDependencies['@gmb/bitmark-parser'] = `^${latest}`;
writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
