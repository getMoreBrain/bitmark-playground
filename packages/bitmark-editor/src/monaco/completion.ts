// @awa-component: PLAN-023-MonacoServices
import type { CompletionItem, CompletionList, Position } from '@gmb/bitmark-parser';
import type * as MonacoApi from 'monaco-editor';

import type { Monaco } from './types';

/**
 * Characters that should open the suggestion list. `[` opens a tag or a bit
 * header, `.` `@` `&` name what follows it, `:` a value, `|` an inline
 * attribute chain, `=` and `-` the structural lines.
 */
export const COMPLETION_TRIGGER_CHARACTERS = ['[', '.', '@', '&', ':', '|', '=', '-'];

/** LSP `CompletionItemKind` values the parser uses. */
const LSP = { Class: 7, Value: 12, Keyword: 14, Snippet: 15, EnumMember: 20, TypeParameter: 25 };

/** LSP `CompletionItemKind` → Monaco's own (differently numbered) enum. */
export const monacoKind = (
  monaco: Monaco,
  kind: number,
): MonacoApi.languages.CompletionItemKind => {
  const K = monaco.languages.CompletionItemKind;
  switch (kind) {
    case LSP.Class:
      return K.Class;
    case LSP.Value:
      return K.Value;
    case LSP.Keyword:
      return K.Keyword;
    case LSP.Snippet:
      return K.Snippet;
    case LSP.EnumMember:
      return K.EnumMember;
    case LSP.TypeParameter:
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

/** The query a suggestion came from — what the parser's `resolve` needs. */
export interface CompletionQuery {
  input: string;
  position: Position;
}

/**
 * A Monaco suggestion that remembers its query and its parser item, so
 * `resolveCompletionItem` can ask the parser for the documentation of THIS
 * item. Monaco hands the provider's own object back, extra fields intact.
 */
export interface BitmarkSuggestion extends MonacoApi.languages.CompletionItem {
  bitmark?: { query: CompletionQuery; item: CompletionItem };
}

/** One parser item as a Monaco suggestion, anchored at `position`. */
export const toMonacoSuggestion = (
  monaco: Monaco,
  item: CompletionItem,
  position: MonacoApi.IPosition,
  lineBeforeCursor: string,
  query?: CompletionQuery,
): BitmarkSuggestion => {
  const replaced = replacedPrefixLength(lineBeforeCursor, item.label);
  return {
    bitmark: query ? { query, item } : undefined,
    label: item.label,
    kind: monacoKind(monaco, item.kind ?? 0),
    detail: item.detail,
    documentation: item.documentation
      ? { value: item.documentation.value, isTrusted: false }
      : undefined,
    tags: item.tags?.includes(1) ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
    preselect: item.preselect,
    sortText: item.sortText,
    insertText: item.insertText ?? item.label,
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
      endColumn: position.column,
    },
  };
};

/** Monaco's suggestion list for the parser's answer. */
export const toMonacoCompletionList = (
  monaco: Monaco,
  list: CompletionList,
  position: MonacoApi.IPosition,
  lineBeforeCursor: string,
  query: CompletionQuery,
): MonacoApi.languages.CompletionList => ({
  incomplete: list.isIncomplete,
  suggestions: list.items.map((i) =>
    toMonacoSuggestion(monaco, i, position, lineBeforeCursor, query),
  ),
});

/**
 * The character to tell the parser about (LSP `triggerCharacter`): the one
 * that opened this query, and nothing when it was invoked explicitly. The
 * parser answers a trigger that opens nothing where the cursor is — a `.`
 * or a `-` typed in prose — with an empty list (parser PLAN-203 D1).
 */
export const triggerCharacterOf = (
  monaco: Monaco,
  context: MonacoApi.languages.CompletionContext,
): string | undefined =>
  context.triggerKind === monaco.languages.CompletionTriggerKind.TriggerCharacter
    ? context.triggerCharacter
    : undefined;
