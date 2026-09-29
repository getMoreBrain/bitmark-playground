# PLAN-019: Debounce the Old (bpg) Parser

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: PLAN-008 (the per-tab conversion flows), PLAN-006 (WASM Check), PLAN-012 (the JS round trip). Found while verifying PLAN-018.

## Context

Every edit converts the whole document with every parser, synchronously. On a
25k-character document a keystroke takes about 190 ms, and most of it is the
old parser (`bitmark-parser-generator`, the Original tab): its conversion and
round trip, and the WASM Check tab's JSON → bitmark. The WASM side costs about
18 ms. The old parser is near deprecation, and its tabs can lag a little
without harm.

## Decisions

- D1 — The WASM parsers (WASM, WASM (full)) still convert on every edit.
- D2 — The old parser runs after a pause in editing (`OLD_PARSER_DEBOUNCE_MS`,
  250 ms), on the latest input only:
  - the Original tab's conversion and back-fill in `markupToJson` /
    `jsonToMarkup`;
  - `WasmCheckRunner` (bpg JSON → bitmark of the WASM JSON).
- D3 — `JsRoundTripRunner` is unchanged: it follows the Original JSON, which
  now changes only after the pause.
- D4 — The edited tab still stores the user's input at once
  (`setEditedMarkup` / `setEditedJson`), whichever parser it is.

## Steps

- [x] Step 1 — `BitmarkConverter`: run the forward and back-fill steps over a
  given parser list; the WASM parsers at once, the old parser through one
  shared debounced call (module level, so every editor shares it). Export
  `flushOldParser` for tests.
- [x] Step 2 — `WasmCheckRunner`: debounce `run`; cancel on cleanup.

### Testing

- [x] Converter tests flush the old parser before checking the Original tab.
- [x] A burst of edits runs the old parser once, on the last input; the WASM
  parsers run for every edit.
- [x] WASM Check: a burst of JSON changes converts once, on the last JSON.
- [x] Browser: a keystroke in a 25k-character document no longer waits on the
  old parser (67–91 ms, was ~190 ms; no bpg call while typing, 5 after the
  pause).

## Completion Criteria

- [x] `npx eslint src vite.config.ts`, `npx tsc --noEmit` and `npx vitest run` pass.
- [x] The Original and WASM Check tabs catch up after a pause in typing.

## References

- Code: src/services/{BitmarkConverter,WasmCheckRunner,JsRoundTripRunner}.tsx
