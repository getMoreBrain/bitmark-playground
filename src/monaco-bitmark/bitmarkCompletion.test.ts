// @awa-test: PLAN-017-Step2 (parser complete -> Monaco suggestions)
import * as monaco from 'monaco-editor';
import { describe, expect, it, vi } from 'vitest';

import {
  COMPLETE_OPTIONS,
  COMPLETION_TRIGGER_CHARACTERS,
  monacoKind,
  replacedPrefixLength,
  replacedSuffixLength,
  resolveMonacoSuggestion,
  toMonacoSuggestion,
  triggerCharacterOf,
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

  it('inserts a snippet as a snippet, and plain text as plain text', () => {
    const mark = toMonacoSuggestion(
      item({ label: '==', insertText: '==${1:text}==|${2:bold}|', insertTextFormat: 2 }),
      position,
      '=',
    );
    expect(mark.insertTextRules).toBe(
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    );
    expect(toMonacoSuggestion(item(), position, '[@i').insertTextRules).toBeUndefined();
  });

  // @awa-test: PLAN-021-Step1 (bit templates: the auto-closed `]`)
  it('replaces an auto-closed `]` after the cursor when a bit-type snippet carries its own', () => {
    const bit = item({
      label: 'article',
      kind: LspCompletionKind.Class,
      insertText: 'article]\n[#${1}]\n${2:body}\n$0',
      insertTextFormat: 2,
    });
    const at = { lineNumber: 1, column: 6 };
    expect(toMonacoSuggestion(bit, at, '[.art', undefined, ']').range).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 3,
      endColumn: 7,
    });
    // Nothing after the cursor, a plain name, or a non-bit snippet: the range ends at the cursor.
    expect(
      (toMonacoSuggestion(bit, at, '[.art', undefined, '').range as monaco.IRange).endColumn,
    ).toBe(6);
    expect(
      replacedSuffixLength(']', item({ label: 'article', kind: LspCompletionKind.Class })),
    ).toBe(0);
    expect(
      replacedSuffixLength(
        ']',
        item({ label: '==', insertText: '==${1:text}==|${2:bold}|', insertTextFormat: 2 }),
      ),
    ).toBe(0);
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

describe('COMPLETE_OPTIONS', () => {
  // @awa-test: PLAN-021-Step1 (bit templates on)
  it('asks the parser for bit templates on every query', () => {
    expect(COMPLETE_OPTIONS.bitTemplate).toBe(true);
  });
});

describe('COMPLETION_TRIGGER_CHARACTERS', () => {
  it('opens on the characters that begin a bitmark construct', () => {
    for (const c of ['[', '.', '@', '&', ':', '|', '=', '-']) {
      expect(COMPLETION_TRIGGER_CHARACTERS).toContain(c);
    }
  });
});

describe('resolveMonacoSuggestion', () => {
  const position = { lineNumber: 2, column: 4 };
  const query = { input: '[.article]\n[@i', position: { line: 1, character: 3 } };
  const listed = item({ documentation: undefined });

  it('asks the parser for THIS item at the query it came from, and carries the Markdown', () => {
    const resolver = vi.fn(() => ({
      ...listed,
      documentation: { kind: 'markdown' as const, value: '**`[@id]`**\n\n- format: `string`' },
    }));
    const s = toMonacoSuggestion(listed, position, '[@i', query);
    expect(s.documentation).toBeUndefined();
    const r = resolveMonacoSuggestion(s, resolver);
    expect(resolver).toHaveBeenCalledWith(query.input, query.position, listed);
    expect((r.documentation as { value: string }).value).toContain('- format: `string`');
    expect(r.label).toBe('@id');
  });

  it('leaves a suggestion alone without a query, without a parser, or when the parser has nothing', () => {
    const bare = toMonacoSuggestion(listed, position, '[@i');
    expect(resolveMonacoSuggestion(bare, vi.fn())).toBe(bare);
    const s = toMonacoSuggestion(listed, position, '[@i', query);
    expect(resolveMonacoSuggestion(s, undefined)).toBe(s);
    expect(resolveMonacoSuggestion(s, () => listed)).toBe(s);
  });

  it('survives a parser failure', () => {
    const s = toMonacoSuggestion(listed, position, '[@i', query);
    const failing = () => {
      throw new Error('boom');
    };
    expect(resolveMonacoSuggestion(s, failing)).toBe(s);
  });
});

describe('triggerCharacterOf', () => {
  it('passes the trigger character on, and nothing for an explicit invocation', () => {
    const K = monaco.languages.CompletionTriggerKind;
    expect(triggerCharacterOf({ triggerKind: K.TriggerCharacter, triggerCharacter: '[' })).toBe(
      '[',
    );
    expect(triggerCharacterOf({ triggerKind: K.Invoke })).toBeUndefined();
    expect(
      triggerCharacterOf({ triggerKind: K.TriggerForIncompleteCompletions, triggerCharacter: '.' }),
    ).toBeUndefined();
  });
});
