# PLAN-018: Linked Scrolling Between the bitmark and Output Panes, by Bit

STATUS: in-progress
DIRECTION: bottom-up
TRACEABILITY: Builds on PLAN-002 (the two editor panes), PLAN-004 (settings persistence), PLAN-006/007/013 (the WASM Check, HTML and XML tabs). Uses the parser's `splitBits` (published 7.0.0; present in the stage-1 `bitmark-json` engine).

## Context

The top of the playground is two panes: the bitmark editor on the left, and
on the right whichever output tab is active (JSON, WASM Check, HTML, XML,
Text). On a document of any length the two drift apart: scroll to the tenth
bit on the left and the right still shows the first. The author has to find
the matching bit by hand, every time.

The bit is the unit both sides share: bit *n* of the bitmark is element *n* of
the JSON array and the *n*-th top-level element of the HTML and XML. Linking
the two panes' scrolling by bit keeps the same bit in view on both sides,
however differently the formats lay it out. Checked against the parser
(7.0.0): leading junk, unknown bit types and comments all still give a 1:1
bit count across bitmark (`splitBits`), JSON, HTML and XML, because junk and
unknown bits become `_error` bits rather than being dropped.

## Decisions (agreed)

- Scope: the top two panes only. The bitmark editor ↔ the right pane's
  JSON, WASM Check, HTML and XML tabs. The bottom Diff / Lexer / Info /
  Mappings panels keep scrolling on their own.
- The Text tab is excluded. Its output has no bit boundaries, so there is
  nothing to link on. It neither leads nor follows.
- Two-way. Whichever pane the user scrolls leads; the other follows.
- Switchable. A "Link scrolling" checkbox in the Settings menu, on by
  default and saved with the other settings.

## Design Notes

- Anchors, not lines. Each linked pane describes its content as
  *anchors*: the UTF-16 offset in its own text where each bit starts. Bit
  index *i* on one side corresponds to bit index *i* on the other. Anchors
  are recomputed only when the model's `versionId` changes.
  - bitmark (the editor, and the WASM Check tab): `splitBits(text)`. It
    returns UTF-8 `byteStart`s, which are converted to UTF-16 offsets by
    walking the text once. Every slice counts as an anchor, including
    leading junk, because the JSON has an `_error` bit for it.
  - JSON: a small string- and escape-aware scanner finds each `{` at depth 1
    of the top-level array. Error text (an object, not an array) gives no
    anchors.
  - HTML / XML: the start of each top-level `<bitmark-bit` / `<bit` element.
    A depth count on that element name skips nested ones, and a self-closing
    `<bit …/>` (an empty `_error` bit) counts as one bit.
- Pixels from Monaco. At sync time each anchor offset becomes a vertical
  pixel position with `getTopForPosition(line, column)`. That call already
  accounts for word wrap, so it also handles a long XML bit that wraps across
  many screen lines. The pixel positions are cached and dropped on
  `onDidContentSizeChange` / `onDidLayoutChange`.
- Piecewise-linear mapping. A pure function
  `mapScrollTop(srcKnots, dstKnots, scrollTop)` does the conversion:
  - Knots are paired `[0, bit tops…, maxScrollTop]`.
  - Only the first `min(nSrc, nDst)` bits are used.
  - Knots are clamped to `[0, maxScrollTop]` and forced to be
    non-decreasing, so bits near the end of a short document collapse onto
    the end of the scroll range instead of breaking the mapping.
  - The top of the viewport is what gets synced: part-way through bit *i* on
    one side means the same fraction of the way through bit *i* on the other.
  - With no anchors on one side (error text, parser not loaded yet), only the
    end knots remain and the mapping falls back to proportional scrolling.
- A module-level coordinator. It follows the same pattern as the
  highlighter and diagnostics: `attachScrollSync(editor, slot, anchorsOf)`
  returns an `IDisposable`, and each pane calls it from `editorDidMount`.
  - There are two slots, `bitmark` and `output`. Only one editor holds each
    slot at a time, because only one right-hand tab is mounted.
  - The coordinator listens to `onDidScrollChange`, but only acts when
    `scrollTopChanged` is set.
- No feedback loop. When the coordinator scrolls the follower, it records
  the follower's resulting `getScrollTop()` as the value it expects. When
  that follower's own scroll event reports that value, the event is an echo
  of the sync and is dropped. Any other value is a real user scroll, and
  that pane becomes the leader.
- Re-sync when the follower changes. The follower is re-synced to the
  last leader's position when:
  - its content changes (typing on the left rebuilds the JSON on the right);
  - it relayouts;
  - it has just mounted (a tab switch);
  - linking is switched back on.

  If no pane has led yet, the bitmark editor is the leader.
- The `splitBits` source. Follows the highlighter pattern: the parser
  context exposes `splitBits`, a runner installs it as a module-level source
  once the parser loads, and it is cleared on unmount. Until then, bitmark
  panes have no anchors, so scrolling is proportional. The JS parser's
  bitmark tab is split with the same WASM `splitBits`, since it only needs
  the text.
- The toggle is `uiState.linkScroll` (default `true`), persisted as
  settings v10 (a v9 → v10 migration adds the field). The coordinator reads
  the proxy at event time, the same way the runners read `bitmarkState`.

## Steps

- [ ] Step 1 — `src/scrollSync/bitAnchors.ts`: `bitmarkAnchors(text, splitBits)` (byte → UTF-16), `jsonAnchors(text)`, `elementAnchors(text, tagName)`. Pure functions with no Monaco or parser import (`splitBits` is passed in).
- [ ] Step 2 — `src/scrollSync/mapScrollTop.ts`: knot construction (pair to `min(n, m)`, clamp, non-decreasing) and the piecewise-linear interpolation.
- [ ] Step 3 — `src/scrollSync/scrollSync.ts`: the coordinator. It provides:
  - `attachScrollSync(editor, slot, anchorsOf)` and `setSplitBitsSource`;
  - the `versionId` anchor cache and the pixel-position cache;
  - echo suppression and the leader rules;
  - re-sync on follower content change, relayout and mount;
  - a `uiState.linkScroll` check on every event, and a re-sync when it turns on.
- [ ] Step 4 — Parser context: add `splitBits` to `BitmarkParserModule` and `IBitmarkParserContext` (set in stage 1). Install it with `setSplitBitsSource` from `EditorServicesRunner`, beside the other sources.
- [ ] Step 5 — Wire the panes in `editorDidMount` / `editorWillUnmount`:
  - `BitmarkMarkupTextBox` → slot `bitmark`, bitmark anchors;
  - `BitmarkJsonTextBox` (JSON tabs) → `output`, JSON anchors;
  - `WasmCheckPanel` → `output`, bitmark anchors;
  - `TableHtmlPanel` → `output`, `bitmark-bit`;
  - `XmlPanel` → `output`, `bit`;
  - `TextPanel` is not attached.
- [ ] Step 6 — Toggle: `uiState.linkScroll` + `setLinkScroll`, a settings v9 → v10 migration with validation, persistence, and a "Link scrolling" checkbox in `SettingsMenu`.

### Testing

- [ ] `bitAnchors` tests:
  - non-ASCII text before a bit (the byte → UTF-16 offset conversion);
  - leading junk counted as a bit;
  - JSON strings containing `{`, `[`, `\"` and `\\`;
  - JSON error text gives no anchors;
  - nested `<bit>` not counted;
  - self-closing `<bit …/>` counted;
  - HTML output with one bit per line.
- [ ] `mapScrollTop` properties: the end knots map to each other; bit *i*'s top maps to bit *i*'s top when neither is clamped; the mapping is monotonic; with no anchors it is proportional; with unequal counts the extra bits are ignored.
- [ ] Coordinator tests with a fake editor (the Monaco mock has no scroll API): the follower follows the leader; the echo does not bounce back; a user scroll on the follower makes it the leader; a follower content change re-syncs it; nothing happens with `linkScroll` off; turning it on re-syncs; dispose detaches.
- [ ] Settings: the v9 → v10 migration defaults `linkScroll` to `true`, and an invalid value is rejected. Also a `SettingsMenu` checkbox test.
- [ ] Verified in a real browser (headless Chromium over the dev server, driving the DOM only), with a document of about 30 bits, some long:
  - Scrolling the bitmark keeps the same bit at the top of the JSON, HTML and XML tabs.
  - Scrolling the JSON pane drives the bitmark.
  - Typing in the bitmark keeps the JSON aligned.
  - A tab switch lands on the matching bit.
  - Text does not move.
  - Turning the toggle off unlinks the panes.
  - No console errors.

### Documentation

- [ ] ARCHITECTURE.md:
  - UI Layer responsibility: linked scrolling by bit;
  - a `src/scrollSync/` entry in the directory structure;
  - a change-log line.
- [ ] README: mention the Settings toggle, if the README lists settings.

## Risks

- Bit counts can differ. Seen so far:
  - the JS parser's (Original) bitmark or JSON against the WASM `splitBits` of the same text;
  - a hand-edited JSON pane mid-typing.

  Mitigation: pair only the first `min(n, m)` bits. Past that point the
  mapping stays monotonic and just drifts to proportional scrolling.
- Echo detection relies on `setScrollTop` giving back the value it
  settled on. Monaco clamps and rounds the value. Mitigation: record the
  value read back with `getScrollTop()` after setting it, not the requested
  one. `smoothScrolling` is off in every editor here; if it is ever turned
  on, echoes arrive late and this needs a short time window instead.
- Cost on large documents. `splitBits` runs once per content version,
  and `getTopForPosition` once per bit per layout, both cached. A document
  with thousands of bits should still be fine. If not, a binary search over
  the cached pixel positions keeps each scroll event O(log n).
- The published engine is 7.0.0 without the editor services. That makes
  no difference here: `splitBits` is in 7.0.0, so this feature does not
  depend on the unreleased parser.

## Completion Criteria

- [ ] `npx eslint src vite.config.ts`, `npx tsc --noEmit` and `npx vitest run` pass.
- [ ] `awa check` passes.
- [ ] Verified in a real browser (see Testing).
- [ ] With linking off, every pane scrolls exactly as before.

## Open Questions

- [x] Scope? — Top panes only (the bitmark editor ↔ the right-hand tabs).
- [x] Text tab? — Excluded.
- [x] Direction? — Two-way; the pane being scrolled leads.
- [x] Switchable? — A Settings toggle, on by default, persisted.
- [ ] Branch base: `main` (this uses only published 7.0.0 APIs, so it can ship on its own; recommended) or on top of `plan-196/editor-services` (Step 4 then sits beside the editor-services sources in `EditorServicesRunner`; on `main` a small `ScrollSyncRunner` does the same job)?
- [ ] Later, not in this plan: link the cursor as well as the scroll (moving the cursor into bit *n* reveals bit *n* on the other side), and a parser text output with bit boundaries so the Text tab could join.

## References

- Code:
  - src/App.tsx
  - src/components/bitmark/{BitmarkMarkupTextBox,BitmarkJsonTextBox,WasmCheckPanel,TableHtmlPanel,XmlPanel,TextPanel}.tsx
  - src/components/monaco/MonacoTextArea.tsx
  - src/services/{BitmarkParser,EditorServicesRunner,settingsStorage,settingsPersistence}.ts(x)
  - src/state/uiState.ts
  - src/components/generic/ui/SettingsMenu.tsx
- Pattern: src/monaco-bitmark/bitmarkDiagnostics.ts (attach-on-mount, and a module-level source installed by a runner)
- Parser API: `splitBits(input): BitSlice[]` — `{ index, byteStart, byteEnd, source }`
