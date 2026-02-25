# PLAN-002: Dual Parser Integration (@gmb/bitmark-parser)

STATUS: in-progress
WORKFLOW: top-down
TRACES: ARCHITECTURE.md (Parser Layer, State Layer, UI Layer)

## Goal

Integrate `@gmb/bitmark-parser` (Rust/WASM-based) alongside the existing `@gmb/bitmark-parser-generator` (PEG/JS-based) so users can compare parser outputs side-by-side in a tabbed UI.

## Current State

- Single parser: `@gmb/bitmark-parser-generator` loaded from CDN via `?v=` query param
- Single bitmark editor (left), single JSON editor (right)
- Duration shown inline next to each panel header
- State tracks one set of markup/JSON/duration/error

## Target State

- Two parsers loaded simultaneously from CDN
- Tabbed UI: each panel has `JS` / `WASM` tabs with per-parser duration
- Editing in one tab runs both parsers; other-side tabs update, same-side non-edited tab unchanged
- Status bar shows both parser versions
- `?v2=` query param controls WASM parser version
- `?tab=` query param sets default active tab for both sides

## @gmb/bitmark-parser API (v3.0.0-alpha.1)

ES module (not UMD). Exports:

| Export | Signature | Notes |
|--------|-----------|-------|
| `init` (default) | `async (wasmUrl?) => void` | Must call before any other API. Loads WASM. |
| `parse` | `(input: string) => string` | Returns JSON **string**. Needs `JSON.parse()`. |
| `generate` | `(json: string) => string` | **Throws — not yet implemented.** |
| `lex` | `(input: string, stage?: string) => string` | Token dump (not needed here). |
| `convert` | `(input: string, format: string) => string` | Undocumented. May overlap with parse/generate. |
| `info` | `(…) => string` | Undocumented. Possibly returns version/build info. |

Loading pattern (browser):
```js
const module = await import(cdnUrl);
await module.default(); // init WASM
const json = module.parse("[.article]\nHello");
```

No `version()` export → fetch version from CDN `package.json` or parse from URL.

## UI Layout

```
┌─────────────────────────────────────┬─────────────────────────────────────┐
│ bitmark  | JS (0.020s) | WASM (0.001s) │  JSON   | JS (0.020s) | WASM (0.001s) │
├─────────────────────────────────────┼─────────────────────────────────────┤
│                                     │                                     │
│   [active tab's editor content]     │   [active tab's editor content]     │
│                                     │                                     │
├─────────────────────────────────────┴─────────────────────────────────────┤
│ bitmark Playground: v0.0.6, bpg: v5.11.0, bp: v3.0.0   │  © 2023-2026  │
└───────────────────────────────────────────────────────────────────────────┘
```

- "bitmark" and "JSON" are static labels (not tabs)
- "JS" and "WASM" are clickable tabs; active tab is visually highlighted
- Duration shown in parentheses within each tab label
- Both sides can have different active tabs (e.g., bitmark-JS + JSON-WASM)

## Conversion Flow

```
User edits bitmark (any tab)
  ├─→ JS parser:   markup → JSON (via bpg.convert()) → store js.json, js.jsonDuration
  └─→ WASM parser: markup → JSON (via bp.parse()) → store wasm.json, wasm.jsonDuration
  ├─→ JSON-JS tab shows JS parser result
  └─→ JSON-WASM tab shows WASM parser result
  └─→ Other bitmark tab: UNCHANGED

User edits JSON (any tab)
  ├─→ JS parser:   JSON → markup (via bpg.convert()) → store js.markup, js.markupDuration
  └─→ WASM parser: JSON → markup — SKIPPED (generate() not implemented)
  ├─→ bitmark-JS tab shows JS parser result
  └─→ bitmark-WASM tab shows "generate() not yet implemented" message
  └─→ Other JSON tab: UNCHANGED
```

Invalid JSON is not parsed (current behavior preserved).

## Steps

### Step 1: Parser Loading — `BitmarkParser.tsx`

Create `src/services/BitmarkParser.tsx`:
- CDN URL: `https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/dist/browser/bitmark-parser.min.js`
- Version from `?v2=` query param (default: `latest`)
- **ES module loading** via dynamic `import(url)` — cannot use `useScript` hook
- After import, call `module.default()` (init) to initialize WASM
- Store `parse` and `generate` functions in context
- Fetch version from `https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${version}/package.json`
- Context provider: `BitmarkParserProvider` / `useBitmarkParser`
- State: `{ loadSuccess, loadError, parse, generate, version }`
- Use `useEffect` with loading state machine (idle → loading → ready | error)

### Step 2: State Expansion — `bitmarkState.ts`

Use **nested state per parser** (Option B):

```ts
type ParserType = 'js' | 'wasm';

interface ParserSlice {
  markup: string;
  markupError: Error | undefined;
  markupErrorAsString: string | undefined;
  markupDurationSec: number | undefined;
  markupUpdates: number;
  json: BitWrapperJson[];
  jsonAsString: string;
  jsonError: Error | undefined;
  jsonErrorAsString: string | undefined;
  jsonDurationSec: number | undefined;
  jsonUpdates: number;
}

interface BitmarkState {
  js: ParserSlice;
  wasm: ParserSlice;
  activeMarkupTab: ParserType;
  activeJsonTab: ParserType;
  setJson(parser: ParserType, markup: string, json: ..., error: ..., duration: ...): void;
  setMarkup(parser: ParserType, json: string, markup: ..., error: ..., duration: ...): void;
  setActiveMarkupTab(tab: ParserType): void;
  setActiveJsonTab(tab: ParserType): void;
}
```

### Step 3: Dual Converter — `BitmarkConverter.tsx`

Refactor `useBitmarkConverter`:
- Accept both parser contexts
- `markupToJson(markup)`:
  - JS parser: `bpg.convert(markup, options)` → `setJson('js', ...)`
  - WASM parser: `JSON.parse(bp.parse(markup))` → `setJson('wasm', ...)`
  - Run in parallel via `Promise.allSettled`
  - Each parser's errors stored independently
- `jsonToMarkup(json)`:
  - JS parser: `bpg.convert(json, options)` → `setMarkup('js', ...)`
  - WASM parser: `bp.generate(jsonString)` → catch "not implemented" → `setMarkup('wasm', ..., error)`
  - Run in parallel via `Promise.allSettled`
- Handle case where one parser isn't loaded yet (skip, don't block)

### Step 4: Tab Bar Component

Create `src/components/generic/ui/ParserTabBar.tsx`:
- Props: `label`, `jsDuration`, `wasmDuration`, `activeTab`, `onTabChange`
- Renders: static label + two clickable tab buttons with duration in parens
- Active tab: bright text (primary color), inactive: muted
- Uses theme-ui `Flex` + `Text` for consistency

### Step 5: UI Integration — `App.tsx`

- Replace `<Text>bitmark</Text>` + `<BitmarkMarkupDuration>` with `<ParserTabBar label="bitmark" ...>`
- Replace `<Text>JSON</Text>` + `<BitmarkJsonDuration>` with `<ParserTabBar label="JSON" ...>`
- Wire `activeTab` / `onTabChange` to state
- Delete `BitmarkMarkupDuration.tsx` and `BitmarkJsonDuration.tsx` (superseded by tab bar)

### Step 6: Editor Panel Updates

Update `BitmarkMarkupTextBox` and `BitmarkJsonTextBox`:
- Accept `parserType` prop (or read `activeMarkupTab` / `activeJsonTab` from state)
- Read `value` from `state[activeTab].markup` / `state[activeTab].jsonAsString`
- Read errors from `state[activeTab].markupError` / `state[activeTab].jsonError`
- On edit, call dual converter (runs both parsers)

### Step 7: Provider Nesting — `App.tsx`

```tsx
<BitmarkParserGeneratorProvider>
  <BitmarkParserProvider>
    {/* app content */}
  </BitmarkParserProvider>
</BitmarkParserGeneratorProvider>
```

Both providers load independently and in parallel.

### Step 8: Version Display

Update `ApplicationInfo.tsx`:
- Add `bitmarkParserVersion: string` field
- Read from `useBitmarkParser()` context

Update `Version.tsx`:
- Display: `bitmark Playground: v{X}, bpg: v{Y}, bp: v{Z}`

### Step 9: Initial Load & URL Params

- Both parsers load in parallel on app start
- Initial markup conversion runs on both when each becomes ready
- `?v=` controls JS parser version (existing)
- `?v2=` controls WASM parser version (new)
- `?tab=js|wasm` sets default active tab for both sides (new, default: `js`)
- If a parser fails to load, its tab shows "Load failed" and the other tab works normally

## Risks

| Risk | Mitigation |
|------|------------|
| ES module dynamic import may fail on some CDN configs | Test with jsdelivr; fallback to fetch + blob URL if needed |
| `parse()` returns string, not object | Wrap with `JSON.parse()` |
| `generate()` throws "not implemented" | Catch error, display message in WASM bitmark tab |
| WASM init may be slow on first load | Show "Loading..." in tab, don't block JS parser |
| Dual parsing on every keystroke | Both parsers are fast; existing debounce (if any) applies |
| No `version()` export | Fetch version from CDN package.json |

## Completion Criteria

- [ ] Both parsers load from CDN on app start
- [ ] Tab bar visible on both panels with JS/WASM tabs
- [ ] Editing in either tab runs both parsers
- [ ] Each tab displays the correct parser's output and duration
- [ ] Non-edited same-side tab content is unchanged
- [ ] WASM bitmark tab shows "not implemented" when JSON is edited
- [ ] Status bar shows both parser versions
- [ ] `?v2=` query param controls WASM parser version
- [ ] `?tab=` query param sets default active tab
- [ ] Graceful handling when one parser fails to load
