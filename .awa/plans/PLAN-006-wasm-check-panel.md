# PLAN-006: WASM Check Tab — Round-Trip Verification

STATUS: completed
DIRECTION: top-down
TRACEABILITY: Extends PLAN-002 (parser tab bar, BitmarkState slices); shares `bitmarkParserGenerator` with PLAN-005.

---

## Goal

Add a "WASM Check" tab as the last tab in the JSON editor's parser tab bar (top right). When selected, the JSON pane displays a read-only bitmark editor whose contents are produced by feeding the WASM optimized parser's JSON output back through the JS parser (`bitmarkParserGenerator`). The view updates reactively whenever `bitmarkState.wasm.jsonAsString` changes.

## Rationale

Round-trip verification: comparing the original markup (left pane) to the WASM Check markup (right pane, WASM Check tab) reveals fidelity loss in WASM-optimized JSON. If `wasm.jsonAsString` round-trips losslessly, the right pane matches the original.

## Tab Layout

| Tab bar | Tabs |
|---------|------|
| Bitmark (top left) | `Original` \| `WASM` \| `WASM (full)` (unchanged) |
| JSON (top right)  | `Original` \| `WASM` \| `WASM (full)` \| `WASM Check` ← new last tab |

When `WASM Check` is selected on the right, the right pane swaps from a JSON editor to a read-only bitmark editor (with tree-sitter highlighting) showing `bitmarkState.wasmCheck.markup`. Switching back to any other tab restores the JSON editor.

## Data Flow

```
wasm.jsonAsString  ─┐
                    ├─► bpg.convert(json, { bitmarkOptions })  ─► wasmCheck.markup
   (changes when:   │
    - markup edit   │
    - json edit)    ┘
```

`wasm.jsonAsString` is updated by both `markupToJson` (WASM optimized parser output) and `syncJsonInput` (mirror of user-typed JSON). The WASM Check computation reacts to both.

## Steps

### Step 1 — Extend `bitmarkState` with `wasmCheck` fields

- File: `src/state/bitmarkState.ts`
- Add `WasmCheckSlice` type and `wasmCheck` slice on `BitmarkState`.
- Add `setWasmCheck(markup, error, durationSec)` setter; mirrors `setMarkup` semantics.
- Extend `ParserType`: `'js' | 'wasm' | 'wasmFull' | 'wasmCheck'`.
- `getTabFromUrl` does NOT recognise `wasmCheck` — URL params only set the three primary parsers.

### Step 2 — Compute WASM Check via Valtio `subscribe`

- File: `src/services/WasmCheckRunner.tsx`
- Hook `useWasmCheckRunner()` + renderless component `<WasmCheckRunner />`.
- Subscribes to `bitmarkState.wasm` (via valtio `subscribe`) and re-runs when `wasm.jsonAsString` changes.
- On change, if `bitmarkParserGenerator` is loaded:
  - Empty string → `setWasmCheck('', undefined, undefined)`.
  - Else `bitmarkParserGenerator.convert(jsonString, { bitmarkOptions: { prettifyJson: true } })`.
  - Measure duration via `performance.mark` / `measure`.
  - Store result via `bitmarkState.setWasmCheck(...)`.
- Mounted once inside `BitmarkParserGeneratorProvider` in `App.tsx`.

### Step 3 — Add `wasmCheck` tab to `ParserTabBar`

- File: `src/components/generic/ui/ParserTabBar.tsx`
- New optional props:
  - `showWasmCheck?: boolean` (default `false`) — controls visibility of the WASM Check tab.
  - `wasmCheckDuration?: number | undefined` — duration shown in the tab label.
- When `showWasmCheck` is `true`, render a 4th tab "WASM Check" after "WASM (full)".
- Bitmark-side bar (left) does NOT pass `showWasmCheck` → bar remains 3 tabs.
- JSON-side bar (right) passes `showWasmCheck` → bar shows 4 tabs.

### Step 4 — Render WASM Check content in the JSON pane

- File: `src/components/bitmark/BitmarkJsonTextBox.tsx`
- When `activeJsonTab === 'wasmCheck'`, render the existing `WasmCheckPanel` (read-only bitmark Monaco editor) instead of the JSON `MonacoTextArea`.
- Reads `bitmarkState.wasmCheck.markup` and `bitmarkState.wasmCheck.markupErrorAsString`.
- Otherwise, existing JSON editor behaviour is unchanged.

### Step 5 — Keep `WasmCheckPanel` component

- File: `src/components/bitmark/WasmCheckPanel.tsx`
- Read-only Monaco editor with `language="bitmark"` and tree-sitter init.
- Props: `markup: string`, `errorAsString?: string`.
- (Already created — no change.)

### Step 6 — Wire into `App.tsx`

- Pass `showWasmCheck` and `wasmCheckDuration={snap.wasmCheck.markupDurationSec}` to the JSON `ParserTabBar` only.
- Mount `<WasmCheckRunner />` once inside `BitmarkParserGeneratorProvider`.
- The bottom-panel `OutputPanel` tab list reverts to its original `Diff | Lexer` (no WASM Check there).

### Step 7 — Settings persistence

- File: `src/services/settingsStorage.ts`
- `CURRENT_VERSION = 3`.
- `VALID_PARSER_TYPES = ['js', 'wasm', 'wasmFull', 'wasmCheck']`.
- `VALID_OUTPUT_TABS` reverts to `['diff', 'lexer']` (no wasmCheck).
- `migrateSettings` chains v1 → v2 → v3; v3 difference vs v2: `'wasmCheck'` becomes a valid `ParserType` for `activeJsonTab`.
- Old persisted v2 values for `activeMarkupTab` / `activeJsonTab` (`'js'` / `'wasm'` / `'wasmFull'`) remain valid.

### Step 8 — Tests

- `src/components/bitmark/WasmCheckPanel.test.tsx` — read-only Monaco editor with bitmark language; error fallback (unchanged).
- `src/components/generic/ui/ui-components.test.tsx` — revert OutputPanel WASM Check tests.
- New `ParserTabBar` tests:
  - With `showWasmCheck`, renders the WASM Check tab.
  - Without `showWasmCheck`, no WASM Check tab.
  - Clicking WASM Check tab calls `onTabChange('wasmCheck')`.
- `src/components/bitmark/BitmarkJsonTextBox.test.tsx` (new):
  - When `activeJsonTab === 'wasmCheck'`, renders `WasmCheckPanel` content (bitmark language) instead of JSON editor.
  - Switching back to `'js'` restores the JSON editor.
- `src/services/WasmCheckRunner.test.tsx` — unchanged behaviour tests.
- `src/services/settingsStorage.test.ts`:
  - `'wasmCheck'` accepted as `activeJsonTab` at v3.
  - `'wasmCheck'` rejected for `leftOutputTab` / `rightOutputTab` (those reverted to `diff|lexer`).
  - v2 → v3 migration preserves prior values.

## Functional Requirements

- F1: New "WASM Check" tab appears only on the JSON (top-right) parser tab bar.
- F2: When `wasm.jsonAsString` changes, WASM Check view recomputes via JS parser.
- F3: View is read-only; no keyboard input affects state.
- F4: Errors from JS parser are surfaced in the view.
- F5: Panel uses bitmark language with tree-sitter highlighting.
- F6: Selected tab persists across reloads.
- F7: Bitmark (top-left) parser tab bar remains unchanged.

## Non-Functional Requirements

- N1: WASM Check recompute does not block markup → JSON conversion (runs after, not in-band).
- N2: No additional CDN load — reuses `bitmarkParserGenerator`.
- N3: No changes to existing Diff or Lexer behaviour.
- N4: Persistence schema migrations remain non-destructive for prior versions.

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| `bitmarkParserGenerator` not loaded when first `wasm.jsonAsString` arrives | Subscriber re-runs once parser becomes ready (effect dep on `bitmarkParserGenerator`) |
| Subscriber fires on every WASM optimized parse, doubling JS parser work | Acceptable: JS parser is fast |
| Tree-sitter init duplication with `BitmarkMarkupTextBox` | Extract shared helper if duplication grows |
| Persisted `activeMarkupTab='wasmCheck'` (manual storage edit) | `BitmarkMarkupTextBox` reads `activeSlice = state[activeMarkupTab]`; `wasmCheck` slice has different shape → render fallback or guard required |
| URL `?tab=wasmCheck` could mismatch markup side | `getTabFromUrl` does not recognise `wasmCheck`; URL params only set `js|wasm|wasmFull` |
| Round-trip error string conflated with valid output | Render error string as the value (mirrors existing markupErrorAsString pattern) |

## Completion Criteria

- [x] JSON parser tab bar shows four tabs: `Original`, `WASM`, `WASM (full)`, `WASM Check`.
- [x] Bitmark parser tab bar still shows three tabs.
- [x] Selecting `WASM Check` swaps the right pane to a read-only bitmark editor with `wasmCheck.markup`.
- [x] Editing markup top-left updates the WASM Check view (when active).
- [x] Editing JSON top-right (any other tab) updates the WASM Check view.
- [x] WASM Check view is read-only.
- [x] Tree-sitter highlighting active in the WASM Check view.
- [x] Selected `WASM Check` tab survives page reload (persisted as `activeJsonTab`).
- [x] Bottom output panels remain `Diff | Lexer` only (no WASM Check there).

## Out of Scope

- Adding WASM Check to the bitmark (top-left) tab bar.
- Diffing WASM Check output against original markup (separate feature).
- Switching the JS parser used for the back-conversion (always `bitmarkParserGenerator`).
- Editing the WASM Check view.
