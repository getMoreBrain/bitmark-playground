// @awa-component: PLAN-017-BitmarkCompletion
import * as monaco from 'monaco-editor';

import { log } from '../logging/log';
import { BitmarkCompletionItem, CompleteSource, LspCompletionKind } from './bitmarkEditorTypes';
import { BITMARK_LANGUAGE_ID } from './bitmarkLanguage';

/**
 * Characters that should open the suggestion list. `[` opens a tag or a bit
 * header, `.` `@` `&` name what follows it, `:` a value, `|` an inline
 * attribute chain, `=` and `-` the structural lines.
 */
export const COMPLETION_TRIGGER_CHARACTERS = ['[', '.', '@', '&', ':', '|', '=', '-'];

/** LSP `CompletionItemKind` → Monaco's own (differently numbered) enum. */
export const monacoKind = (kind: number): monaco.languages.CompletionItemKind => {
  const K = monaco.languages.CompletionItemKind;
  switch (kind) {
    case LspCompletionKind.Class:
      return K.Class;
    case LspCompletionKind.Value:
      return K.Value;
    case LspCompletionKind.Keyword:
      return K.Keyword;
    case LspCompletionKind.Snippet:
      return K.Snippet;
    case LspCompletionKind.EnumMember:
      return K.EnumMember;
    case LspCompletionKind.TypeParameter:
      return K.TypeParameter;
    default:
      return K.Property;
  }
};

/**
 * The text an item replaces: the longest suffix of what was typed before the
 * cursor that is also a prefix of the label, case-insensitively.
 *
 * Monaco's word rules cannot express bitmark's labels — they carry sigils
 * (`@id`, `►`) and the structural ones are punctuation (`====`) — and the
 * text before the cursor may hold syntax the label repeats (`[.art` →
 * `article`) or does not (`[@i` → `@id`). Matching label against typed text
 * settles both without a word definition.
 */
export const replacedPrefixLength = (before: string, label: string): number => {
  const typed = before.slice(Math.max(0, before.length - label.length));
  const lower = label.toLowerCase();
  for (let i = 0; i < typed.length; i++) {
    const candidate = typed.slice(i);
    if (lower.startsWith(candidate.toLowerCase())) return candidate.length;
  }
  return 0;
};

/** One parser item as a Monaco suggestion, anchored at `position`. */
export const toMonacoSuggestion = (
  item: BitmarkCompletionItem,
  position: monaco.IPosition,
  lineBeforeCursor: string,
): monaco.languages.CompletionItem => {
  const replaced = replacedPrefixLength(lineBeforeCursor, item.label);
  return {
    label: item.label,
    kind: monacoKind(item.kind),
    detail: item.detail,
    documentation: item.documentation
      ? { value: item.documentation.value, isTrusted: false }
      : undefined,
    tags: item.tags?.includes(1) ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
    preselect: item.preselect,
    sortText: item.sortText,
    insertText: item.insertText,
    filterText: item.label,
    range: {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - replaced,
      endColumn: position.column,
    },
  };
};

let source: CompleteSource | undefined;

/** Install (or, with `undefined`, remove) the parser's `complete`. */
export const setBitmarkCompleteSource = (next: CompleteSource | undefined): void => {
  source = next;
};

let registered: monaco.IDisposable | undefined;

/**
 * Register the bitmark completion provider (idempotent). It asks the parser
 * what is valid at the cursor and hands the answer to Monaco; the parser
 * returns every candidate for the context and Monaco filters by what was
 * typed.
 */
export const registerBitmarkCompletion = (): void => {
  if (registered) return;
  registered = monaco.languages.registerCompletionItemProvider(BITMARK_LANGUAGE_ID, {
    triggerCharacters: COMPLETION_TRIGGER_CHARACTERS,
    provideCompletionItems: (model, position) => {
      if (!source) return { suggestions: [] };
      try {
        const list = source(model.getValue(), {
          line: position.lineNumber - 1,
          character: position.column - 1,
        });
        const lineBeforeCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        return {
          incomplete: list.isIncomplete,
          suggestions: list.items.map((i) => toMonacoSuggestion(i, position, lineBeforeCursor)),
        };
      } catch (e) {
        log.error('bitmark completion failed', e);
        return { suggestions: [] };
      }
    },
  });
};
