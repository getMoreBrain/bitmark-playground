# PLAN-001: Switch from Yarn to Bun

STATUS: completed
WORKFLOW: lateral
TRACES: ARCHITECTURE.md (Build Layer)

## Goal

Replace Yarn 3 with Bun as the package manager, script runner, and development runtime across the entire project.

## Scope

All yarn-related configuration, lockfiles, scripts, CI workflows, documentation, and .gitignore rules.

## Inventory of Yarn Artifacts

| # | File / Path | Yarn Reference | Action |
|---|-------------|----------------|--------|
| 1 | `package.json` — `scripts.start` | `run generate-build-info` (yarn `run`) | Replace with `bun run generate-build-info` |
| 2 | `package.json` — `scripts.build` | `run generate-build-info` (yarn `run`) | Replace with `bun run generate-build-info` |
| 3 | `package.json` — `scripts.ncu` | `yarn dlx npm-check-updates -i` | Replace with `bunx npm-check-updates -i` |
| 4 | `package.json` — `packageManager` | `yarn@3.5.0` | Remove field entirely |
| 5 | `package.json` — `engines.yarn` | `>=3.5.0` | Remove yarn from engines |
| 6 | `.yarnrc.yml` | Full yarn 3 config (nodeLinker, npmScopes, yarnPath) | Delete file |
| 7 | `.yarnrc` | `yarn-path: scripts/yarn1-warn.js` | Delete file |
| 8 | `.yarn/releases/yarn-3.5.0.cjs` | Bundled yarn binary | Delete directory `.yarn/` |
| 9 | `scripts/yarn1-warn.js` | Yarn 1 upgrade warning script | Delete file (replaced by `preinstall` script with `only-allow`) |
| 10 | `yarn.lock` | Yarn lockfile | Delete (replaced by `bun.lockb`) |
| 11 | `.gitignore` | Yarn-specific ignore rules (lines 15–27) | Replace with bun-specific rules |
| 12 | `.github/workflows/build-and-deploy-to-github-pages.yml` | `cache: 'yarn'`, `yarn install --immutable`, `yarn build` | Switch to bun setup and bun commands |
| 13 | `README.md` | `yarn start`, `yarn test`, `yarn build`, `yarn eject` references | Replace with `bun` equivalents |
| 14 | `.mise.toml` | Only has `node = '24'` | Add `bun` tool entry |

## Steps

### Step 1: Install bun lockfile

- Run `bun install` to generate `bun.lockb` from existing `package.json`
- Verify all dependencies resolve correctly
- Verify `node_modules/` is populated

### Step 2: Update package.json

- `scripts.preinstall`: `npx only-allow bun` — enforces bun usage; errors if npm/yarn/pnpm is used
- `scripts.start`: `PORT=3010 && bun run generate-build-info && react-app-rewired start`
- `scripts.build`: `bun run generate-build-info && react-app-rewired build`
- `scripts.ncu`: `bunx npm-check-updates -i`
- Remove `packageManager` field
- Remove `engines.yarn` entry
- Add `only-allow` to `devDependencies`

### Step 3: Delete yarn artifacts

- Delete `.yarnrc.yml`
- Delete `.yarnrc`
- Delete `.yarn/` directory (contains `releases/yarn-3.5.0.cjs`)
- Delete `scripts/yarn1-warn.js`
- Delete `yarn.lock`

### Step 4: Update .gitignore

Replace the YARN section (lines 15–27) with:

```gitignore
# BUN
bun.lockb
```

Note: `bun.lockb` is binary; some teams commit it, some ignore it. Decision: commit it for reproducible builds (remove `.gitignore` entry). If not desired, keep the ignore entry.

### Step 5: Update CI workflow

Update `.github/workflows/build-and-deploy-to-github-pages.yml`:

- Replace `actions/setup-node@v4` with `oven-sh/setup-bun@v2` (keep node setup for CRA runtime)
- Change `cache: 'yarn'` → remove (bun handles its own cache)
- Change `yarn install --immutable` → `bun install --frozen-lockfile`
- Change `yarn build` → `bun run build`

### Step 6: Update .mise.toml

Add bun tool:

```toml
[tools]
node = '24'
bun = 'latest'
```

### Step 7: Update README.md

Replace all `yarn` command references with `bun` equivalents:

- `yarn start` → `bun start`
- `yarn test` → `bun test`
- `yarn build` → `bun run build`
- `yarn eject` → `bun run eject`

### Step 8: Verify

- Run `bun start` — dev server starts on port 3010
- Run `bun run build` — production build completes
- Run `bun test` — tests pass
- Confirm no remaining `yarn` references: `grep -r "yarn" --include="*.json" --include="*.yml" --include="*.md" --include="*.js" --include="*.ts" .`

## Risks

| Risk | Mitigation |
|------|------------|
| CRA / react-app-rewired incompatibility with bun | Bun runs node-compatible scripts; CRA should work. Fall back to `bun run` prefix if needed. |
| GitHub Actions `oven-sh/setup-bun` availability | Well-maintained official action; pin to `v2`. |
| npm scoped registry (`@gmb`) auth in CI | Configure `bunfig.toml` if needed for private registry auth (currently uses npmScopes in `.yarnrc.yml`). |
| `bun.lockb` binary lockfile in git | Commit for reproducibility; bun supports `bun.lock` (text) as alternative if preferred. |

## Completion Criteria

- No yarn artifacts remain in the repository
- `preinstall` script rejects npm/yarn/pnpm with a clear error
- `bun install`, `bun start`, `bun run build`, `bun test` all succeed locally
- CI workflow deploys successfully with bun
- README documents bun commands
