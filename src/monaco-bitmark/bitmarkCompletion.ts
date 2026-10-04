// @awa-component: PLAN-017-BitmarkCompletion
import * as monaco from 'monaco-editor';

import { log } from '../logging/log';
import {
  BitmarkCompletionItem,
  CompleteSource,
  EditorPosition,
  LspCompletionKind,
  ResolveSource,
} from './bitmarkEditorTypes';
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

/**
 * The options every completion query carries (parser PLAN-225 D9): a
 * bit-type item inserts the bit's template — its usual tags, body and card
 * structure — as a snippet, from the name onward, instead of the name alone.
 */
export const COMPLETE_OPTIONS = { bitTemplate: true } as const;

/**
 * The text after the cursor an item replaces as well: the `]` Monaco
 * auto-closed when a bit-type snippet carries its own (`article]⏎…`), so
 * the bracket is not doubled.
 */
export const replacedSuffixLength = (after: string, item: BitmarkCompletionItem): number =>
  item.kind === LspCompletionKind.Class &&
  item.insertTextFormat === 2 &&
  item.insertText.includes(']') &&
  after.startsWith(']')
    ? 1
    : 0;

/** The query a suggestion came from — what the parser's `resolve` needs. */
export interface CompletionQuery {
  input: string;
  position: EditorPosition;
}

/**
 * A Monaco suggestion that remembers its query and its parser item, so
 * `resolveCompletionItem` can ask the parser for the documentation of THIS
 * item. Monaco hands the provider's own object back, extra fields intact.
 */
export interface BitmarkSuggestion extends monaco.languages.CompletionItem {
  bitmark?: { query: CompletionQuery; item: BitmarkCompletionItem };
}

/** One parser item as a Monaco suggestion, anchored at `position`. */
export const toMonacoSuggestion = (
  item: BitmarkCompletionItem,
  position: monaco.IPosition,
  lineBeforeCursor: string,
  query?: CompletionQuery,
  lineAfterCursor = '',
): BitmarkSuggestion => {
  const replaced = replacedPrefixLength(lineBeforeCursor, item.label);
  const replacedAfter = replacedSuffixLength(lineAfterCursor, item);
  return {
    bitmark: query ? { query, item } : undefined,
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
    // LSP `insertTextFormat` 2 is a snippet (`${1:text}` placeholders).
    insertTextRules:
      item.insertTextFormat === 2
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    filterText: item.label,
    range: {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: position.column - replaced,
      endColumn: position.column + replacedAfter,
    },
  };
};

let source: CompleteSource | undefined;
let resolveSource: ResolveSource | undefined;

/** Install (or, with `undefined`, remove) the parser's `complete`. */
export const setBitmarkCompleteSource = (next: CompleteSource | undefined): void => {
  source = next;
};

/** Install (or, with `undefined`, remove) the parser's `resolve`. */
export const setBitmarkResolveSource = (next: ResolveSource | undefined): void => {
  resolveSource = next;
};

/**
 * Fill in a suggestion's documentation from the parser (LSP
 * `completionItem/resolve`): the list ships none, so the parser renders it
 * for the one item Monaco is about to show. A suggestion without its query
 * (an older list), a parser without `resolve`, or a failure leaves the
 * suggestion as it is.
 */
export const resolveMonacoSuggestion = (
  suggestion: monaco.languages.CompletionItem,
  resolver: ResolveSource | undefined = resolveSource,
): monaco.languages.CompletionItem => {
  const { bitmark } = suggestion as BitmarkSuggestion;
  if (!resolver || !bitmark) return suggestion;
  try {
    const resolved = resolver(bitmark.query.input, bitmark.query.position, bitmark.item);
    if (!resolved.documentation) return suggestion;
    return {
      ...suggestion,
      documentation: { value: resolved.documentation.value, isTrusted: false },
    };
  } catch (e) {
    log.error('bitmark completion resolve failed', e);
    return suggestion;
  }
};

let registered: monaco.IDisposable | undefined;

/**
 * The character to tell the parser about (LSP `triggerCharacter`): the one
 * that opened this query, and nothing when it was invoked explicitly. The
 * parser answers a trigger that opens nothing where the cursor is — a `.`
 * or a `-` typed in prose — with an empty list (parser PLAN-203 D1).
 */
export const triggerCharacterOf = (
  context: monaco.languages.CompletionContext,
): string | undefined =>
  context.triggerKind === monaco.languages.CompletionTriggerKind.TriggerCharacter
    ? context.triggerCharacter
    : undefined;

/**
 * Register the bitmark completion provider (idempotent). It asks the parser
 * what is valid at the cursor and hands the answer to Monaco; the parser
 * returns every candidate for the context and Monaco filters by what was
 * typed. Documentation is resolved lazily, one item at a time, when Monaco
 * is about to show it.
 */
export const registerBitmarkCompletion = (): void => {
  if (registered) return;
  registered = monaco.languages.registerCompletionItemProvider(BITMARK_LANGUAGE_ID, {
    triggerCharacters: COMPLETION_TRIGGER_CHARACTERS,
    provideCompletionItems: (model, position, context) => {
      if (!source) return { suggestions: [] };
      try {
        const query: CompletionQuery = {
          input: model.getValue(),
          position: { line: position.lineNumber - 1, character: position.column - 1 },
        };
        const triggerCharacter = triggerCharacterOf(context);
        const list = source(query.input, query.position, {
          triggerCharacter,
          ...COMPLETE_OPTIONS,
        });
        const lineBeforeCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const lineAfterCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: model.getLineMaxColumn(position.lineNumber),
        });
        return {
          incomplete: list.isIncomplete,
          suggestions: list.items.map((i) =>
            toMonacoSuggestion(i, position, lineBeforeCursor, query, lineAfterCursor),
          ),
        };
      } catch (e) {
        log.error('bitmark completion failed', e);
        return { suggestions: [] };
      }
    },
    resolveCompletionItem: (item) => resolveMonacoSuggestion(item),
  });
};
