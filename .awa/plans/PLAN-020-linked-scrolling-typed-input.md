# PLAN-020: Linked Scrolling for Typed JSON, HTML and XML

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: Builds on PLAN-018 (linked scrolling). Uses parser PLAN-223 (input bit spans: `BitSpan` is now `{ index, inputStart, inputEnd, outputStart, outputEnd }`).

## Context

PLAN-018 links the panes by bit, but a pane only has bit positions when the
playground wrote its text. JSON, HTML or XML the user types or pastes had
none (`setEditedJson` / `setEditedXml` / Flow A cleared them), so the panes
fell back to proportional scrolling between documents of very different
shapes. Pasting a 61-bit book's JSON left the bitmark pane with 61 positions
and the JSON pane with one, and the panes showed different bits.

Every edit of those panes is already converted to bitmark. Parser PLAN-223
makes that conversion report where each bit is in its INPUT, so the edited
pane's positions come from its own conversion: no scanner, and PLAN-018 D1
("positions come from whatever wrote — or read — the text") and D3 (pinned
markers move with the edits, so half-typed input changes nothing) hold as
they are.

## Decisions

- D1 — The edit's conversion runs through `convertWithBitStarts` and its
  `inputStarts` are pinned in the edited pane, as the output starts are
  pinned in the output panes (PLAN-018 D4: only while the pane shows exactly
  that text).
- D2 — A conversion that fails (half-typed input) pins nothing: the pane
  keeps its markers, which Monaco moves through the edits.
- D3 — JSON: where the bits are depends on the JSON only, so the WASM
  (optimized) run places them for whichever JSON tab was edited, the
  Original (bpg) tab included.
- D4 — The parser field rename (`start` → `outputStart`) lands here too; the
  playground needs a parser with PLAN-223. An older engine (e.g. 7.7.0, whose
  spans carry `start` / `end`) gives no positions rather than broken markers
  (PLAN-018 D2), as `splitBitStarts` already does for an engine without
  `start`.

## Steps

- [x] Step 1 — `convertWithBitStarts`: output starts from `outputStart`, and
  the input starts (`inputStart`) beside them.
- [x] Step 2 — JSON: the WASM (optimized) JSON → bitmark conversion returns
  the input starts (WASM (full) asks for none: they would be the same); `setEditedJsonBitStarts(tab, json, starts)` stores them for the
  edited tab when it still shows that JSON.
- [x] Step 3 — HTML and XML: `convertHtmlToBitmark` / `convertXmlToBitmark`
  return the input starts; `applyHtmlEdit` / `applyXmlEdit` store them with
  the typed text (`setTableHtml` / `setEditedXml`). The panels pass
  `convertWithDetails` through.

### Testing

- [x] `convertWithBitStarts` returns both starts; none from spans without
  them (an engine older than parser PLAN-223).
- [x] Typed JSON, in each JSON tab, gets the positions its conversion read;
  none when it does not convert; a stale result is ignored.
- [x] Typed HTML and XML get the positions their conversion read.
- [x] Browser (headless Chromium, DOM only; dev server with `?engine=local`
  against the published 0.10.0): a 40-bit document whose bits differ in
  shape (tag-heavy one-line headers, then many short paragraphs), pasted as
  4-space JSON or as HTML; page through either pane and compare the bit at
  the top of both. Published: up to 3 bits apart for JSON (Original and WASM
  tabs), up to 15 for HTML. Fixed: at most 1, at a bit boundary (the check
  reads the first fully visible line). A document whose bits all have the
  same shape does not show the bug: proportional scrolling then lands on the
  same bit.

## Completion Criteria

- [x] `npx eslint src vite.config.ts`, `npx tsc --noEmit` and `npx vitest run` pass.
- [x] Pasted JSON scrolls in step with its bitmark, by bit.

## Dependencies

- Parser PLAN-223, released. Until then the playground runs only with
  `?engine=local`: the published 7.7.0 engine has `start` / `end` and no
  input positions, so every pane would be unlinked.

## References

- Code: src/scrollSync/convertWithBitStarts.ts, src/services/{BitmarkConverter,TableHtmlRunner,XmlRunner}.tsx, src/components/bitmark/{TableHtmlPanel,XmlPanel}.tsx, src/state/bitmarkState.ts
