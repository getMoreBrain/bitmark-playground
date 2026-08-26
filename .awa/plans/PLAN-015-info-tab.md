# PLAN-015: Info Tab — Bit Config Info for the Current WASM JSON

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: Extends PLAN-003/PLAN-005 (bottom output panels) and PLAN-014 (Mappings tab). Requires `@gmb/bitmark-parser` 6.9.0 for the detailed `info` API.

## Context

The WASM parser's `info` API (CLI: `<parser> info --bit <bit-name>`) now outputs
detailed per-bit configuration. Surface it in the playground: a read-only `Info`
tab on the bottom-left output panel, immediately LEFT of `Mappings`, showing the
concatenated `info({ infoType: 'bit', bit })` output for each distinct bit name
in the current WASM (new parser) JSON output. It refreshes whenever that JSON is
regenerated.

## Steps

- [x] Step 1 — `InfoSlice` + `setInfo` in `bitmarkState`.
- [x] Step 2 — Expose `info` through the `BitmarkParser` context.
- [x] Step 3 — `InfoRunner`: on each `wasm.jsonUpdates` change, collect distinct bit names from `wasm.json`, run `info({ infoType: 'bit', bit })` per name, concatenate, store via `setInfo`.
- [x] Step 4 — `Info` tab in `OutputPanel` (opt-in, bottom-left only, before `Mappings`); `'info'` added to `OutputTab`; settings v8 → v9.
- [x] Step 5 — Wire `InfoRunner` and panel props in `App`.
- [x] Step 6 — Tests (runner, OutputPanel tab order/opt-in, settings migration).

## Functional Requirements

- F1: `Info` appears only on the bottom-LEFT output panel, between `Lexer` and `Mappings`.
- F2: It shows the concatenation of `info` outputs for each distinct bit name in the current WASM JSON, in document order.
- F3: The output refreshes on every WASM JSON regeneration (keyed off `jsonUpdates`, not value equality).
- F4: A failing `info` lookup for one bit surfaces inline for that bit without discarding the other bits' output.
- F5: The selected output tab persists across reloads (v9).

## Risks

- Duplicate bit types in a document would duplicate identical info output — mitigated by de-duplicating names (first-occurrence order).
- `info` may report failure as an `error:`-prefixed string rather than throwing — mitigated by `throwIfParserError` per bit.

## References

- Plan: .awa/plans/PLAN-014-mappings-tab.md
- Code: src/services/InfoRunner.tsx, src/state/bitmarkState.ts, src/components/generic/ui/OutputPanel.tsx
