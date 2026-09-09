# PLAN-016: Bitmark Highlighting from the WASM Parser's Semantic Tokens

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: Replaces the tree-sitter highlighter introduced in PLAN-002. Requires `@gmb/bitmark-parser` 7.0.0 for `semanticTokens` (LSP layout).

## Context

Bitmark syntax highlighting has been driven by a hand-maintained tree-sitter
grammar (`src/monaco-tree-sitter/`, `src/tree-sitter-bitmark.wasm`) that
drifts from the real parser. `@gmb/bitmark-parser` 7.0.0 exposes
`semanticTokens(input)`: parser-derived highlighting in the LSP semantic-tokens
shape (legend + relative `data`, UTF-16 columns), guaranteed to agree with the
JSON the same input produces.

Drop tree-sitter and apply the parser's tokens to the editors instead.

## Design Notes

- The tokens are applied directly as Monaco inline decorations
  (`editor.createDecorationsCollection`), one per token, using the parser's
  `absolute` layout (0-based line / UTF-16 column, converted to Monaco's
  1-based ranges). Each editor re-tokenizes the whole document on content
  change behind a 15 ms debounce, matching the previous tree-sitter
  highlighter's responsiveness.
- Monaco's built-in semantic tokens feature
  (`registerDocumentSemanticTokensProvider`) was tried first and rejected: it
  schedules every request at least 300 ms after an edit and its adaptive
  debounce only grows from there, so typed text stays uncoloured noticeably
  longer than before. The parser itself answers in well under a millisecond.
- Colours are CSS classes (`bm-tok-<type>`, plus `bm-mod-comment` /
  `bm-mod-unclosed`) injected once as a stylesheet; the colour table is typed
  against the parser's `SemanticTokenType`. Editors keep the `vs-dark` theme.
- The parser is CDN-loaded, so the highlighting source is installed once the
  parser context reports success; every attached editor re-highlights at that
  moment, and again whenever its content changes.

## Steps

- [x] Step 1 — `src/monaco-bitmark/bitmarkTheme.ts`: token-type colour table (typed against the parser's `SemanticTokenType`), `comment` / `unclosed` modifier styles, generated stylesheet and class names.
- [x] Step 2 — `src/monaco-bitmark/bitmarkLanguage.ts`: language registration + stylesheet injection, `buildBitmarkDecorations`, `attachBitmarkHighlighter` (debounced per-editor decorations), `setBitmarkSemanticTokensSource`.
- [x] Step 3 — Expose `semanticTokens` through the `BitmarkParser` context.
- [x] Step 4 — `SemanticTokensRunner`: sync the context's `semanticTokens` into the Monaco provider; mount in `App`.
- [x] Step 5 — Editors: `BitmarkMarkupTextBox`, `WasmCheckPanel` and `DiffPanel` (both sub-editors, bitmark only) attach a highlighter on mount and dispose it on unmount; `monaco-setup.ts` registers the language and stylesheet.
- [x] Step 6 — Remove tree-sitter: `src/monaco-tree-sitter/`, `src/tree-sitter-bitmark.wasm`, `web-tree-sitter` / `tree-sitter-cpp` dependencies, tree-sitter init in `index.tsx`, `.wasm` asset config.
- [x] Step 7 — Tests (provider, theme rules, runner, editor theme/options), ARCHITECTURE.md, version 0.8.0.

## Functional Requirements

- F1: Bitmark editors (markup editor, WASM check panel, bitmark diff panel) are highlighted from the WASM parser's semantic tokens.
- F2: Highlighting appears once the parser has loaded and follows edits within the 15 ms debounce, as the tree-sitter highlighter did.
- F3: Commented-out bits and unclosed-mark notices are visually distinct.
- F4: No tree-sitter code, grammar, WASM or dependency remains.

## Risks

- The parser is CDN-loaded (`latest`); a future variant without `semantic-tokens` would make provider registration throw — mitigated by catching and leaving the editor unhighlighted.
- New token types appended to the legend by a newer parser fall back to the theme's default foreground until the colour table is extended.

## Completion Criteria

- [x] `bun run lint`, `bunx tsc --noEmit`, `bun run test`, `bun run build` pass.
- [x] Highlighting verified in a real browser against the CDN parser (headless Chromium over `vite preview`: sigils, bit type, marks, tags and an unclosed mark all coloured; no console errors).

## References

- Plan: .awa/plans/PLAN-002-dual-parser-integration.md
- Code: src/monaco-bitmark/bitmarkLanguage.ts, src/monaco-bitmark/bitmarkTheme.ts, src/services/SemanticTokensRunner.tsx, src/monaco-setup.ts
- Parser docs: node_modules/@gmb/bitmark-parser/README.md (`semanticTokens`)
