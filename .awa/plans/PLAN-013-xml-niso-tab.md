# PLAN-013: XML Tabs — NISO-STS XML ⇄ WASM Bitmark Sync

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: Extends PLAN-002 (parser tab bar, BitmarkState slices, dual converter), PLAN-007 (editable bidirectional panel + renderless runner + loop prevention) and PLAN-011 (WASM-driven derived tab). Uses the WASM parser (`@gmb/bitmark-parser`), not `bitmarkParserGenerator`.

---

## Goal

Add `XML (NISO-IEC)` and `XML (NISO-IEC-ES)` tabs as the last tabs on the JSON editor's tab bar, each hosting an **editable** Monaco editor in `xml` language mode. Each bidirectionally syncs a NISO-STS XML document with the `WASM` bitmark via one of the parser's config-driven XML mappings.

The two variants are identical in every respect except the mapping id, so the slice, runner and panel are **parameterised by `XmlVariant`** rather than duplicated.

## Scope

- TWO new tabs, JSON (top-right) bar only, one per XML mapping variant.
- Generating XML from the `WASM` bitmark is the only new generation path. Every other pane already updates via the existing round-trip convention (PLAN-008) and is unchanged.
- No new left-panel tab.

## Tab Layout

| Tab bar | Tabs |
|---------|------|
| Bitmark (top left) | `Original` \| `WASM` \| `WASM (full)` (unchanged) |
| JSON (top right) | `Original` \| `WASM` \| `WASM (full)` \| `WASM Check` \| `Table (HTML)` \| `Text` \| `XML (NISO-IEC)` \| `XML (NISO-IEC-ES)` ← new last tabs |

## Conversion API

`xml-niso-iec` and `xml-niso-iec-es` are config-driven mapping ids accepted by `convert` in **both** directions (both verified against the browser bundle at 6.6.0):

- `bitmark → XML` — `convert(markup, { inputFormat: 'bitmark', outputFormat: <mappingId> })`
- `XML → bitmark` — `convert(xml, { inputFormat: <mappingId>, outputFormat: 'bitmark' })`

NOTE: on every sample tried (article, table, cloze, interview, multiple-choice), the two mappings emit **byte-identical** output. They are distinct registered mappings, not aliases, so they are wired as separate tabs; any divergence is content-dependent and will simply show up.

The published `OutputFormat` type is narrower than the runtime (`bitmark | json | text` only), so the output direction needs a documented cast. `InputFormat` already admits mapping ids via `(string & {})`.

`convert` reports failures by returning an `error: …`-prefixed string rather than throwing, so both directions go through `throwIfParserError` (see the 6.3.0 migration).

## Data Flow

```
Flow A — user edits XML (NISO-IEC):
  xmlNiso.xml ──convert(in: xml-niso-iec)──► bitmark ──► markupToJson('wasm', bitmark)
                                                            ├─► all other panes (existing convention)
                                                            └─► (suppress Flow B for this self-induced markup change)

Flow B — WASM bitmark changes by ANY method:
  wasm.markup ──convert(in: bitmark, out: <mappingId>)──► <variant>.xml   (SKIP only for the variant the edit came from)
```

### Loop prevention

Identical to PLAN-007: `convertXmlToBitmark` pre-seeds the module-level `lastWasmMarkup` dedupe with the bitmark it produced, so the `markupToJson('wasm', …)` write does not bounce back and clobber the XML being edited.

The XML is generated from `wasm.markup` (bitmark → XML), NOT from the WASM parser's JSON. Deriving via JSON was tried and reverted: the two paths are not equivalent — round-tripping through JSON loses unknown properties (`[@author:me]` disappears) and alters table body text (`| a |` → `|^ a |`) — so bitmark → XML is the higher-fidelity source.

Suppression is per variant: `lastWasmMarkup` doubles as the guard, and Flow A pre-seeds ONLY the edited variant with the bitmark it produced. Every other variant regenerates, because it is a different mapping of the same document and would otherwise show stale XML.

## Steps

- [x] Step 1 — Extend `bitmarkState` with `xmlNiso` + `xmlNisoEs` (`XmlSlice`, `createXmlSlice`, `setXml(variant, …)`, `XmlVariant`, `JsonTabType`).
- [x] Step 2 — `XmlRunner` (Flow B: WASM bitmark → XML), parameterised by variant, with per-variant dedupe + all-variant pre-seed guard.
- [x] Step 3 — `XmlPanel` (editable XML editor + Flow A), variant-parameterised, errors surfaced inside the editor.
- [x] Step 4 — Add both tabs to `ParserTabBar` (`showXmlNiso`/`xmlNisoDuration`, `showXmlNisoEs`/`xmlNisoEsDuration`).
- [x] Step 5 — Render the panel in `BitmarkJsonTextBox` when `activeJsonTab` is either XML variant.
- [x] Step 6 — Wire into `App.tsx` (mount one runner per variant, tab props, markup-side tab guard).
- [x] Step 7 — Settings persistence v5 → v6 (`'xmlNiso'`) and v6 → v7 (`'xmlNisoEs'`).
- [x] Step 8 — Tests (runner, panel, tab bar, json text box, settings) + vitest `xml.contribution` stub.

## Functional Requirements

- F1: Both XML tabs appear only on the JSON bar, after `Text`.
- F2: Editing/pasting XML converts XML→bitmark, sets it as `WASM` bitmark, and propagates to every other pane.
- F3: When the WASM bitmark changes by any method, every XML tab is refreshed via bitmark→XML — including the sibling variant when the change originated in the other XML tab.
- F4: The WASM→XML refresh is suppressed when the change originated from the XML tab (no feedback loop).
- F5: The editor is editable with `xml` syntax highlighting.
- F6: Conversion errors (either direction, including `error:` strings) are surfaced in the editor without crashing.
- F9: Generation times are attributed to the tab whose content was generated: bitmark → XML on the XML tab, XML → bitmark on the WASM bitmark tab. A user edit never records a duration against the tab being typed into.
- F10: The XML is syntax highlighted regardless of document size.
- F7: The selected tab persists across reloads (`activeJsonTab`, v7).
- F8: Bitmark (top-left) bar remains three tabs.

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| `OutputFormat` type excludes mapping ids | Single documented cast in `XmlNisoRunner`; remove once published types admit mapping ids |
| `convert` returns `error:` strings instead of throwing | Both directions wrapped in `throwIfParserError` |
| Feedback loop XML→bitmark→XML clobbers user edits | Per-variant `lastWasmMarkup` guard, pre-seeded only for the edited variant (mutation-tested in both directions, with single-runner tests so the assertion cannot be masked by subscriber ordering) |
| Deriving the XML from the parser JSON instead of the bitmark | Tried and reverted — measurably lossy (unknown properties dropped, table body text altered) |
| The two mappings emit identical output on all sampled content | Wired as separate tabs regardless — they are distinct registered mappings; divergence is content-dependent |
| XML → bitmark duration attributed to the XML tab (it measures the BITMARK's generation) | `applyXmlEdit` records it via `setMarkup('wasm', …)`; `setEditedXml` stores user input without touching the XML tab's duration (mutation-tested) |
| Parser emits the document as ONE line; Monaco stops tokenizing lines > 20,000 chars, silently dropping syntax highlighting | `maxTokenizationLineLength` raised on the XML editor |
| Runtime loaded from CDN `latest` may predate `xml-niso-iec` | Conversion errors surface in the editor (F6) rather than crashing; mapping added in 6.6.0 |
| Monaco `xml.contribution` greedily aliased in tests | Explicit vitest alias stub, as for `html.contribution` |

## Out of Scope

- A left-panel (bitmark side) XML tab.
- Diffing XML output against anything.
