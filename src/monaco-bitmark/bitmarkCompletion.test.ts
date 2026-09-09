// @awa-test: PLAN-017-Step2 (parser complete -> Monaco suggestions)
import * as monaco from 'monaco-editor';
import { describe, expect, it } from 'vitest';

import {
  COMPLETION_TRIGGER_CHARACTERS,
  monacoKind,
  replacedPrefixLength,
  toMonacoSuggestion,
} from './bitmarkCompletion';
import { BitmarkCompletionItem, LspCompletionKind } from './bitmarkEditorTypes';

const item = (over: Partial<BitmarkCompletionItem> = {}): BitmarkCompletionItem => ({
  label: '@id',
  kind: LspCompletionKind.Property,
  detail: 'string · 0..1',
  documentation: { kind: 'markdown', value: '**`[@id]`**' },
  sortText: '10002',
  insertText: '@id',
  ...over,
});

describe('monacoKind', () => {
  it('maps the LSP numbering onto Monaco’s own', () => {
    const K = monaco.languages.CompletionItemKind;
    expect(monacoKind(LspCompletionKind.Class)).toBe(K.Class);
    expect(monacoKind(LspCompletionKind.Property)).toBe(K.Property);
    expect(monacoKind(LspCompletionKind.Keyword)).toBe(K.Keyword);
    expect(monacoKind(LspCompletionKind.Snippet)).toBe(K.Snippet);
    expect(monacoKind(LspCompletionKind.EnumMember)).toBe(K.EnumMember);
    expect(monacoKind(LspCompletionKind.Value)).toBe(K.Value);
    expect(monacoKind(LspCompletionKind.TypeParameter)).toBe(K.TypeParameter);
  });

  it('falls back to Property for a kind a newer parser adds', () => {
    expect(monacoKind(999)).toBe(monaco.languages.CompletionItemKind.Property);
  });
});

describe('replacedPrefixLength', () => {
  it('replaces only the typed part of the label, never the syntax before it', () => {
    // `[.art` → `article`: the `[.` stays, `art` is replaced.
    expect(replacedPrefixLength('[.art', 'article')).toBe(3);
    // `[@i` → `@id`: the label repeats the `@`, so the `@i` is replaced.
    expect(replacedPrefixLength('[@i', '@id')).toBe(2);
    // A bare `[`: nothing of the label has been typed.
    expect(replacedPrefixLength('Hello [', '@id')).toBe(0);
    // An inline attribute chain.
    expect(replacedPrefixLength('==x==|bo', 'bold')).toBe(2);
    // A structural line.
    expect(replacedPrefixLength('==', '====')).toBe(2);
    // Case-insensitive, as Monaco filters.
    expect(replacedPrefixLength('[@ID', '@id')).toBe(3);
  });
});

describe('toMonacoSuggestion', () => {
  const position = { lineNumber: 2, column: 4 };

  it('carries label, detail, documentation and sortText, and anchors the range', () => {
    const s = toMonacoSuggestion(item(), position, '[@i');
    expect(s.label).toBe('@id');
    expect(s.kind).toBe(monaco.languages.CompletionItemKind.Property);
    expect(s.detail).toBe('string · 0..1');
    expect((s.documentation as { value: string }).value).toBe('**`[@id]`**');
    expect(s.sortText).toBe('10002');
    expect(s.range).toEqual({
      startLineNumber: 2,
      endLineNumber: 2,
      startColumn: 2, // replaces the typed `@i`
      endColumn: 4,
    });
  });

  it('marks a deprecated item and honours preselect', () => {
    const s = toMonacoSuggestion(item({ tags: [1], preselect: true }), position, '[@i');
    expect(s.tags).toEqual([monaco.languages.CompletionItemTag.Deprecated]);
    expect(s.preselect).toBe(true);
    expect(toMonacoSuggestion(item(), position, '[@i').tags).toBeUndefined();
  });

  it('inserts what the parser asked for, which can differ from the label', () => {
    // A valued inline attribute: the label is the key, the insert adds the `:`.
    const s = toMonacoSuggestion(
      item({ label: 'color', insertText: 'color:', kind: LspCompletionKind.Property }),
      position,
      '|co',
    );
    expect(s.insertText).toBe('color:');
    expect(s.filterText).toBe('color');
  });
});

describe('COMPLETION_TRIGGER_CHARACTERS', () => {
  it('opens on the characters that begin a bitmark construct', () => {
    for (const c of ['[', '.', '@', '&', ':', '|', '=', '-']) {
      expect(COMPLETION_TRIGGER_CHARACTERS).toContain(c);
    }
  });
});
