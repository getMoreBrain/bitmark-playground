# PLAN-009: WASM Check Match LED

STATUS: completed
DIRECTION: top-down
TRACEABILITY: Adds an indicator to the WASM Check tab (PLAN-006 `ParserTabBar`). Compares `js` (Original) vs `wasm` (WASM opt) slices produced by PLAN-002 / PLAN-008.

---

## Goal

Add a green/red/neutral "LED" to the right of the title in the `WASM Check` tab (top-right JSON tab bar). Colour reflects whether the Original (JS) JSON and the WASM optimized JSON are equivalent under a normalized comparison.

## Comparison rule (per data change)

Compare `bitmarkState.js.json` (Original) vs `bitmarkState.wasm.json` (WASM opt). Each is an array of `{ bitmark?, bit, parser? }` wrappers.

Normalization (decisions confirmed):
1. **Per entry, keep `entry.bit` only** — strips both `parser` and `bitmark`.
2. **Strip natural defaults**, recursively (bottom-up): drop any object key whose normalized value deep-equals a natural default — `""`, `false`, `0`, `[]`, `{}`. Array elements are normalized but never dropped (length/order preserved). `null` is left as-is (not in the default set).
3. **Deep-equal, object-key order independent, array order significant** (e.g. `lodash/isEqual`).

Result → LED:
- Both sides valid + equal ⇒ **green** (`match`).
- Both sides valid + not equal ⇒ **red** (`mismatch`).
- Not comparable ⇒ **neutral/grey**: either side has a `jsonError`, or either side's `json` is empty (no data / parser not loaded).

## Components

- **Pure util** `src/utils/parserJsonMatch.ts`
  - `normalizeBitJson(value): unknown` — recursive default-stripping (rule 2).
  - `parserJsonMatch(originalJson, wasmJson): 'match' | 'mismatch' | 'neutral'` — applies rules 1–3, with the neutral guard. Pure, no state. Uses `lodash/isEqual`.
- **Derive in `App.tsx`** — `useMemo` over the snapshot (keyed on `js.jsonUpdates` + `wasm.jsonUpdates`, and error/empty state) → LED status; pass to the JSON `ParserTabBar` as a prop. No new state (UI derived from snapshot).
- **`ParserTabBar.tsx`** — new optional prop `wasmCheckLed?: 'match' | 'mismatch' | 'neutral'`. When `showWasmCheck`, render a small circular LED at the **far right** of the `WASM Check` tab (after the duration text). Colours: match→green, mismatch→red, neutral→muted/dim.

## Steps

### Step 1 — Comparison util
- File: `src/utils/parserJsonMatch.ts`
- Implement `normalizeBitJson` (recursive default-strip) and `parserJsonMatch` (extract `.bit`, normalize both arrays, `isEqual`, neutral guard).

### Step 2 — LED in `ParserTabBar`
- File: `src/components/generic/ui/ParserTabBar.tsx`
- Add `wasmCheckLed?` prop; render a themed dot after the `WASM Check` title (only when `showWasmCheck`). `aria-label` reflecting status for testability.

### Step 3 — Wire derive in `App.tsx`
- `useMemo(() => parserJsonMatch(snap.js.json, snap.wasm.json), [snap.js.jsonUpdates, snap.wasm.jsonUpdates, snap.js.jsonError, snap.wasm.jsonError])` (or equivalent deps) → pass as `wasmCheckLed` to the JSON `ParserTabBar` only.

### Step 4 — Tests
- `src/utils/parserJsonMatch.test.ts`:
  - strips `parser` and `bitmark` (entries equal on `bit`).
  - strips natural defaults recursively (default-valued keys ignored; nested empties collapse).
  - object-key order independent ⇒ match; array element reorder ⇒ mismatch.
  - neutral when either side empty or errored; match/mismatch otherwise.
- `src/components/generic/ui/ParserTabBar.test.tsx`: LED renders with the correct status/colour when `showWasmCheck`; absent otherwise.

## Functional Requirements

- F1: LED appears to the right of the `WASM Check` title, JSON tab bar only.
- F2: Recomputes on every data change (Original or WASM JSON update).
- F3: Comparison ignores `parser` and `bitmark`; compares `bit` only.
- F4: Comparison strips natural defaults (`""`,`false`,`0`,`[]`,`{}`) recursively from both sides.
- F5: Equality is object-key-order independent; array order is significant.
- F6: Green on match, red on mismatch, neutral/grey when not comparable.

## Non-Functional Requirements

- N1: Comparison is a pure, unit-tested function.
- N2: Derived via `useMemo` from the snapshot; recompute only when JSON updates (no new reactive state).
- N3: Reuses existing `lodash` dependency for deep-equal.
- N4: No change to conversion flow, WASM Check round-trip, or other tabs.

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Deep compare cost on large docs | Runs only on JSON change via `useMemo`; acceptable |
| `js.json` missing `bit` on some entry | Defensive: treat missing `bit` as `{}` |
| Natural-default strip emptying an object then re-stripping its parent key | Recursive bottom-up handles this by design |
| `null` ambiguity (not in default set) | Compared as-is (documented); revisit if needed |
| Theme has no `red` token | Use a literal red (theme passes unknown colour keys through); green = `primary`, neutral = `muted` |
| LED placement vs duration text | Place between title and duration; keep compact |

## Completion Criteria

- [x] LED visible at the far right of the `WASM Check` tab (JSON bar only).
- [x] Green when Original and WASM opt JSON match under the rules; red when they differ.
- [x] Neutral/grey when either side is empty or errored.
- [x] `parser` and `bitmark` ignored; natural defaults stripped; key-order independent; array order significant.
- [x] Updates on every data change (useMemo over the JSON snapshot).

## Out of Scope

- LED on any other tab.
- Diffing/visualising *where* they differ.
- Making the comparison configurable.
- Changing conversion or WASM Check behaviour.
