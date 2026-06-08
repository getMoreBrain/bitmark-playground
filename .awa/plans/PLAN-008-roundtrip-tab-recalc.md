# PLAN-008: Round-Trip Tab Recalculation

STATUS: completed
DIRECTION: top-down
TRACEABILITY: Revises PLAN-002 conversion flow (`markupToJson` / `jsonToMarkup`, `setJson` / `setMarkup`, `syncMarkupInput` / `syncJsonInput`). Interacts with PLAN-006 (wasmCheck) and PLAN-007 (tableHtml) runners.

---

## Goal

When the user manually edits one tab, recompute **all** related tabs by calculation instead of copying the edited value across same-side tabs. The edited tab keeps the user's input; every other related tab is derived.

## Problem (current behaviour)

Editing a JSON tab calls `syncJsonInput`, which **copies** the edited JSON string into all JSON slices (`js`, `wasm`, `wasmFull`); the cross-side (bitmark) tabs are calculated. (Symmetrically, editing a bitmark tab copies markup across the bitmark slices.) So same-side non-edited tabs mirror the edit rather than showing each parser's own result.

## Model (per-tab own-parser round-trip)

Related slices: `js`, `wasm`, `wasmFull`. Each slice P has its own parser/mode:
`js` → JS parser (bpg); `wasm` → WASM optimized; `wasmFull` → WASM full.

Conversion primitives (already used today):
- `m2j_P(markup)` — markup→JSON for parser P.
- `j2m_P(json)` — JSON→bitmark for parser P.

**Edit JSON on tab X** (X ∈ {js, wasm, wasmFull}):
```
X.json := user input (verbatim, kept)
Forward (cross-side, as today) for all P:   P.markup := j2m_P(X.json)
Back (same-side, NEW) for P ≠ X:            P.json   := m2j_P(P.markup)
```
**Edit bitmark on tab X** — symmetric:
```
X.markup := user input (verbatim, kept)
Forward for all P:                          P.json   := m2j_P(X.markup)
Back for P ≠ X:                             P.markup := j2m_P(P.json)
```

Worked example — edit Original (js) JSON = `J`:
```
js.markup       = bpg.j2b(J)
wasm.markup     = wasm.j2b(J, opt)
wasmFull.markup = wasm.j2b(J, full)
wasm.json       = wasm.b2j(wasm.markup, opt)      # back
wasmFull.json   = wasm.b2j(wasmFull.markup, full) # back
js.json         = J                               # edited tab, untouched
```

The "edited tab" = the active tab on the edited side (`activeMarkupTab` / `activeJsonTab`); programmatic callers (Table (HTML)) pass `js` explicitly.

## Error handling

- **Cross-side** tabs: show the conversion result or the error (as today).
- **Same-side non-edited** tabs: update **only on a successful back-conversion**; otherwise keep their last good value (never cleared, never shown as error).
- **Edited tab**: shows the user input verbatim (even if it fails to convert).

So editing invalid JSON ⇒ all JSON tabs keep last good, all bitmark tabs show the error (and symmetrically for invalid bitmark).

## Data Flow

```
edit side S (json|bitmark), other side O, edited tab X
  X.S := input                         (immediate, verbatim)
  for P in {js,wasm,wasmFull}:         P.O := convert_S→O_P(X.S)      # forward, errors shown
  await forward
  for P in {js,wasm,wasmFull} \ {X}:   P.S := convert_O→S_P(P.O)      # back, skip-on-error (keep last good)
  lex each WASM tab's resulting markup
```

## Steps

### Step 1 — State setters: single-side, no copy
- File: `src/state/bitmarkState.ts`
- `setJson` / `setMarkup` set **only** their own representation side; remove the opposite-side source parameter and its write (the copy).
- Replace `syncMarkupInput` / `syncJsonInput` (bulk copy) with setting **only the edited tab's** field immediately (e.g. `setEditedMarkup(parser, markup)` / `setEditedJson(parser, json)`), so the edited editor and tab-switching reflect input before async completes.
- Same-side back-fill uses the normal setter on success and is simply **not called on failure** (keep last good). Cross-side forward uses the error path as today.

### Step 2 — Converter: forward + back, threaded edited tab
- File: `src/services/BitmarkConverter.tsx`
- `markupToJson(editedTab, markup, options?)` and `jsonToMarkup(editedTab, json, options?)` take the edited tab.
- Set the edited tab's edited side immediately (Step 1).
- Forward: per-parser conversion of the **source** input for all of `js`/`wasm`/`wasmFull` (calculation unchanged from today); write cross-side via the single-side setter.
- `await` forward, then Back: for each `P ≠ editedTab`, convert P's freshly-computed cross-side value via P's own parser/mode; write same-side only on success.
- Factor per-parser `m2j_P` / `j2m_P` helpers (DRY — forward and back share them).
- Lexers: lex each WASM tab's resulting markup.

### Step 3 — Editors pass the edited tab
- `src/components/bitmark/BitmarkMarkupTextBox.tsx`: `onInput` → `markupToJson(activeMarkupTab, markup, …)`.
- `src/components/bitmark/BitmarkJsonTextBox.tsx`: `onInput` → `jsonToMarkup(activeJsonTab, json, …)`.
- `src/components/bitmark/TableHtmlPanel.tsx`: Flow A → `markupToJson('js', bitmark, …)` (writes Original). Pre-seed guard unchanged.

### Step 4 — Verify derived runners unaffected
- `WasmCheckRunner` (subscribes `wasm.jsonAsString`) and `TableHtmlRunner` (subscribes `js.markup`) still fire on the new writes. No structural change; confirm no loops (back-fill writes are not editor inputs and do not re-trigger conversion).

### Step 5 — Tests
- `BitmarkConverter` (new/updated): round-trip fill — editing one tab leaves it verbatim, cross-side computed, same-side non-edited back-converted per parser.
- Keep-last-good: invalid input on edited side ⇒ same-side non-edited tabs retain prior value; cross-side shows error.
- Edited-tab threading: editing each of `js` / `wasm` / `wasmFull` skips the correct tab on back-fill.
- Update existing tests that assert the old copy behaviour / old setter signatures and the WASM-parser fakes.

## Functional Requirements

- F1: The edited tab shows the user's input verbatim.
- F2: Cross-side tabs are computed per-parser from the edited (source) content (as today).
- F3: Same-side non-edited tabs are recomputed by back-converting each tab's own freshly-computed cross-side value via that tab's own parser/mode.
- F4: No same-side copying of the edited content into non-edited tabs.
- F5: On failure — cross-side shows the error; same-side non-edited tabs keep last good; edited tab shows input verbatim.
- F6: Behaviour is symmetric for JSON edits and bitmark edits.
- F7: WASM Check and Table (HTML) continue to update via their existing runners.

## Non-Functional Requirements

- N1: Each edit performs forward (3) + back (≤2) conversions; must stay responsive. Back runs after forward and off the cross-side display critical path.
- N2: No conversion cascades/loops — conversions are triggered only by user edits and the existing wasmCheck/tableHtml runners, never by back-fill writes.
- N3: State mutations remain via single-responsibility setters; each setter touches one representation side (architecture State-Layer constraint preserved).

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Back-fill reads stale state before forward completes | Sequence: `await` forward, then back reads updated slices |
| Wrong "edited tab" detection | Pass the active tab from the editor whose `onInput` fired; Table (HTML) passes `js` |
| Removing copy breaks tab-switch instant reflect | Set the edited tab's field immediately (Step 1) |
| Keep-last-good accidentally cleared | Back-fill calls the setter only on success; never writes an error to the same side |
| Round-trip amplifies parser quirks (generate→parse drift) | Intended — this is the comparison signal |
| `wasm.jsonAsString` now a round-trip value shifts wasmCheck meaning | Acceptable; wasmCheck behaviour unchanged structurally (out of scope) |
| Editor overwrite while focused | `MonacoTextArea` already skips updates while focused; edited tab not overwritten |

## Completion Criteria

- [x] Editing Original JSON leaves it verbatim; WASM / WASM (full) JSON tabs show each parser's round-trip JSON (not a copy).
- [x] Editing a bitmark tab leaves it verbatim; non-edited bitmark tabs show each parser's regenerated bitmark.
- [x] Cross-side tabs computed per-parser from the source (unchanged from today).
- [x] Invalid edited input ⇒ same-side non-edited tabs keep last good; cross-side shows error.
- [x] No copy of edited content into same-side tabs.
- [x] WASM Check and Table (HTML) still update (runner tests migrated to the new edited-tab setters; runners subscribe to the same fields).
- [x] No conversion loops; UI stays responsive (back-fill writes don't trigger conversions; only editor input + the two runners do).

NOTE: Lexer panels lex the WASM optimized tab's markup only (per user clarification), in both directions.

## Out of Scope

- Changing WASM Check or Table (HTML) semantics.
- Diff / Lexer panel redesign.
- Debouncing / cancellation of in-flight conversions.
- Adding round-trip to non-`{js,wasm,wasmFull}` tabs.
