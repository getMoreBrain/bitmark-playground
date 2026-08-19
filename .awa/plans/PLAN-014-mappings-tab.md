# PLAN-014: Mappings Tab — Mapping Report for the Last Edited Window

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: Extends PLAN-003/PLAN-005 (bottom output panels), PLAN-007 (Table (HTML) tab) and PLAN-013 (XML tabs). Requires `@gmb/bitmark-parser` 6.7.0 for `mappingReport`.

---

## Goal

Add a `Mappings` tab to the **bottom-left** output panel showing the parser's human-readable MAPPING REPORT for the window the user last edited, and move the HTML tab off `bitmark-parser-generator` onto the WASM parser.

## Report Direction

The report is `convert(content, { inputFormat, outputFormat, mappingReport: true })`. The target format per source window:

| Last edited window | inputFormat | reported into |
|---|---|---|
| XML (NISO-IEC) | `xml-niso-iec` | `bitmark` |
| XML (NISO-IEC-ES) | `xml-niso-iec-es` | `bitmark` |
| HTML | `html` | `bitmark` |
| bitmark (Original / WASM / WASM full) | `bitmark` | `json` |
| JSON (Original / WASM / WASM full) | `json` | `bitmark` |

Everything that is not already bitmark reports its mapping INTO bitmark — that is where import losses (`NOT MAPPED`) show up. Bitmark has nothing to import from, so it reports the other way, into JSON.

## Tracking "the last window changed"

Recorded at the **UI entry points** (each editor's `onInput`), NOT inside `BitmarkConverter`: `markupToJson` is also called programmatically by the XML and HTML panels, and would otherwise report those edits as bitmark edits.

There are **nine editable windows** (3 bitmark + 3 JSON + 2 XML + 1 HTML), recorded by **four** code paths — three of them parameterised over their tabs:

| Path | Windows covered |
|---|---|
| `BitmarkMarkupTextBox` | Original / WASM / WASM (full) bitmark (3) |
| `BitmarkJsonTextBox` | Original / WASM / WASM (full) JSON (3) |
| `applyXmlEdit` | XML (NISO-IEC), XML (NISO-IEC-ES) (2) |
| `applyHtmlEdit` | HTML (1) |

Each writes `bitmarkState.setLastEdit(inputFormat, content, label)`.

The runner keys off `lastEdit.updates`, not the content value: editing a window back to a previous value is still an edit whose report should refresh.

## HTML on the WASM parser

The Table (HTML) tab previously used `bitmark-parser-generator`'s `convertHtmlTable`, which extracted bare `<table>` fragments. It now uses the WASM parser's config-driven `html` mapping:

- `bitmark → HTML` — `convert(markup, { inputFormat: 'bitmark', outputFormat: 'html' })`
- `HTML → bitmark` — `convert(html, { inputFormat: 'html', outputFormat: 'bitmark' })`

**Consequence:** the tab now shows the WHOLE document as `<bitmark-bit>` envelope HTML, not just its tables. The parser's own bpg-compat `legacy.BitmarkParserGenerator.convertHtmlTable` was evaluated as a drop-in and rejected — it silently returns an empty `[.table-extended]` and an empty string on the way back (see the `wasm-parser-converthtmltable-broken` note). The core mapping is the only working route.

This also deletes the `ensureHtmlTableGlobals()` shim that worked around the bpg browser bundle's minification bug.

## Steps

- [x] Step 1 — `LastEditSlice` + `MappingsSlice` + `setLastEdit` / `setMappings`; `TAB_LABEL`.
- [x] Step 2 — `MappingsRunner`: report for the last edit, direction from `reportTargetFor`.
- [x] Step 3 — Record the edited window at the four editor entry points.
- [x] Step 4 — Move the HTML tab onto the WASM parser (`applyHtmlEdit`, `convertHtmlToBitmark`).
- [x] Step 5 — `Mappings` tab in `OutputPanel` (opt-in, bottom-left only); settings v7 → v8.
- [x] Step 6 — Tests (runner, direction table, nine-window coverage, OutputPanel tab, HTML runner, settings).
- [x] Step 7 — Rename the HTML tab to `HTML` and move it after `Text` on the JSON bar.

## Functional Requirements

- F1: `Mappings` appears only on the bottom-LEFT output panel, after `Diff` and `Lexer`.
- F2: It shows the mapping report for the last edited window, in the direction above, with a header naming the window and direction.
- F3: The report refreshes on every edit, including re-editing to a previous value.
- F4: `error:` strings from `convert` surface as errors, never as report content.
- F5: The HTML tab converts in both directions via the WASM parser.
- F6: HTML → bitmark duration is recorded against the Original bitmark tab (as PLAN-013 does for XML).
- F7: The selected output tab persists across reloads (v8).

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Programmatic `markupToJson` calls misattributed as bitmark edits | `setLastEdit` is called at the UI entry points only, never inside the converter |
| `mappingReport` / `html` not in the published `OutputFormat` type | Same documented cast as the XML mappings |
| WASM `convertHtmlTable` looked like a drop-in but silently drops content | Rejected after direct verification; core html mapping used instead |
| HTML tab semantics changed (whole document, not just tables) | Tab renamed from "Table (HTML)" to "HTML" and moved after "Text" (Step 7) |

## Out of Scope

- A Mappings tab on the bottom-right panel.
- Reporting a window other than the last edited one.
