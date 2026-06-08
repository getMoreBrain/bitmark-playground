# PLAN-007: Table (HTML) Tab — HTML-Table ⇄ Bitmark Sync

STATUS: completed
DIRECTION: top-down
TRACEABILITY: Extends PLAN-002 (parser tab bar, BitmarkState slices, dual converter) and PLAN-006 (optional tab + renderless runner pattern). Shares `bitmarkParserGenerator`.

---

## Goal

Add a `Table (HTML)` tab as the last tab on the JSON editor's tab bar (top right), after `WASM Check`. The tab hosts an **editable** Monaco editor in `html` language mode. It bidirectionally syncs an HTML-table document with the `Original` bitmark via the parser's new `convertHtmlTable` functionality.

## Scope

- ONE new tab, JSON (top-right) bar only.
- The `Original` (bitmark, top-left) tab and existing bars are otherwise unchanged.
- No new left-panel tab — `Original` already shows the bitmark.

## Tab Layout

| Tab bar | Tabs |
|---------|------|
| Bitmark (top left) | `Original` \| `WASM` \| `WASM (full)` (unchanged) |
| JSON (top right)  | `Original` \| `WASM` \| `WASM (full)` \| `WASM Check` \| `Table (HTML)` ← new last tab |

When `Table (HTML)` is selected, the right pane swaps from the JSON editor to an editable HTML Monaco editor (`TableHtmlPanel`) bound to `bitmarkState.tableHtml.html`. Switching to any other tab restores the JSON editor.

## Conversion API (assumption)

`convertHtmlTable` is provided by the CDN-loaded `bitmarkParserGenerator` (not yet in bundled types). Direction is **explicit** (separate call/option per direction):

- `HTML → bitmark` — used when the Table (HTML) tab is edited.
- `bitmark → HTML` — used to refresh the Table (HTML) tab when `Original` changes.

The exact method names / option flags MUST be bound to the actual CDN API during implementation (see Risks). The plan refers to them abstractly as `htmlTableToBitmark(html)` and `bitmarkToHtmlTable(bitmark)`.

## Data Flow

```
Flow A — user edits Table (HTML):
  tableHtml.html ──htmlTableToBitmark──► bitmark ──► markupToJson(bitmark)
                                                        ├─► js (Original) + wasm + wasmFull json panes
                                                        └─► (suppress Flow B for this self-induced markup change)

Flow B — Original bitmark changes by ANY method (markup edit, json→markup, etc.):
  js.markup ──bitmarkToHtmlTable──► tableHtml.html      (SKIP when the change originated from Flow A)
```

`Original` = `bitmarkState.js` slice (`activeMarkupTab === 'js'`). Flow B subscribes to `js.markup`.

### Loop prevention (critical)

Flow A writes `js.markup`; that write would normally trigger Flow B and clobber the user's HTML. A guard breaks the cycle:

- Before Flow A triggers `markupToJson`, set a transient flag (e.g. `syncingFromHtml = true`, module-level in the runner, or a `tableHtml` state field).
- Flow B's subscriber checks-and-clears the flag: if set, skip the `bitmark → HTML` refresh for that change.
- Backup/dedupe: also keep `lastMarkup` (mirror `WasmCheckRunner.lastJson`) so identical-value notifications are ignored.

## Steps

### Step 1 — Extend `bitmarkState` with `tableHtml`

- File: `src/state/bitmarkState.ts`
- Add `TableHtmlSlice`: `{ html, htmlError, htmlErrorAsString, htmlDurationSec, htmlUpdates }`.
- Add `tableHtml` slice + `createTableHtmlSlice()`.
- Extend `JsonTabType`: `ParserType | 'wasmCheck' | 'tableHtml'`.
- Add `setTableHtml(html, htmlError, durationSec)` setter (mirrors `setWasmCheck` shape, stores HTML).
- `getTabFromUrl` does NOT recognise `tableHtml` (URL params only set `js|wasm|wasmFull`, as with `wasmCheck`).

### Step 2 — `TableHtmlRunner` (Flow B: Original → HTML)

- File: `src/services/TableHtmlRunner.tsx`
- Hook `useTableHtmlRunner()` + renderless `<TableHtmlRunner />` (mirror `WasmCheckRunner`).
- `subscribe(bitmarkState.js, evaluate)`; `evaluate` reads `bitmarkState.js.markup`, dedupes via `lastMarkup`.
- On change: if guard flag set → clear it and skip. Else if parser loaded:
  - Empty markup → `setTableHtml('', undefined, undefined)`.
  - Else `bitmarkToHtmlTable(js.markup)`; measure duration via `performance.mark/measure`; `setTableHtml(...)`.
- Run once on mount with current value (parser-ready race, as in `WasmCheckRunner`).

### Step 3 — `TableHtmlPanel` (editable HTML editor + Flow A)

- File: `src/components/bitmark/TableHtmlPanel.tsx`
- Editable `MonacoTextArea`, `language="html"`, value = `tableHtml.html` (or `htmlErrorAsString` when present).
- `onInput(html)`:
  1. set guard flag (suppress Flow B for the resulting markup write).
  2. `htmlTableToBitmark(html)` → bitmark (measure duration → `setTableHtml` duration/error).
  3. `markupToJson(bitmark, { jsonOptions: { enableWarnings: true } })` to push bitmark into `Original` and fill the other panes.
- Empty html → push empty bitmark (or skip) consistently with Step 2 empty handling.
- Needs access to `useBitmarkConverter().markupToJson` and the parser for conversion.

### Step 4 — Add `tableHtml` tab to `ParserTabBar`

- File: `src/components/generic/ui/ParserTabBar.tsx`
- New optional props: `showTableHtml?: boolean` (default `false`), `tableHtmlDuration?: number | undefined`.
- When `showTableHtml`, render a tab `Table (HTML){duration}` after the WASM Check tab, `onClick={() => onTabChange('tableHtml')}`.
- Bitmark-side bar does NOT pass it.

### Step 5 — Render Table (HTML) content in the JSON pane

- File: `src/components/bitmark/BitmarkJsonTextBox.tsx`
- When `activeJsonTab === 'tableHtml'`, render `<TableHtmlPanel />` instead of the JSON `MonacoTextArea` (parallels the existing `wasmCheck` branch).
- Otherwise unchanged.

### Step 6 — Wire into `App.tsx`

- JSON `ParserTabBar`: add `showTableHtml` and `tableHtmlDuration={snap.tableHtml.htmlDurationSec}`.
- Mount `<TableHtmlRunner />` once inside `BitmarkParserGeneratorProvider` (alongside `<WasmCheckRunner />`).
- Markup-side `onTabChange` guard: also exclude `tableHtml` (`if (tab !== 'wasmCheck' && tab !== 'tableHtml')`).

### Step 7 — Settings persistence (v3 → v4)

- File: `src/services/settingsStorage.ts`
- `CURRENT_VERSION = 4`.
- Add `'tableHtml'` to `VALID_JSON_TABS`.
- `migrateSettings` chains v1→v2→v3→v4; v4 difference vs v3: `'tableHtml'` becomes a valid `activeJsonTab`. Prior values remain valid (non-destructive).
- `VALID_PARSER_TYPES` (markup side) and `VALID_OUTPUT_TABS` unchanged.

### Step 8 — Tests

- `src/components/bitmark/TableHtmlPanel.test.tsx` — editable Monaco, `html` language; `onInput` triggers `htmlTableToBitmark` + `markupToJson`; error fallback.
- `src/services/TableHtmlRunner.test.tsx` — `js.markup` change runs `bitmarkToHtmlTable` → `setTableHtml`; guard flag skips self-induced change; empty markup clears.
- `src/components/generic/ui/ui-components.test.tsx` (or ParserTabBar tests) — `showTableHtml` renders the tab; absent by default; click calls `onTabChange('tableHtml')`.
- `src/components/bitmark/BitmarkJsonTextBox.test.tsx` — `activeJsonTab === 'tableHtml'` renders `TableHtmlPanel`; switching back restores JSON editor.
- `src/services/settingsStorage.test.ts` — `'tableHtml'` accepted as `activeJsonTab` at v4; rejected for markup/output tabs; v3→v4 migration preserves prior values.

## Functional Requirements

- F1: `Table (HTML)` tab appears only on the JSON (top-right) bar, after `WASM Check`.
- F2: Editing/pasting in `Table (HTML)` converts HTML→bitmark, sets it as `Original`, and runs it through the parser(s) to fill the other panes.
- F3: When `Original` bitmark changes by any method, `Table (HTML)` is refreshed via bitmark→HTML.
- F4: The Original→HTML refresh is suppressed when the change originated from the `Table (HTML)` tab (no feedback loop).
- F5: The `Table (HTML)` editor is editable with `html` syntax highlighting.
- F6: Conversion errors (either direction) are surfaced without crashing; editor remains usable.
- F7: Selected `Table (HTML)` tab persists across reloads (`activeJsonTab`, v4).
- F8: Bitmark (top-left) bar remains three tabs.

## Non-Functional Requirements

- N1: HTML refresh runs reactively (subscribe), not in the markup→json critical path.
- N2: No additional CDN load — reuses `bitmarkParserGenerator`.
- N3: Persistence migrations remain non-destructive for prior versions.
- N4: No changes to existing Diff, Lexer, or WASM Check behaviour.

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| `convertHtmlTable` API shape (method names, direction option, return type) unknown until CDN parser version is pinned | Bind concrete calls at implementation; isolate both directions behind `htmlTableToBitmark` / `bitmarkToHtmlTable` adapters so the rest of the plan is stable |
| Feedback loop HTML→bitmark→HTML clobbers user edits | Guard flag + `lastMarkup` dedupe (Step 2); subscriber checks-and-clears |
| Valtio subscribe batching vs guard-flag timing | Set flag synchronously before `markupToJson`; clear inside subscriber; dedupe as backstop |
| Showing error text inside an editable box clobbers user input on each keystroke | Keep last good html; surface error via `htmlErrorAsString` in label/overlay rather than replacing editor content |
| Original bitmark with no table | `bitmarkToHtmlTable` may return empty/error → store empty html or surface error (F6); no crash |
| `bitmarkParserGenerator` not loaded when first `js.markup` arrives | Runner re-runs once parser ready (effect dep), as in `WasmCheckRunner` |
| Parser version selection (`?v=`) lacking `convertHtmlTable` | Feature-detect the method; degrade gracefully (tab shows notice / passthrough) if absent |

## Completion Criteria

- [x] JSON bar shows five tabs ending with `Table (HTML)`; bitmark bar still three.
- [x] Pasting an HTML table into `Table (HTML)` populates `Original` bitmark and all JSON panes.
- [x] Editing `Original` (or JSON→markup) refreshes `Table (HTML)`.
- [x] No feedback loop when editing `Table (HTML)` (dedupe + pre-seed guard, covered by test).
- [x] `Table (HTML)` editor is editable with HTML highlighting (html.contribution bundled).
- [x] Conversion errors are surfaced without crashing (stored in `tableHtml` slice; feature-detect guard).
- [x] Selected `Table (HTML)` tab survives reload (v4).
- [x] Bottom output panels unchanged (`Diff | Lexer`).

## Out of Scope

- A left-panel (bitmark side) Table tab.
- Diffing HTML-table output against anything.
- Non-table HTML conversion.
- Switching the parser used for table conversion (always `bitmarkParserGenerator`).
