// Pure conversions between the parser's LSP shapes and Monaco's (ported from
// the playground's PLAN-016 / PLAN-017 tests onto the injected Monaco).
import type { CompletionItem, Diagnostic, SemanticToken } from '@gmb/bitmark-parser';
import { describe, expect, it } from 'vitest';

import { createFakeMonaco, FakeRange } from '../testing/fakeMonaco';
import {
  COMPLETE_OPTIONS,
  COMPLETION_TRIGGER_CHARACTERS,
  monacoKind,
  replacedPrefixLength,
  replacedSuffixLength,
  toMonacoSuggestion,
  triggerCharacterOf,
} from './completion';
import { buildBitmarkMarkers, markerSeverity } from './diagnostics';
import { buildBitmarkDecorations } from './highlighter';
import { schemaUrlFor, schemaUrlForVersion } from './jsonSchema';
import { toMonacoHover } from './setup';

const { monaco } = createFakeMonaco();
const K = monaco.languages.CompletionItemKind;
const LSP = {
  Class: 7,
  Property: 10,
  Value: 12,
  Keyword: 14,
  Snippet: 15,
  EnumMember: 20,
  TypeParameter: 25,
};

const item = (over: Partial<CompletionItem> = {}): CompletionItem =>
  ({
    label: '@id',
    kind: LSP.Property,
    detail: 'string · 0..1',
    documentation: { kind: 'markdown', value: '**`[@id]`**' },
    sortText: '10002',
    insertText: '@id',
    ...over,
  }) as CompletionItem;

describe('monacoKind', () => {
  it('maps the LSP numbering onto Monaco’s own', () => {
    expect(monacoKind(monaco, LSP.Class)).toBe(K.Class);
    expect(monacoKind(monaco, LSP.Property)).toBe(K.Property);
    expect(monacoKind(monaco, LSP.Keyword)).toBe(K.Keyword);
    expect(monacoKind(monaco, LSP.Snippet)).toBe(K.Snippet);
    expect(monacoKind(monaco, LSP.EnumMember)).toBe(K.EnumMember);
    expect(monacoKind(monaco, LSP.Value)).toBe(K.Value);
    expect(monacoKind(monaco, LSP.TypeParameter)).toBe(K.TypeParameter);
    expect(monacoKind(monaco, 999)).toBe(K.Property);
  });
});

describe('replacedPrefixLength', () => {
  it('replaces only the typed part of the label, never the syntax before it', () => {
    expect(replacedPrefixLength('[.art', 'article')).toBe(3);
    expect(replacedPrefixLength('[@i', '@id')).toBe(2);
    expect(replacedPrefixLength('Hello [', '@id')).toBe(0);
    expect(replacedPrefixLength('==x==|bo', 'bold')).toBe(2);
    expect(replacedPrefixLength('==', '====')).toBe(2);
    expect(replacedPrefixLength('[@ID', '@id')).toBe(3);
  });
});

describe('toMonacoSuggestion', () => {
  const position = { lineNumber: 2, column: 4 };

  it('carries label, detail, documentation and sortText, and anchors the range', () => {
    const s = toMonacoSuggestion(monaco, item(), position, '[@i');
    expect(s.label).toBe('@id');
    expect(s.kind).toBe(K.Property);
    expect(s.detail).toBe('string · 0..1');
    expect((s.documentation as { value: string }).value).toBe('**`[@id]`**');
    expect(s.sortText).toBe('10002');
    expect(s.range).toEqual({ startLineNumber: 2, endLineNumber: 2, startColumn: 2, endColumn: 4 });
  });

  it('marks a deprecated item and honours preselect', () => {
    const s = toMonacoSuggestion(monaco, item({ tags: [1], preselect: true }), position, '[@i');
    expect(s.tags).toEqual([monaco.languages.CompletionItemTag.Deprecated]);
    expect(s.preselect).toBe(true);
    expect(toMonacoSuggestion(monaco, item(), position, '[@i').tags).toBeUndefined();
  });

  it('inserts a snippet as a snippet, and plain text as plain text', () => {
    const mark = toMonacoSuggestion(
      monaco,
      item({ label: '==', insertText: '==${1:text}==|${2:bold}|', insertTextFormat: 2 }),
      position,
      '=',
    );
    expect(mark.insertTextRules).toBe(
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    );
    expect(toMonacoSuggestion(monaco, item(), position, '[@i').insertTextRules).toBeUndefined();
  });

  it('inserts what the parser asked for, which can differ from the label', () => {
    const s = toMonacoSuggestion(
      monaco,
      item({ label: 'color', insertText: 'color:' }),
      position,
      '|co',
    );
    expect(s.insertText).toBe('color:');
    expect(s.filterText).toBe('color');
  });
});

describe('bit templates', () => {
  const at = { lineNumber: 1, column: 6 };
  const bit = item({
    label: 'article',
    kind: LSP.Class as CompletionItem['kind'],
    insertText: 'article]\n[#${1}]\n${2:body}\n$0',
    insertTextFormat: 2,
  });

  it('replaces an auto-closed `]` after the cursor when a bit-type snippet carries its own', () => {
    expect(toMonacoSuggestion(monaco, bit, at, '[.art', undefined, ']').range).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 3,
      endColumn: 7,
    });
    // Nothing after the cursor, a plain name, or a non-bit snippet: the range ends at the cursor.
    expect(toMonacoSuggestion(monaco, bit, at, '[.art', undefined, '').range).toMatchObject({
      endColumn: 6,
    });
    expect(
      replacedSuffixLength(
        ']',
        item({ label: 'article', kind: LSP.Class as CompletionItem['kind'] }),
      ),
    ).toBe(0);
    expect(
      replacedSuffixLength(
        ']',
        item({ label: '==', insertText: '==${1:text}==|${2:bold}|', insertTextFormat: 2 }),
      ),
    ).toBe(0);
  });

  it('asks the parser for bit templates on every query', () => {
    expect(COMPLETE_OPTIONS.bitTemplate).toBe(true);
  });
});

describe('triggerCharacterOf', () => {
  it('passes the trigger character on, and nothing for an explicit invocation', () => {
    const T = monaco.languages.CompletionTriggerKind;
    expect(
      triggerCharacterOf(monaco, { triggerKind: T.TriggerCharacter, triggerCharacter: '[' }),
    ).toBe('[');
    expect(triggerCharacterOf(monaco, { triggerKind: T.Invoke })).toBeUndefined();
    expect(
      triggerCharacterOf(monaco, {
        triggerKind: T.TriggerForIncompleteCompletions,
        triggerCharacter: '.',
      }),
    ).toBeUndefined();
  });

  it('opens on the characters that begin a bitmark construct', () => {
    expect(COMPLETION_TRIGGER_CHARACTERS).toEqual(['[', '.', '@', '&', ':', '|', '=', '-']);
  });
});

const diagnostic = (
  line: number,
  from: number,
  to: number,
  severity: number,
  code: string,
): Diagnostic =>
  ({
    range: { start: { line, character: from }, end: { line, character: to } },
    severity,
    code,
    source: 'bitmark',
    message: code,
  }) as Diagnostic;

describe('markers', () => {
  it('maps the three LSP severities the parser produces', () => {
    expect(markerSeverity(monaco, 1)).toBe(monaco.MarkerSeverity.Error);
    expect(markerSeverity(monaco, 2)).toBe(monaco.MarkerSeverity.Warning);
    expect(markerSeverity(monaco, 3)).toBe(monaco.MarkerSeverity.Info);
  });

  it('shifts 0-based LSP positions to Monaco 1-based, keeping code and source', () => {
    const [marker] = buildBitmarkMarkers(monaco, [diagnostic(1, 0, 8, 1, 'unknown-bit-type')]);
    expect(marker).toMatchObject({
      severity: monaco.MarkerSeverity.Error,
      code: 'unknown-bit-type',
      source: 'bitmark',
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 9,
    });
  });

  it('widens an empty range so the marker is visible', () => {
    const [marker] = buildBitmarkMarkers(monaco, [diagnostic(0, 3, 3, 2, 'x')]);
    expect(marker!.startColumn).toBe(4);
    expect(marker!.endColumn).toBe(5);
  });
});

describe('toMonacoHover', () => {
  it('shifts the range and passes the Markdown through, untrusted', () => {
    const hover = toMonacoHover({
      range: { start: { line: 0, character: 2 }, end: { line: 0, character: 9 } },
      contents: { kind: 'markdown', value: '**article**' },
    } as Parameters<typeof toMonacoHover>[0]);
    expect(hover.range).toEqual({
      startLineNumber: 1,
      startColumn: 3,
      endLineNumber: 1,
      endColumn: 10,
    });
    expect(hover.contents).toEqual([{ value: '**article**', isTrusted: false }]);
  });
});

describe('buildBitmarkDecorations', () => {
  it('maps 0-based tokens to 1-based ranges on the injected Monaco, with type and modifier classes', () => {
    const tokens: SemanticToken[] = [
      { line: 2, start: 4, length: 3, type: 'tagText', modifiers: ['gap', 'unclosed'] },
    ] as SemanticToken[];
    const [d] = buildBitmarkDecorations(monaco, tokens);
    expect(d!.range).toBeInstanceOf(FakeRange);
    expect(d!.range).toMatchObject({
      startLineNumber: 3,
      startColumn: 5,
      endLineNumber: 3,
      endColumn: 8,
    });
    expect(d!.options.inlineClassName).toBe('bm-tok-tagText bm-mod-unclosed');
  });
});

describe('schema URLs', () => {
  const CDN =
    'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@7.0.0/dist/browser/bitmark-parser.min.js';
  it('finds the schema beside a CDN engine (ignoring the cache-buster) or a local one', () => {
    expect(schemaUrlFor(`${CDN}?_=123`)).toBe(
      'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@7.0.0/schema/bitmark.schema.json',
    );
    expect(schemaUrlFor('/bitmark-playground/local-engine/bitmark-parser.min.js?_=1')).toBe(
      '/bitmark-playground/local-engine/schema.json',
    );
  });

  it('finds it on the CDN by version, for an injected module', () => {
    expect(schemaUrlForVersion('7.9.0')).toBe(
      'https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@7.9.0/schema/bitmark.schema.json',
    );
  });
});
