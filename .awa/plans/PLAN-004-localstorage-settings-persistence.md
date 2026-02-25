# PLAN-004: LocalStorage Settings Persistence

**Status:** in-progress
**Workflow direction:** bottom-up
**Traceability:** Extends `uiState` (PLAN-003-UiState) and `bitmarkState` (PLAN-002-BitmarkState); fulfills "Persistence of settings across page reload" noted as out-of-scope in PLAN-003.

---

## Goal

Persist selected UI settings to `localStorage` so they survive page reloads. Settings are stored under a single versioned key to allow future schema migrations.

## Settings to Persist

| Setting | Source | Type | Default |
|---------|--------|------|---------|
| Active bitmark (markup) parser tab | `bitmarkState.activeMarkupTab` | `ParserType` (`'js'` \| `'wasm'`) | `getDefaultTab()` (from `?tab=` query param, else `'js'`) |
| Active JSON parser tab | `bitmarkState.activeJsonTab` | `ParserType` | same |
| Diff/lex shown/hidden | `uiState.showDiffLex` | `boolean` | `false` |
| Bitmark diff/lex selected tab | `uiState.leftOutputTab` | `OutputTab` (`'diff'` \| `'lexer'`) | `'diff'` |
| JSON diff/lex selected tab | `uiState.rightOutputTab` | `OutputTab` | `'diff'` |

## Storage Format

Single `localStorage` key: `"bitmark-playground-settings"`

```ts
interface PersistedSettings {
  /** Schema version — bump on breaking changes */
  v: number;
  activeMarkupTab: ParserType;
  activeJsonTab: ParserType;
  showDiffLex: boolean;
  leftOutputTab: OutputTab;
  rightOutputTab: OutputTab;
}
```

Initial version: `v: 1`.

## Precedence Rules

- URL query param `?tab=` overrides stored `activeMarkupTab` / `activeJsonTab` (explicitly requested by user → takes priority).
- If no `?tab=` param, stored values are used.
- If no stored values, hard-coded defaults apply.

## Steps

### Step 1 — Create `settingsStorage` utility

- New file: `src/services/settingsStorage.ts`
- Constants: `STORAGE_KEY = 'bitmark-playground-settings'`, `CURRENT_VERSION = 1`
- `loadSettings(): PersistedSettings | null`
  - Read from `localStorage`, parse JSON
  - Validate `v` field; if missing or unsupported version, return `null` (fall back to defaults)
  - Wrap in try/catch for `SecurityError` (private browsing) and malformed JSON
- `saveSettings(settings: PersistedSettings): void`
  - Serialize and write to `localStorage`
  - Wrap in try/catch (quota exceeded, private browsing)
- `migrateSettings(raw: unknown): PersistedSettings | null`
  - If `v === CURRENT_VERSION`, validate shape and return
  - If `v < CURRENT_VERSION`, apply migrations (none yet, placeholder for future)
  - Otherwise return `null`
- Export `PersistedSettings` type

### Step 2 — Hydrate state on startup

- In `bitmarkState.ts`: import `loadSettings` and use stored `activeMarkupTab` / `activeJsonTab` as defaults when no `?tab=` query param is present. URL param still wins.
- In `uiState.ts`: import `loadSettings` and use stored `showDiffLex`, `leftOutputTab`, `rightOutputTab` as initial values if available.
- Both modules call `loadSettings()` once at module init time (top-level, before proxy creation).

### Step 3 — Persist on change via Valtio `subscribe`

- New file: `src/services/settingsPersistence.ts`
  - Import `subscribe` from `valtio`
  - Import both `bitmarkState` and `uiState`
  - Import `saveSettings`
  - `initSettingsPersistence(): void`
    - Subscribe to relevant fields on both proxies
    - On change, collect current values from both states, build `PersistedSettings`, call `saveSettings`
    - Debounce writes (e.g. 300ms) to avoid thrashing on rapid tab switching
  - Called once from `App.tsx` or `index.tsx` on mount

### Step 4 — Unit tests

- New file: `src/services/settingsStorage.test.ts`
  - Mock `localStorage` (`getItem`, `setItem`, `removeItem`)
  - Test `loadSettings` returns `null` on empty / malformed / wrong-version data
  - Test `loadSettings` returns valid `PersistedSettings` on correct data
  - Test `saveSettings` writes expected JSON to `localStorage`
  - Test `migrateSettings` with current version and unknown version
  - Test graceful handling of `SecurityError` / `QuotaExceededError`

### Step 5 — Integration test

- New file: `src/services/settingsPersistence.test.ts`
  - Verify that changing `bitmarkState.activeMarkupTab` triggers a `saveSettings` call
  - Verify that changing `uiState.showDiffLex` triggers a `saveSettings` call
  - Verify debounce behavior (multiple rapid changes → single write)

### Step 6 — Update PLAN-003 out-of-scope

- Remove "Persistence of settings across page reload (future: localStorage)" from PLAN-003 out-of-scope section since it is now addressed by this plan.

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| `localStorage` unavailable (private browsing, disabled) | Try/catch around all access; fall back to in-memory defaults silently |
| Storage quota exceeded | Catch `QuotaExceededError`; log warning, continue without persistence |
| Schema evolution breaking stored data | Version field `v` enables forward migration; unknown versions → discard |
| `?tab=` param and stored value conflict | Explicit precedence: URL param wins |
| Multiple tabs writing concurrently | Acceptable for settings this simple; last-write-wins is fine |
| Debounce delay means crash loses last change | 300ms is short enough; settings are non-critical |

## Completion Criteria

- [ ] Settings survive page reload (manual verification)
- [ ] URL `?tab=wasm` overrides stored tab preference
- [ ] Removing `localStorage` entry gracefully falls back to defaults
- [ ] Corrupted/malformed storage data does not crash the app
- [ ] Private browsing mode (no `localStorage`) does not crash the app
- [ ] Unit tests pass for storage utility
- [ ] Integration tests pass for persistence wiring
