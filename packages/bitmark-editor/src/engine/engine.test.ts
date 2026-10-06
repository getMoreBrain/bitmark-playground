import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBitmarkEngine } from './createBitmarkEngine';
import {
  DEFAULT_PARSER_VERSION,
  loadBitmarkEngine,
  loadBitmarkModule,
  parserCdnUrl,
  resetLoadedModules,
} from './loadBitmarkEngine';
import { BitmarkEngineError, RawParserModule } from './types';

const BITS = [{ bit: { type: 'article', body: 'Hello' } }, { bit: { type: 'note', body: 'x' } }];

/** A fake parser module; `full` adds the editor services and positions. */
const fakeModule = (full = true): RawParserModule & { init: ReturnType<typeof vi.fn> } => {
  const base = {
    init: vi.fn(async () => {}),
    version: () => '9.9.9',
    bitmarkToObjects: vi.fn(() => BITS),
    convert: vi.fn((input: string) => (input === 'bad' ? 'error: broken input' : `out:${input}`)),
    semanticTokens: vi.fn(() => ({ layout: 'absolute', tokens: [] })),
  };
  if (!full) return base as unknown as RawParserModule & { init: ReturnType<typeof vi.fn> };
  return {
    ...base,
    convertWithDetails: vi.fn((input: string) => ({
      output: `out:${input}`,
      bitSpans: {
        positionEncoding: 'utf-16',
        spans: [
          { index: 0, start: 0, end: 3 },
          { index: 1, start: 5, end: 9 },
        ],
      },
    })),
    splitBits: vi.fn(() => [{ index: 0, start: 0, end: 1, byteStart: 0, byteEnd: 1, source: 'x' }]),
    diagnostics: vi.fn(() => ({ positionEncoding: 'utf-16', diagnostics: [] })),
    complete: vi.fn(() => ({ isIncomplete: false, items: [] })),
    resolve: vi.fn((_i: string, _p: unknown, item: unknown) => item),
    hover: vi.fn(() => null),
    info: vi.fn(() => 'bit info'),
  } as unknown as RawParserModule & { init: ReturnType<typeof vi.fn> };
};

describe('createBitmarkEngine (injection, PLAN-022 D7)', () => {
  it('never calls init on a module it was given', () => {
    const module = fakeModule();
    createBitmarkEngine(module);
    expect(module.init).not.toHaveBeenCalled();
  });

  it('takes the declared feature, defaulting to bitmark-json (no markup formats)', () => {
    expect(createBitmarkEngine(fakeModule()).feature).toBe('bitmark-json');
    expect(createBitmarkEngine(fakeModule()).markupFormats).toBe(false);
    expect(createBitmarkEngine(fakeModule(), { feature: 'full' }).markupFormats).toBe(true);
  });

  it('setFeature notifies listeners once per change', () => {
    const engine = createBitmarkEngine(fakeModule());
    const listener = vi.fn();
    const off = engine.onFeatureChange(listener);
    engine.setFeature('full');
    engine.setFeature('full');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('full');
    off();
    engine.setFeature('browser-full');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns promises, and rejects a parser error string with BitmarkEngineError', async () => {
    const engine = createBitmarkEngine(fakeModule());
    await expect(engine.convert('ok', { outputFormat: 'json' })).resolves.toBe('out:ok');
    await expect(engine.convert('bad', { outputFormat: 'json' })).rejects.toBeInstanceOf(
      BitmarkEngineError,
    );
    await expect(engine.convert('bad', { outputFormat: 'json' })).rejects.toThrow('broken input');
  });

  it('turns a synchronous throw into a rejection', async () => {
    const module = fakeModule();
    module.bitmarkToObjects = vi.fn(() => {
      throw new Error('boom');
    }) as unknown as RawParserModule['bitmarkToObjects'];
    await expect(createBitmarkEngine(module).bitmarkToObjects('x')).rejects.toThrow('boom');
  });

  it('writes the JSON text as JSON.stringify does, with the bit starts', async () => {
    const { text, bitStarts } = await createBitmarkEngine(fakeModule()).bitmarkToJsonText('x');
    expect(text).toBe(JSON.stringify(BITS, undefined, 2));
    expect(bitStarts).toHaveLength(2);
    expect(text.slice(bitStarts[1])).toMatch(/^\{/);
  });

  it('converts with bit starts when the parser has convertWithDetails, without otherwise', async () => {
    const opts = { outputFormat: 'html' as const };
    await expect(
      createBitmarkEngine(fakeModule()).convertWithBitStarts('x', opts),
    ).resolves.toEqual({
      output: 'out:x',
      bitStarts: [0, 5],
    });
    await expect(
      createBitmarkEngine(fakeModule(false)).convertWithBitStarts('x', opts),
    ).resolves.toEqual({ output: 'out:x', bitStarts: undefined });
  });

  it('reads outputStart (parser 7.8+) and start (older) from the bit spans', async () => {
    const module = fakeModule();
    module.convertWithDetails = vi.fn(() => ({
      output: 'out',
      bitSpans: {
        positionEncoding: 'utf-16',
        spans: [{ index: 0, inputStart: 0, inputEnd: 2, outputStart: 7, outputEnd: 9 }],
      },
    })) as unknown as RawParserModule['convertWithDetails'];
    await expect(
      createBitmarkEngine(module).convertWithBitStarts('x', { outputFormat: 'text' }),
    ).resolves.toEqual({
      output: 'out',
      bitStarts: [7],
      // Where the bit starts in the input (parser PLAN-223, main's PLAN-020).
      inputStarts: [0],
    });
    // An older parser's spans (`start` only): output positions, no input ones.
    module.convertWithDetails = vi.fn(() => ({
      output: 'out',
      bitSpans: { positionEncoding: 'utf-16', spans: [{ index: 0, start: 5, end: 6 }] },
    })) as unknown as RawParserModule['convertWithDetails'];
    await expect(
      createBitmarkEngine(module).convertWithBitStarts('x', { outputFormat: 'text' }),
    ).resolves.toEqual({ output: 'out', bitStarts: [5], inputStarts: undefined });
  });

  it('answers undefined, and reports no capability, for exports an older parser lacks', async () => {
    const engine = createBitmarkEngine(fakeModule(false));
    expect(engine.capabilities).toEqual({
      bitPositions: false,
      diagnostics: false,
      complete: false,
      resolve: false,
      hover: false,
      info: false,
    });
    const at = { line: 0, character: 0 };
    await expect(engine.diagnostics('x')).resolves.toBeUndefined();
    await expect(engine.complete('x', at)).resolves.toBeUndefined();
    await expect(engine.hover('x', at)).resolves.toBeUndefined();
    await expect(engine.splitBits('x')).resolves.toBeUndefined();
    await expect(engine.info({ infoType: 'list' })).resolves.toBeUndefined();
  });

  it('asks the parser for UTF-16 positions and absolute tokens', async () => {
    const module = fakeModule();
    const engine = createBitmarkEngine(module);
    await engine.semanticTokens('x');
    await engine.diagnostics('x');
    await engine.complete('x', { line: 0, character: 1 }, { triggerCharacter: '[' });
    expect(module.semanticTokens).toHaveBeenCalledWith('x', {
      positionEncoding: 'utf-16',
      tokensLayout: 'absolute',
    });
    expect(module.diagnostics).toHaveBeenCalledWith('x', { positionEncoding: 'utf-16' });
    expect(module.complete).toHaveBeenCalledWith(
      'x',
      { line: 0, character: 1 },
      { positionEncoding: 'utf-16', triggerCharacter: '[' },
    );
  });
});

describe('loadBitmarkModule / loadBitmarkEngine (the load path)', () => {
  afterEach(() => resetLoadedModules());

  it('defaults to the pinned parser version on jsDelivr', () => {
    expect(parserCdnUrl()).toBe(
      `https://cdn.jsdelivr.net/npm/@gmb/bitmark-parser@${DEFAULT_PARSER_VERSION}/dist/browser/bitmark-parser.min.js`,
    );
    expect(DEFAULT_PARSER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('initialises bitmark-json first, then the stage-2 variant', async () => {
    const module = fakeModule();
    const { stage2 } = await loadBitmarkModule('u1', { importModule: async () => module });
    await expect(stage2).resolves.toBe('full');
    expect(module.init.mock.calls.map((c) => c[0])).toEqual([
      { feature: 'bitmark-json' },
      { feature: 'full' },
    ]);
  });

  it('loads each URL once', async () => {
    const importModule = vi.fn(async () => fakeModule());
    await loadBitmarkModule('u2', { importModule });
    await loadBitmarkModule('u2', { importModule });
    await loadBitmarkModule('u3', { importModule });
    expect(importModule).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed load', async () => {
    const importModule = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(fakeModule());
    await expect(loadBitmarkModule('u4', { importModule })).rejects.toThrow('offline');
    await expect(loadBitmarkModule('u4', { importModule })).resolves.toBeDefined();
  });

  it('gives an engine at stage 1 that switches to the stage-2 variant', async () => {
    let finishStage2: () => void = () => {};
    const module = fakeModule();
    module.init.mockImplementation(async ({ feature }: { feature: string }) => {
      if (feature !== 'bitmark-json') await new Promise<void>((r) => (finishStage2 = r));
    });
    const engine = await loadBitmarkEngine({ url: 'u5', importModule: async () => module });
    expect(engine.feature).toBe('bitmark-json');
    const changed = new Promise((r) => engine.onFeatureChange(r));
    finishStage2();
    await expect(changed).resolves.toBe('full');
    expect(engine.markupFormats).toBe(true);
  });

  it('keeps the stage-1 engine when stage 2 fails', async () => {
    const module = fakeModule();
    module.init.mockImplementation(async ({ feature }: { feature: string }) => {
      if (feature !== 'bitmark-json') throw new Error('full variant missing');
    });
    const engine = await loadBitmarkEngine({ url: 'u6', importModule: async () => module });
    await new Promise((r) => setTimeout(r, 0));
    expect(engine.feature).toBe('bitmark-json');
    await expect(engine.bitmarkToObjects('x')).resolves.toEqual(BITS);
  });
});
