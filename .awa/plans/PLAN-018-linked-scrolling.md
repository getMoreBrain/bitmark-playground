# PLAN-018: Linked Scrolling Between the bitmark and Output Panes, by Bit

STATUS: in-progress
DIRECTION: bottom-up
TRACEABILITY: Builds on PLAN-002 (the two editor panes), PLAN-004 (settings persistence), PLAN-006/007/013 (the WASM Check, HTML and XML tabs), PLAN-017 (editor services: the source pattern). Uses parser PLAN-221 (bit spans): `convertWithDetails` `bitSpans` and `splitBits` `start` / `end`.

## Context

The top of the playground is two panes: the bitmark editor on the left, and
on the right whichever output tab is active (JSON, WASM Check, HTML, XML,
Text). On a document of any length the two drift apart: scroll to the tenth
bit on the left and the right still shows the first. The author has to find
the matching bit by hand, every time.

The bit is the unit both sides share: bit *n* of the bitmark is element *n* of
the JSON array, the *n*-th top-level element of the HTML and XML, and the
*n*-th span of the text. Linking the two panes' scrolling by bit keeps the same
bit in view on both sides, however differently the formats lay it out.
Leading junk, unknown bit types and comments still give a 1:1 bit count,
because junk and unknown bits become `_error` bits rather than being dropped.

## Decisions (agreed)

- Scope: the top two panes only. The bitmark editor ↔ the right pane's
  JSON, WASM Check, HTML, XML and Text tabs. The bottom Diff / Lexer / Info /
  Mappings panels keep scrolling on their own.
- Two-way. Whichever pane the user scrolls leads; the other follows.
- Switchable. A "Link scrolling" checkbox in the Settings menu, on by
  default and saved with the other settings.
- D1 — Positions come from whatever wrote the text, never from re-reading
  it:
  - bitmark editor and WASM Check: `splitBits(text)` `start` (UTF-16, the
    default encoding), computed from the pane's own text.
  - Text, HTML, XML: the `bitSpans` of the conversion that produced the text
    (`convertWithDetails(…, { bitSpans: true })`), each span's `start`.
    This lets the Text tab join.
  - JSON (every parser tab): the playground writes this text itself
    (`setJson`), so it records each bit's start as it writes.
- D2 — Parser versions without the PLAN-221 API are not supported. No
  fallbacks. A missing export only means "no positions" (the source stays
  unset), never an error.
- D3 — No scanners. The output panes can hold broken or half-typed text
  (JSON, HTML and XML are editable). Their positions are pinned as Monaco
  decorations, which Monaco moves through every edit, so broken text changes
  nothing. `splitBits` already tolerates broken bitmark.
- D4 — Positions live in the state beside the text they describe (for example
  `bitStarts` beside `html`), set in the same call. A pane pins them only when
  its editor shows exactly that text: after mount, and after each
  programmatic `setValue`. When the text differs (the pane had focus, so
  `MonacoTextArea` skipped the update), the pane keeps its current markers.
- Pairing is by position: bit *i* ↔ bit *i*, up to the shorter list.

## Design Notes

- Two kinds of pane.
  - *Split* panes (the bitmark editor, WASM Check): positions are
    `splitBits(getValue())`, recomputed when the model's `versionId`
    changes.
  - *Pinned* panes (JSON, HTML, XML, Text): positions are the current offsets
    of the pane's decorations. A decoration is an empty range with
    `NeverGrowsWhenTypingAtEdges` stickiness and no styling. Deleting a bit's
    text collapses its marker onto a neighbour; order is kept.
  - Either way the coordinator asks the pane for `bitStarts(): number[]`.
- JSON writer. `setJson` builds `jsonAsString` one bit at a time and records
  each element's start. The output must equal
  `JSON.stringify(json, undefined, 2)` exactly. A user edit (the raw-text
  setter) clears the recorded starts: they describe text that is no longer
  in the state.
- Conversion runners (Text, HTML, XML). The bitmark → X direction calls
  `convertWithDetails` instead of `convert`, and passes
  `bitSpans.spans.map(s => s.start)` to the state setter with the text.
  The X → bitmark direction is unchanged. An error result has no starts.
- Pixels from Monaco. At sync time each offset becomes a vertical pixel
  position with `getTopForPosition(line, column)`. That call already
  accounts for word wrap. The pixel positions are cached and dropped on
  `onDidContentSizeChange` / `onDidLayoutChange` and on content change.
- Piecewise-linear mapping. A pure function
  `mapScrollTop(srcKnots, dstKnots, scrollTop)` does the conversion:
  - Knots are paired `[0, bit tops…, maxScrollTop]`.
  - Only the first `min(nSrc, nDst)` bits are used.
  - Knots are clamped to `[0, maxScrollTop]` and forced to be
    non-decreasing, so bits near the end of a short document (and the
    zero-width Text spans of empty bits) collapse instead of breaking the
    mapping.
  - The top of the viewport is what gets synced: part-way through bit *i* on
    one side means the same fraction of the way through bit *i* on the other.
  - With no positions on one side (error text, markers lost, parser not
    loaded yet), only the end knots remain and the mapping falls back to
    proportional scrolling.
- A module-level coordinator. It follows the pattern of the highlighter and
  diagnostics: `attachScrollSync(editor, slot, bitStarts)` returns an
  `IDisposable`, and each pane calls it from `editorDidMount`.
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
  - its content or markers change (typing on the left rebuilds the JSON on
    the right);
  - it relayouts;
  - it has just mounted (a tab switch);
  - linking is switched back on.

  If no pane has led yet, the bitmark editor is the leader.
- Parser sources. The parser context exposes `splitBits` and
  `convertWithDetails` (on `BitmarkParserModule` and `IBitmarkParserContext`,
  in the same stage as `convert`). `EditorServicesRunner` installs
  `splitBits` with `setSplitBitsSource` beside the other sources, and clears
  it on unmount. The Original (JS parser) bitmark tab is split with the same
  WASM `splitBits`, since it only needs the text.
- The toggle is `uiState.linkScroll` (default `true`), persisted as
  settings v10 (a v9 → v10 migration adds the field). The coordinator reads
  the proxy at event time, the same way the runners read `bitmarkState`.

## Steps

- [ ] Step 1 — Parser context: add `splitBits` and `convertWithDetails` to `BitmarkParserModule` and `IBitmarkParserContext`. `setSplitBitsSource` in `EditorServicesRunner`.
- [ ] Step 2 — State: `bitStarts` beside the text in the Text, HTML and each XML slice, and in each parser's JSON slice. The JSON writer in `setJson` (D1, output identical to `JSON.stringify(…, 2)`); the raw-text setter clears them.
- [ ] Step 3 — Runners: `TextRunner`, `TableHtmlRunner`, `XmlRunner` call `convertWithDetails` for bitmark → X and store the span starts with the text.
- [ ] Step 4 — `src/scrollSync/bitMarkers.ts`: pin starts as decorations when the editor's text equals the state's text (D4); read their current offsets.
- [ ] Step 5 — `src/scrollSync/mapScrollTop.ts`: knot construction (pair to `min(n, m)`, clamp, non-decreasing) and the piecewise-linear interpolation.
- [ ] Step 6 — `src/scrollSync/scrollSync.ts`: the coordinator. It provides:
  - `attachScrollSync(editor, slot, bitStarts)` and `setSplitBitsSource`;
  - the `versionId` cache for split panes and the pixel-position cache;
  - echo suppression and the leader rules;
  - re-sync on follower content / marker change, relayout and mount;
  - a `uiState.linkScroll` check on every event, and a re-sync when it turns on.
- [ ] Step 7 — Wire the panes in `editorDidMount` / `editorWillUnmount`:
  - `BitmarkMarkupTextBox` → slot `bitmark`, split;
  - `WasmCheckPanel` → `output`, split;
  - `BitmarkJsonTextBox` (JSON tabs) → `output`, pinned;
  - `TableHtmlPanel`, `XmlPanel`, `TextPanel` → `output`, pinned.
- [ ] Step 8 — Toggle: `uiState.linkScroll` + `setLinkScroll`, a settings v9 → v10 migration with validation, persistence, and a "Link scrolling" checkbox in `SettingsMenu`.
- [ ] Step 9 — Point `@gmb/bitmark-parser` at the release that carries PLAN-221 (see Dependencies).

### Testing

- [ ] JSON writer: output identical to `JSON.stringify(json, undefined, 2)` (empty array, one bit, many bits, non-ASCII); `jsonAsString.slice(start)` begins with that bit's `{`.
- [ ] Runners: the stored starts equal the span starts, and are cleared on an error result.
- [ ] `bitMarkers`: pinned when the texts are equal, untouched when they differ; markers move with an insert before them; deleting a bit's text keeps the order.
- [ ] `mapScrollTop` properties: the end knots map to each other; bit *i*'s top maps to bit *i*'s top when neither is clamped; the mapping is monotonic; with no positions it is proportional; with unequal counts the extra bits are ignored; zero-width bits do not break it.
- [ ] Coordinator tests with a fake editor (the Monaco mock has no scroll or decoration API): the follower follows the leader; the echo does not bounce back; a user scroll on the follower makes it the leader; a follower content change re-syncs it; nothing happens with `linkScroll` off; turning it on re-syncs; dispose detaches.
- [ ] Settings: the v9 → v10 migration defaults `linkScroll` to `true`, and an invalid value is rejected. Also a `SettingsMenu` checkbox test.
- [ ] Verified in a real browser (headless Chromium over the dev server with `?engine=local`, driving the DOM only), with a document of about 30 bits, some long:
  - Scrolling the bitmark keeps the same bit at the top of the JSON, HTML, XML and Text tabs.
  - Scrolling the JSON pane drives the bitmark.
  - Typing in the bitmark keeps the JSON aligned.
  - Breaking the JSON / HTML mid-document (an unclosed string or tag) keeps the linking steady.
  - A tab switch lands on the matching bit.
  - Turning the toggle off unlinks the panes.
  - No console errors.

### Documentation

- [ ] ARCHITECTURE.md:
  - UI Layer responsibility: linked scrolling by bit;
  - a `src/scrollSync/` entry in the directory structure;
  - a change-log line.
- [ ] README: mention the Settings toggle, if the README lists settings.

## Risks

- Bit counts can differ, e.g. the Original (JS parser) JSON against the WASM
  `splitBits` of the same text. Mitigation: pair only the first `min(n, m)`
  bits. Past that point the mapping stays monotonic and just drifts to
  proportional scrolling.
- Markers can be lost, e.g. the user replaces a whole output pane's text.
  Mitigation: that pane scrolls proportionally until the next conversion
  rewrites it and re-pins.
- Echo detection relies on `setScrollTop` giving back the value it
  settled on. Monaco clamps and rounds the value. Mitigation: record the
  value read back with `getScrollTop()` after setting it, not the requested
  one. `smoothScrolling` is off in every editor here; if it is ever turned
  on, echoes arrive late and this needs a short time window instead.
- Cost on large documents. `splitBits` runs once per content version, spans
  come with the conversion, and `getTopForPosition` runs once per bit per
  layout, all cached. If a document with thousands of bits is slow, a binary
  search over the cached pixel positions keeps each scroll event O(log n).

## Dependencies

- Parser PLAN-221 (`convertWithDetails`, `splitBits` `start` / `end`). Until
  it is released, develop against the parser repo's build: `?engine=local`
  at run time, and `node_modules/@gmb/bitmark-parser` linked to
  `packages/bitmark-parser` for the types. Ship only after the release
  (Step 9).

## Completion Criteria

- [ ] `npx eslint src vite.config.ts`, `npx tsc --noEmit` and `npx vitest run` pass.
- [ ] `awa check` passes.
- [ ] Verified in a real browser (see Testing).
- [ ] With linking off, every pane scrolls exactly as before.

## Open Questions

- [x] Scope? — Top panes only (the bitmark editor ↔ the right-hand tabs).
- [x] Text tab? — Included: the parser's bit spans give it boundaries (D1).
- [x] Direction? — Two-way; the pane being scrolled leads.
- [x] Switchable? — A Settings toggle, on by default, persisted.
- [x] Branch base? — `main` (it now carries the editor services).
- [x] Where do positions come from? — From what wrote the text (D1).
- [x] Older parser versions? — Not supported (D2).
- [x] Broken JSON / HTML / XML? — Pinned markers that follow edits, no scanners (D3).
- [x] Where do positions live? — In the state beside their text (D4).
- [ ] Later, not in this plan: link the cursor as well as the scroll (moving the cursor into bit *n* reveals bit *n* on the other side).

## References

- Code:
  - src/App.tsx
  - src/components/bitmark/{BitmarkMarkupTextBox,BitmarkJsonTextBox,WasmCheckPanel,TableHtmlPanel,XmlPanel,TextPanel}.tsx
  - src/components/monaco/MonacoTextArea.tsx
  - src/services/{BitmarkParser,EditorServicesRunner,TextRunner,TableHtmlRunner,XmlRunner,settingsStorage,settingsPersistence}.ts(x)
  - src/state/{bitmarkState,uiState}.ts
  - src/components/generic/ui/SettingsMenu.tsx
- Pattern: src/monaco-bitmark/bitmarkDiagnostics.ts (attach-on-mount, and a module-level source installed by a runner)
- Parser API (PLAN-221): `convertWithDetails(input, { …, bitSpans: true })` → `{ output, bitSpans: { positionEncoding, spans: [{ index, start, end }] } }`; `splitBits(input)` → `{ index, start, end, byteStart, byteEnd, source }[]`
- Parser VS Code counterpart: parser PLAN-222 (placeholder)
