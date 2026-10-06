import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BitmarkEngine } from '../engine/types';
import { createFakeEditor, createFakeModel, createFakeMonaco } from '../testing/fakeMonaco';
import { attachBitmarkEditor } from './attach';
import {
  bindBitmarkJsonSchema,
  BITMARK_MODEL_FILE_MATCH,
  loadBitmarkJsonSchema,
} from './jsonSchema';
import {
  bindModelEngine,
  BITMARK_LANGUAGE_CONFIGURATION,
  BITMARK_LANGUAGE_ID,
  setupBitmarkMonaco,
} from './setup';

/** Tokens: `[.` then the rest of the first line as a bit type. */
const tokensFor = (input: string) => ({
  layout: 'absolute',
  tokens:
    input === ''
      ? []
      : [
          { line: 0, start: 0, length: 2, type: 'bitSigil', modifiers: [] },
          {
            line: 0,
            start: 2,
            length: Math.max(
              0,
              input.indexOf('\n') === -1 ? input.length - 2 : input.indexOf('\n') - 2,
            ),
            type: 'bitType',
            modifiers: [],
          },
        ],
});

const fakeEngine = (over: Partial<BitmarkEngine> = {}): BitmarkEngine =>
  ({
    version: '1',
    feature: 'full',
    markupFormats: true,
    capabilities: {
      bitPositions: true,
      diagnostics: true,
      complete: true,
      resolve: true,
      hover: true,
      info: true,
    },
    semanticTokens: vi.fn(async (input: string) => tokensFor(input)),
    diagnostics: vi.fn(async (input: string) => ({
      diagnostics: input.includes('bad')
        ? [
            {
              range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
              severity: 1,
              message: 'bad',
              code: 'x',
            },
          ]
        : [],
    })),
    complete: vi.fn(async () => ({
      isIncomplete: false,
      items: [{ label: 'article', kind: 7, insertText: 'article', sortText: '1' }],
    })),
    resolve: vi.fn(async (_i: string, _p: unknown, item: object) => ({
      ...item,
      documentation: { kind: 'markdown', value: 'docs' },
    })),
    hover: vi.fn(async () => ({
      range: { start: { line: 0, character: 2 }, end: { line: 0, character: 9 } },
      contents: { kind: 'markdown', value: '**article**' },
    })),
    ...over,
  }) as unknown as BitmarkEngine;

/** Let pending promises (and microtask debounces) settle. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('setupBitmarkMonaco (PLAN-022 D8)', () => {
  // @awa-test: PLAN-023-Step4 (idempotent per Monaco instance)
  it('registers the language and providers once per Monaco instance', () => {
    const a = createFakeMonaco();
    setupBitmarkMonaco({ monaco: a.monaco });
    setupBitmarkMonaco({ monaco: a.monaco });
    expect(a.monaco.languages.getLanguages()).toEqual([{ id: BITMARK_LANGUAGE_ID }]);
    expect(a.providers.completion).toHaveLength(1);
    expect(a.providers.hover).toHaveLength(1);
    const b = createFakeMonaco();
    setupBitmarkMonaco({ monaco: b.monaco });
    expect(b.providers.completion).toHaveLength(1);
  });

  // @awa-test: PLAN-023-Step4 (the `[` `]` pair auto-closes, as main's PLAN-021 D4)
  it('declares the bracket pair on the language it registers, and only that one', () => {
    const a = createFakeMonaco();
    setupBitmarkMonaco({ monaco: a.monaco });
    setupBitmarkMonaco({ monaco: a.monaco });
    expect(a.setLanguageConfiguration).toHaveBeenCalledTimes(1);
    expect(a.setLanguageConfiguration).toHaveBeenCalledWith(
      BITMARK_LANGUAGE_ID,
      BITMARK_LANGUAGE_CONFIGURATION,
    );
    expect(BITMARK_LANGUAGE_CONFIGURATION).toEqual({
      brackets: [['[', ']']],
      autoClosingPairs: [{ open: '[', close: ']' }],
      surroundingPairs: [{ open: '[', close: ']' }],
    });
    // A host that registered bitmark itself keeps its own configuration.
    const host = createFakeMonaco();
    host.monaco.languages.register({ id: BITMARK_LANGUAGE_ID });
    setupBitmarkMonaco({ monaco: host.monaco });
    expect(host.setLanguageConfiguration).not.toHaveBeenCalled();
  });

  // @awa-test: PLAN-023-Step2 (providers answer only for models bound to an engine)
  it('answers completion and hover only for a model bound to an engine, with that engine', async () => {
    const { monaco, providers } = createFakeMonaco();
    setupBitmarkMonaco({ monaco });
    const complete = providers.completion[0]!.provider as unknown as {
      provideCompletionItems: (...a: unknown[]) => Promise<{ suggestions: unknown[] }>;
      resolveCompletionItem: (s: unknown) => Promise<{ documentation?: { value: string } }>;
    };
    const hover = providers.hover[0]!.provider as unknown as {
      provideHover: (...a: unknown[]) => Promise<unknown>;
    };
    const host = createFakeModel('[.art');
    const position = { lineNumber: 1, column: 6 };
    const context = { triggerKind: 0 };
    expect((await complete.provideCompletionItems(host, position, context)).suggestions).toEqual(
      [],
    );
    expect(await hover.provideHover(host, position)).toBeNull();

    const engine = fakeEngine();
    const ours = createFakeModel('[.art');
    bindModelEngine(ours, () => engine);
    const list = await complete.provideCompletionItems(ours, position, context);
    expect(list.suggestions).toHaveLength(1);
    expect(engine.complete).toHaveBeenCalledWith(
      '[.art',
      { line: 0, character: 5 },
      // A bit type completes to its template (parser PLAN-225 D9).
      { triggerCharacter: undefined, bitTemplate: true },
    );
    // `resolve` goes to the engine that answered the list, with the same options.
    const resolved = await complete.resolveCompletionItem(list.suggestions[0]);
    expect(resolved.documentation?.value).toBe('docs');
    expect(engine.resolve).toHaveBeenCalledWith(
      '[.art',
      { line: 0, character: 5 },
      expect.anything(),
      { bitTemplate: true },
    );
    expect(await hover.provideHover(ours, position)).toMatchObject({
      contents: [{ value: '**article**', isTrusted: false }],
    });
  });
});

describe('attachBitmarkEditor (PLAN-022 D14)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // @awa-test: PLAN-023-Step2 (highlights on attach, re-highlights after edits, debounced)
  it('highlights on attach, and once per burst of edits', async () => {
    const { monaco } = createFakeMonaco();
    const engine = fakeEngine();
    const model = createFakeModel('[.a');
    const ed = createFakeEditor(model);
    const services = attachBitmarkEditor(monaco, ed.editor, engine);
    await flush();
    expect(ed.classes()).toEqual(['bm-tok-bitSigil', 'bm-tok-bitType']);
    model.setText('[.ar');
    model.setText('[.article');
    await vi.advanceTimersByTimeAsync(15);
    await flush();
    expect(engine.semanticTokens).toHaveBeenCalledTimes(2);
    expect(engine.semanticTokens).toHaveBeenLastCalledWith('[.article');
    services.dispose();
  });

  // @awa-test: PLAN-023-Step2 (a result for an older text is dropped)
  it('drops a highlight result that arrives after the text changed', async () => {
    const { monaco } = createFakeMonaco();
    let release!: (v: unknown) => void;
    const slow = vi.fn(() => new Promise((r) => (release = r)));
    const model = createFakeModel('[.old');
    const ed = createFakeEditor(model);
    attachBitmarkEditor(monaco, ed.editor, fakeEngine({ semanticTokens: slow as never }), {
      diagnostics: false,
    });
    model.setText('[.newer');
    release(tokensFor('[.old'));
    await flush();
    expect(ed.decorations()).toEqual([]);
  });

  // @awa-test: PLAN-023-Step2 (markers from diagnostics; cleared on dispose)
  it('marks from diagnostics, debounced, and clears on dispose', async () => {
    const fake = createFakeMonaco();
    const model = createFakeModel('[.article');
    const ed = createFakeEditor(model);
    const services = attachBitmarkEditor(fake.monaco, ed.editor, fakeEngine());
    await flush();
    expect(fake.markersOf(model)).toEqual([]);
    model.setText('bad');
    await vi.advanceTimersByTimeAsync(150);
    await flush();
    expect(fake.markersOf(model)).toHaveLength(1);
    services.dispose();
    expect(fake.markersOf(model)).toEqual([]);
    expect(ed.listenerCount()).toBe(0);
  });

  // @awa-test: PLAN-023-Step2 (the engine can arrive later)
  it('clears until an engine is set, then highlights and marks', async () => {
    const fake = createFakeMonaco();
    const model = createFakeModel('bad');
    const ed = createFakeEditor(model);
    const services = attachBitmarkEditor(fake.monaco, ed.editor, undefined);
    await flush();
    expect(ed.decorations()).toEqual([]);
    services.setEngine(fakeEngine());
    await flush();
    expect(ed.classes()).toEqual(['bm-tok-bitSigil', 'bm-tok-bitType']);
    expect(fake.markersOf(model)).toHaveLength(1);
  });

  // @awa-test: PLAN-023-Step2 (an engine without diagnostics marks nothing)
  it('marks nothing when the engine has no diagnostics', async () => {
    const fake = createFakeMonaco();
    const model = createFakeModel('bad');
    const engine = fakeEngine();
    (engine.capabilities as { diagnostics: boolean }).diagnostics = false;
    attachBitmarkEditor(fake.monaco, createFakeEditor(model).editor, engine);
    await flush();
    expect(engine.diagnostics).not.toHaveBeenCalled();
    expect(fake.markersOf(model)).toEqual([]);
  });

  // @awa-test: PLAN-023-Step2 (a failing parser clears instead of crashing)
  it('survives a failing parser', async () => {
    const { monaco } = createFakeMonaco();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ed = createFakeEditor(createFakeModel('[.a'));
    attachBitmarkEditor(
      monaco,
      ed.editor,
      fakeEngine({ semanticTokens: vi.fn(async () => Promise.reject(new Error('boom'))) as never }),
    );
    await flush();
    expect(ed.decorations()).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // @awa-test: PLAN-023-Step4 (capability checks warn once, never crash)
  it('warns once when the injected Monaco lacks the suggest or hover contribution', () => {
    const { monaco } = createFakeMonaco();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    attachBitmarkEditor(monaco, createFakeEditor(createFakeModel(''), []).editor, fakeEngine());
    attachBitmarkEditor(monaco, createFakeEditor(createFakeModel(''), []).editor, fakeEngine());
    const messages = warn.mock.calls.map((c) => String(c[1]));
    expect(messages.filter((m) => m.includes('suggest'))).toHaveLength(1);
    expect(messages.filter((m) => m.includes('hover'))).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('the bitmark JSON schema (PLAN-022 D5)', () => {
  // @awa-test: PLAN-023-Step3 (scoped to the package's models by default)
  it('binds the schema to the package model scheme only, unless the host widens it', () => {
    const fake = createFakeMonaco();
    expect(bindBitmarkJsonSchema(fake.monaco, { type: 'array' })).toBe(true);
    expect(fake.setDiagnosticsOptions.mock.calls[0]![0].schemas[0].fileMatch).toEqual([
      BITMARK_MODEL_FILE_MATCH,
    ]);
    expect(BITMARK_MODEL_FILE_MATCH).toBe('bitmark-editor://**');
    bindBitmarkJsonSchema(fake.monaco, {}, { fileMatch: ['*'] });
    expect(fake.setDiagnosticsOptions.mock.calls[1]![0].schemas[0].fileMatch).toEqual(['*']);
  });

  // @awa-test: PLAN-023-Step3 (the host's own JSON settings and schemas are kept, D5)
  it('merges into the host’s JSON options instead of replacing them', () => {
    const fake = createFakeMonaco();
    const set = vi.fn();
    const hostSchema = {
      uri: 'https://host/config.schema.json',
      fileMatch: ['inmemory://host/**'],
      schema: {},
    };
    (fake.monaco.languages as unknown as { json: unknown }).json = {
      jsonDefaults: {
        diagnosticsOptions: { validate: true, allowComments: true, schemas: [hostSchema] },
        setDiagnosticsOptions: set,
      },
    };
    bindBitmarkJsonSchema(fake.monaco, { type: 'array' });
    const options = set.mock.calls[0]![0];
    expect(options.allowComments).toBe(true);
    expect(options.schemas).toHaveLength(2);
    expect(options.schemas[0]).toBe(hostSchema);
    expect(options.schemas[1].fileMatch).toEqual([BITMARK_MODEL_FILE_MATCH]);
  });

  // @awa-test: PLAN-023-Step3 (Monaco 0.55+: the top-level monaco.json; languages.json a stub)
  it('binds through the top-level monaco.json when languages.json is only a stub', () => {
    const fake = createFakeMonaco();
    const top = vi.fn();
    (fake.monaco.languages as unknown as { json: unknown }).json = { deprecated: true };
    (fake.monaco as unknown as { json: unknown }).json = {
      jsonDefaults: { setDiagnosticsOptions: top },
    };
    expect(bindBitmarkJsonSchema(fake.monaco, {})).toBe(true);
    expect(top).toHaveBeenCalled();
  });

  // @awa-test: PLAN-023-Step4 (no JSON language: false, no crash)
  it('reports false on a Monaco without the JSON language', () => {
    const fake = createFakeMonaco();
    delete (fake.monaco.languages as { json?: unknown }).json;
    expect(bindBitmarkJsonSchema(fake.monaco, {})).toBe(false);
  });

  // @awa-test: PLAN-023-Step3 (a failed fetch leaves syntax checking only)
  it('loads the schema, or gives undefined when it cannot', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{"type":"array"}'))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(loadBitmarkJsonSchema('a')).resolves.toEqual({ type: 'array' });
    await expect(loadBitmarkJsonSchema('b')).resolves.toBeUndefined();
    fetchMock.mockRestore();
    warn.mockRestore();
  });
});
