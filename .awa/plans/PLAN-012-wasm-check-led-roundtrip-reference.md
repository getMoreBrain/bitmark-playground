# PLAN-012: WASM Check LED — Compare Against the bpg Round-Trip Reference

STATUS: completed
DIRECTION: top-down
TRACEABILITY: Replaces the comparison inputs introduced by PLAN-009 (`wasmCheckLed`). Reuses the bpg conversion options from PLAN-008 (`BitmarkConverter`) and the runner pattern from PLAN-006 / PLAN-011.

## Context

PLAN-009 lights the WASM Check LED by comparing two *forward* parses of the same
markup: `js.json` (bpg) against `wasm.json` (Rust, optimized mode).

That reference is too strict. bpg's own `json -> bitmark -> json` round trip is
lossy: `js.json` can contain fields that cannot be expressed in bitmark markup and
therefore do not survive being written out and re-read. The Rust parser, which only
ever sees the markup, cannot produce those fields — so the LED goes red for
differences that are bpg artifacts rather than Rust parser defects.

The fair reference is bpg's own round-trip fixpoint: everything bpg can still
express after a full trip through markup. Compare the Rust parser against that.

```
markup ──bpg──► js.json ──bpg j2m──► markup' ──bpg m2j──► jsRoundTrip.json
                                                                 │
                                                              compare
                                                                 │
markup ──rust─► wasm.json ───────────────────────────────────────┘
```

Only the Original side is round-tripped. `wasm.json` is compared as-is.

## Steps

### Step 1 — `jsRoundTrip` slice in `bitmarkState`

- File: `src/state/bitmarkState.ts`
- Add `JsRoundTripSlice`: `json`, `sourceJsonAsString`, `error`, `durationSec`, `updates`.
- `sourceJsonAsString` records the `js.jsonAsString` the round trip was computed
  from, so consumers can detect a stale (not-yet-recomputed) reference.
- Add `setJsRoundTrip(source, json, error, durationSec)`.
- No new tab type, no settings/persistence change.

### Step 2 — `JsRoundTripRunner`

- File: `src/services/JsRoundTripRunner.tsx`
- Renderless component + `useJsRoundTripRunner()` hook, mirroring `WasmCheckRunner`.
- Subscribes to `bitmarkState.js`; re-runs when `js.jsonAsString` changes.
- Runs `bpg.convert(json, JS_JSON_TO_MARKUP_OPTIONS)` then
  `bpg.convert(markup, JS_MARKUP_TO_JSON_OPTIONS)` — the same options the Original
  tab uses, so the reference matches what that tab would produce.
- Empty source JSON clears the slice.
- Guards against out-of-order completion with a monotonic run id (an older
  in-flight round trip must not overwrite a newer result).

### Step 3 — Share the bpg conversion options

- File: `src/services/BitmarkConverter.tsx`
- Export `JS_MARKUP_TO_JSON_OPTIONS` and `JS_JSON_TO_MARKUP_OPTIONS` so the runner
  reuses them rather than restating them.

### Step 4 — Rewire the LED in `App.tsx`

- Compare `jsRoundTrip.json` against `wasm.json` via the unchanged
  `parserJsonMatch` util.
- Neutral when: either side has a `jsonError`, the round trip itself errored, or
  `jsRoundTrip.sourceJsonAsString !== js.jsonAsString` (reference is stale /
  still being computed).

### Step 5 — Tests

- `src/services/JsRoundTripRunner.test.tsx`: runs both conversions in order and
  stores the result; records the source JSON; stores the error when either
  conversion fails; clears on empty; no-op when bpg is not loaded.
- `src/utils/parserJsonMatch.test.ts`: unchanged (the util's contract is untouched).

## Risks

- Extra bpg work on every Original-JSON change (two conversions). Mitigated by the
  `lastJson` guard — it only runs when `js.jsonAsString` actually changes — and by
  the fact that bpg already runs several conversions per edit.
- The LED is briefly neutral while the async round trip is in flight. This is
  intentional (honest "not comparable yet") rather than showing a stale colour.
- If bpg's round trip drops something the Rust parser correctly emits, the LED now
  reports a mismatch in the opposite direction. Comparing both sides symmetrically
  was considered and explicitly rejected for this plan.

## Completion Criteria

- [x] LED reflects `jsRoundTrip.json` vs `wasm.json`, not `js.json` vs `wasm.json`
- [x] LED is neutral while the reference is stale or errored
- [x] `bun run test` passes
- [x] `bun run lint` passes (no new errors; pre-existing markdown errors in
      `CLAUDE.md` / `.claude/skills` are untouched)

## References

- Plan: .awa/plans/PLAN-009-wasm-check-match-led.md (superseded comparison inputs)
- Plan: .awa/plans/PLAN-006-wasm-check-panel.md (runner pattern, WASM Check tab)
- Code: src/utils/parserJsonMatch.ts, src/services/JsRoundTripRunner.tsx, src/App.tsx
