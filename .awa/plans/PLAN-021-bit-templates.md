# PLAN-021: Bit Templates in Completion

STATUS: completed
DIRECTION: bottom-up
TRACEABILITY: Builds on PLAN-017 (editor services). Uses parser PLAN-225 (bit templates: `complete(…, { bitTemplate: true })` makes a bit-type item insert the bit's normal template as a snippet, from the name onward).

## Context

Choosing a bit type after `[.` inserted the name alone; the author then had
to know which tags the bit usually carries. The parser now renders a
template per bit — the tags the config flags as usual, the body and the
card structure — and offers it as the bit-type item's snippet when asked
(parser PLAN-225 D9). The parser leaves two things to the editor: asking
for it, and the replacement range, since the editor may have auto-closed
the `]` after the cursor.

## Decisions

- D1 — Always on. The playground exists to explore bitmark, so every
  completion query carries `bitTemplate: true` (`COMPLETE_OPTIONS`); no
  setting. VS Code's extension carries the opt-out for daily editing.
- D2 — The replaced-suffix rule: a bit-type (`Class`) snippet whose insert
  text carries a `]` also replaces a `]` immediately after the cursor
  (`replacedSuffixLength`), so an auto-closed bracket is not doubled. The
  provider reads the rest of the line for it, as it reads the line before
  the cursor for the prefix rule.
- D3 — `resolve` stays as it is: it finds the item by label and kind, and
  the documentation does not depend on the insert text.
- D4 — The language declares its bracket pair (`BITMARK_LANGUAGE_CONFIGURATION`,
  the VS Code extension's `language-configuration.json` verbatim): Monaco
  only auto-closes what a language declares, and bitmark had declared
  nothing, so `[` never closed. Now `[.` yields `[.]`, and D2's rule is what
  keeps a template from doubling the `]`.

## Steps

- Step 1 — `COMPLETE_OPTIONS`, `replacedSuffixLength`, the provider's
  `lineAfterCursor`; `CompleteSource` options gain `bitTemplate`. Tests in
  `bitmarkCompletion.test.ts`.
- Step 2 — Parser `^7.8.1` (the first release with templates); README.
- Step 3 — The language configuration (D4) and its test.

## References

- Moved (PLAN-023 Step 14a): the editor services are now the editor
  package's: packages/bitmark-editor/src/monaco/{completion,setup}.ts
  (`COMPLETE_OPTIONS`, `replacedSuffixLength`,
  `BITMARK_LANGUAGE_CONFIGURATION`).
