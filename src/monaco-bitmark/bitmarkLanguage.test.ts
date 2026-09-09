// @awa-test: PLAN-016-Step2 (parser semanticTokens -> Monaco decorations, debounced per editor)
import type { SemanticToken } from '@gmb/bitmark-parser';
import * as monaco from 'monaco-editor';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../logging/log';
import {
  attachBitmarkHighlighter,
  buildBitmarkDecorations,
  HIGHLIGHT_DEBOUNCE_MS,
  SemanticTokensSource,
  setBitmarkSemanticTokensSource,
} from './bitmarkLanguage';

const legend = { tokenTypes: [], tokenModifiers: [] };

// Fake parser: `[.` then the rest of the first line as a bit type.
const fakeSource = ((input: string) => ({
  legend,
  positionEncoding: 'utf-16',
  layout: 'absolute',
  tokens:
    input === ''
      ? []
      : [
          { line: 0, start: 0, length: 2, type: 'bitSigil', modifiers: [] },
          { line: 0, start: 2, length: input.length - 2, type: 'bitType', modifiers: [] },
        ],
})) as unknown as SemanticTokensSource;

/** Minimal ICodeEditor fake: a value, content-change listeners and one decorations collection. */
const makeEditor = (initial: string) => {
  let value = initial;
  const listeners: (() => void)[] = [];
  let decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const editor = {
    getModel: () => ({ getValue: () => value }),
    onDidChangeModelContent: (cb: () => void) => {
      listeners.push(cb);
      return { dispose: () => listeners.splice(listeners.indexOf(cb), 1) };
    },
    onDidChangeModel: () => ({ dispose: () => {} }),
    createDecorationsCollection: () => ({
      set: (d: monaco.editor.IModelDeltaDecoration[]) => {
        decorations = d;
      },
      clear: () => {
        decorations = [];
      },
    }),
  } as unknown as monaco.editor.ICodeEditor;
  return {
    editor,
    type: (text: string) => {
      value += text;
      for (const cb of [...listeners]) cb();
    },
    decorations: () => decorations,
    classes: () => decorations.map((d) => d.options.inlineClassName),
    listenerCount: () => listeners.length,
  };
};

describe('buildBitmarkDecorations', () => {
  it('maps 0-based line/column tokens to 1-based Monaco ranges with type and modifier classes', () => {
    const tokens: SemanticToken[] = [
      { line: 2, start: 4, length: 3, type: 'tagText', modifiers: ['gap', 'unclosed'] },
    ];
    const [decoration] = buildBitmarkDecorations(tokens);
    expect(decoration.range).toBeInstanceOf(monaco.Range);
    expect(decoration.options.inlineClassName).toBe('bm-tok-tagText bm-mod-unclosed');
  });
});

describe('attachBitmarkHighlighter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setBitmarkSemanticTokensSource(fakeSource);
  });

  afterEach(() => {
    setBitmarkSemanticTokensSource(undefined);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('highlights immediately on attach', () => {
    const ed = makeEditor('[.article');
    const highlighter = attachBitmarkHighlighter(ed.editor);
    expect(ed.classes()).toEqual(['bm-tok-bitSigil', 'bm-tok-bitType']);
    highlighter.dispose();
  });

  it('re-highlights after an edit once the debounce elapses', () => {
    const spy = vi.fn(fakeSource);
    setBitmarkSemanticTokensSource(spy as unknown as SemanticTokensSource);
    const ed = makeEditor('[.a');
    const highlighter = attachBitmarkHighlighter(ed.editor);
    expect(spy).toHaveBeenLastCalledWith('[.a', expect.anything());

    ed.type('rt');
    ed.type('icle');
    expect(spy).toHaveBeenCalledTimes(1); // not yet: debounced
    vi.advanceTimersByTime(HIGHLIGHT_DEBOUNCE_MS);
    expect(spy).toHaveBeenCalledTimes(2); // one run for both edits
    expect(spy).toHaveBeenLastCalledWith('[.article', expect.anything());

    highlighter.dispose();
  });

  it('clears until a source is available, then highlights when one is set', () => {
    setBitmarkSemanticTokensSource(undefined);
    const ed = makeEditor('[.article');
    const highlighter = attachBitmarkHighlighter(ed.editor);
    expect(ed.decorations()).toEqual([]);

    setBitmarkSemanticTokensSource(fakeSource);
    expect(ed.classes()).toEqual(['bm-tok-bitSigil', 'bm-tok-bitType']);

    highlighter.dispose();
  });

  it('clears and logs when the parser throws', () => {
    const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
    setBitmarkSemanticTokensSource((() => {
      throw new Error('boom');
    }) as unknown as SemanticTokensSource);
    const ed = makeEditor('[.article');
    const highlighter = attachBitmarkHighlighter(ed.editor);
    expect(ed.decorations()).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    highlighter.dispose();
  });

  it('detaches listeners and clears decorations on dispose', () => {
    const ed = makeEditor('[.article');
    const highlighter = attachBitmarkHighlighter(ed.editor);
    expect(ed.listenerCount()).toBe(1);

    highlighter.dispose();
    expect(ed.listenerCount()).toBe(0);
    expect(ed.decorations()).toEqual([]);

    // A later source change must not touch a disposed editor.
    setBitmarkSemanticTokensSource(fakeSource);
    expect(ed.decorations()).toEqual([]);
  });
});
