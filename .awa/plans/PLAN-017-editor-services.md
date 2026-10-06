# PLAN-017: Editor Services — Diagnostics, Completion and Hover from the WASM Parser

STATUS: in-progress  <!-- Steps 1-8, 9, 10 done; Step 11 (ARCHITECTURE, version, port to main) waits on the parser release -->
DIRECTION: bottom-up
TRACEABILITY: Builds on PLAN-016 (highlighting from the parser's semantic tokens). Requires the parser release that carries the editor services (bitmark-parser PLAN-196, contract `API-EDT-editor-services.tsp`); until then, `?engine=local`.

## Context

PLAN-016 made the bitmark editor's COLOURS come from the parser. Everything
else an editor gives an author still did not: no error markers, no
auto-complete, no documentation. The parser has always known all of it — it
validates every bit against `bitmark.json`, and its `info` model describes
every tag — but only ever said so inside converted JSON.

The parser now exposes the three as LSP 3.17 shapes: `diagnostics()`,
`complete()` and `hover()`. This plan is their demo: the playground becomes a
real bitmark editor, and the parser's language-service claim is shown to work
end to end.

## Design Notes

- *LSP shapes, one small mapping.* The parser returns LSP `Diagnostic`,
  `CompletionList` and `Hover` verbatim, so the work here is only what
  Monaco's own editor API numbers differently: `MarkerSeverity` and
  `CompletionItemKind`. Both mappings are a `switch` each, with tests.
- *Two Monaco contributions.* The app aliases `monaco-editor` to
  `editor.api`, which carries the API but none of the editor's feature
  contributions: a registered completion or hover provider is simply never
  asked, because neither the suggest widget nor the hover controller exists.
  `monaco-setup.ts` imports exactly two — `suggest/browser/suggestController`
  and `hover/browser/hoverContribution` — rather than `editor.main`, which
  would pull in every contribution and every language. Found in the browser:
  the providers were registered and answering nothing until they were added.
- *Same pattern as the highlighter.* Each service is a module in
  `src/monaco-bitmark/` with a module-level source that
  `EditorServicesRunner` installs when the parser context reports success,
  and clears on unmount. Editors attach the per-model pieces (markers) on
  mount; the document-level providers (completion, hover) are registered once
  in `monaco-setup.ts` and answer only once a source is installed.
- *Optional by construction.* The three are optional members of the loaded
  module, so an OLDER engine (the CDN's `latest` before the release lands)
  simply leaves the editor without markers, completion or hover — nothing
  throws, nothing is registered twice.
- *What a completion item replaces.* Monaco needs a range, and its word
  rules cannot express bitmark labels (`@id`, `►`, `====`). The rule here is
  label-driven: replace the longest suffix of the text before the cursor that
  is a prefix of the label. `[.art` → `article` replaces `art`; `[@i` →
  `@id` replaces `@i`; `==x==|bo` → `bold` replaces `bo`.
- *The JSON pane too.* The parser publishes a JSON Schema of its own output
  beside the engine. Binding it to Monaco's JSON language service gives that
  pane validation, completion and hover with no parser call — and from the
  same version as the engine, since the schema URL is derived from the engine
  URL.
- *Driving an unreleased parser (`?engine=local`).* The playground is a
  submodule of the parser repo, so the dev server can serve
  `packages/bitmark-parser/dist/browser` at `/local-engine` (a small Vite
  plugin, dev only). `main` always loads the published engine; this branch is
  how a parser change is tried before it ships.

## Steps

- [x] Step 1 — `bitmarkEditorTypes.ts` (the LSP shapes, declared locally so this branch type-checks against the published parser) and `bitmarkDiagnostics.ts`: severity mapping, `buildBitmarkMarkers`, `attachBitmarkDiagnostics` (debounced per editor), `setBitmarkDiagnosticsSource`.
- [x] Step 2 — `bitmarkCompletion.ts` and `bitmarkHover.ts`: kind mapping, the replaced-prefix rule, the two providers and their sources; `EditorServicesRunner` installs all three from the parser context.
- [x] Step 3 — `BitmarkMarkupTextBox` attaches diagnostics on mount and disposes on unmount, beside the highlighter.
- [x] Step 4 — `monaco-setup.ts` registers the completion and hover providers before any editor mounts.
- [x] Step 5 — `bitmarkJsonSchema.ts`: fetch the schema published beside the loaded engine and bind it to Monaco's JSON language service; failure leaves the JSON pane checking syntax only.
- [x] Step 6 — `?engine=local`: `engineUrl()` in the parser service, and the `localEngine` Vite plugin serving the sibling parser build (and its schema) at `/local-engine`.
- [x] Step 7 — Tests: markers, kind mapping, the replaced-prefix rule, hover conversion, the schema binding, the runner, `engineUrl`.
- [x] Step 8 — Verified in a real browser (headless Chromium over the dev server, `?engine=local`, driving the DOM only): squiggles for an unknown property, an unpaired mark and an unknown bit type (1 error / 2 warnings / 1 info); the marker's own hover carrying the message and the parser's code (`bitmark(unknown-property)`); completion inside a `[.cloze]` tag listing that bit's tags with their format and effective count (`@revealSolutions boolean · 0..1`, `@id string · 0..∞`, …); completion in a header listing bit types with their titles (`article Article`, `article-ai AI Article`, …); hover on `[@id:5]` showing format, count, default and JSON key. No console errors. The completion answer itself proves the LOCAL engine served the page — the published 7.0.0 has no `complete` export.
- [ ] Step 11 — ARCHITECTURE.md, version bump; port onto `main` (which keeps loading the published engine) once the parser release is out.
- [x] Step 9 — Lazy documentation (parser PLAN-202): the parser's `complete` no longer ships `documentation`; the provider remembers each suggestion's query and item (`BitmarkSuggestion.bitmark`) and Monaco's `resolveCompletionItem` asks the parser's `resolve` for the one item about to be shown (`resolveMonacoSuggestion`; a parser without `resolve`, a suggestion without its query, or a failure leaves the suggestion as it is). `EditorServicesRunner` installs the fourth source.
- [x] Step 10 — Completion as an editor uses it (parser PLAN-203): `quickSuggestions` off for the bitmark editor (the list opens on trigger characters and Ctrl+Space); the provider passes Monaco's `triggerCharacter` on (`triggerCharacterOf`) so a `.` typed in prose answers nothing; the engine loads in two stages — `bitmark-json` first so the editor is live sooner, then `full` in the background (`markupReady` gates the markup panels; `info` arrives with it) so bit and tag descriptions show; the theme styles the parser's four inline-mark modifiers (`bold`, `italic`, `highlight`, `light`).

## Functional Requirements

- F1: The bitmark editor shows the parser's issues as Monaco markers — error, warning and info — with the parser's stable `code` on each, refreshed within the debounce after an edit.
- F2: Typing in the bitmark editor offers what the parser says is valid there: bit types in a header, the scope's tags, a tag's values, a chain's children, the inline attribute keys, and the structural lines a card set allows.
- F3: Hovering a construct shows the parser's Markdown for it — for a tag, the same facts `info` reports for that tag in that scope — and nothing on body text.
- F4: The JSON pane validates against the JSON Schema published by the SAME parser version the page loaded.
- F5: An engine without the editor services (an older CDN `latest`) leaves the editor exactly as PLAN-016 left it.
- F6: `?engine=local` drives this checkout's parser build; without it the published engine is loaded, as before.

## Risks

- The three services are unreleased while this branch lives: `main` must not
  merge it until the parser release is out, or the demo is dead code against
  the CDN engine. Mitigated by F5 — it degrades rather than breaks.
- The JSON schema is bound with `fileMatch: ['*']`, so it applies to every
  JSON model in the app. Both JSON models today (the bit-JSON pane, the JSON
  diff) hold bitmark documents, so that is correct; a future JSON panel with
  a different shape would need a model-specific match.
- Completion asks the parser on every keystroke that Monaco forwards. The
  parser answers in well under a millisecond on a document of playground
  size; a very large document may need the same debounce the highlighter has.

## Completion Criteria

- [x] `npx eslint src vite.config.ts`, `npx tsc --noEmit`, `npx vitest run` pass (275 tests).
- [x] Verified in a real browser (Step 8).
- [ ] Ported onto `main` after the parser release.

## References

- Plan: .awa/plans/PLAN-016-semantic-token-highlighting.md
- Parser plan: bitmark-parser `.zen/plans/PLAN-196-editor-services.md`
- Parser contract: bitmark-parser `.zen/specs/API-EDT-editor-services.tsp`
- Code: src/monaco-bitmark/bitmark{Diagnostics,Completion,Hover,JsonSchema,EditorTypes}.ts, src/services/EditorServicesRunner.tsx, src/services/BitmarkParser.tsx, vite.config.ts
