// @awa-test: PLAN-015-Step3 (per-bit info for the current WASM JSON)
import type { BitWrapperJson } from '@gmb/bitmark-parser-generator';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { BitmarkParserContext } from './BitmarkParser';
import { bitNamesOf, useInfoRunner } from './InfoRunner';

type ContextValue = Parameters<typeof BitmarkParserContext.Provider>[0]['value'];

const wrap = (json: unknown): BitWrapperJson[] => json as BitWrapperJson[];

const bits = (...types: string[]): BitWrapperJson[] =>
  wrap(types.map((type) => ({ bit: { type } })));

const makeWrapper = (info: (options?: unknown) => string) => {
  const value = {
    loadSuccess: true,
    loadError: false,
    bitmarkToObjects: undefined,
    convert: undefined,
    info,
    version: 'test',
  } as unknown as ContextValue;

  return ({ children }: { children: React.ReactNode }) => (
    <BitmarkParserContext.Provider value={value}>{children}</BitmarkParserContext.Provider>
  );
};

describe('bitNamesOf', () => {
  it('collects distinct bit names in first-occurrence order', () => {
    expect(bitNamesOf(bits('article', 'cloze', 'article', 'quote'))).toEqual([
      'article',
      'cloze',
      'quote',
    ]);
  });

  it('skips entries without a bit type', () => {
    expect(bitNamesOf(wrap([{ bit: {} }, {}, { bit: { type: '' } }, { bit: { type: 'a' } }]))) //
      .toEqual(['a']);
  });
});

describe('useInfoRunner', () => {
  beforeEach(() => {
    bitmarkState.setInfo('', undefined, undefined);
    bitmarkState.setJson('wasm', [], undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('concatenates info output for each distinct bit name', async () => {
    const info = vi.fn((options?: unknown) => `INFO ${(options as { bit: string }).bit}`);
    renderHook(() => useInfoRunner(), { wrapper: makeWrapper(info) });

    bitmarkState.setJson('wasm', bits('article', 'cloze'), undefined);

    await waitFor(() => {
      expect(bitmarkState.info.output).toBe('INFO article\n\nINFO cloze');
    });
    expect(info).toHaveBeenCalledWith({ infoType: 'bit', bit: 'article' });
    expect(info).toHaveBeenCalledWith({ infoType: 'bit', bit: 'cloze' });
  });

  it('queries duplicate bit types only once', async () => {
    const info = vi.fn((options?: unknown) => `INFO ${(options as { bit: string }).bit}`);
    renderHook(() => useInfoRunner(), { wrapper: makeWrapper(info) });

    bitmarkState.setJson('wasm', bits('article', 'article'), undefined);

    await waitFor(() => {
      expect(bitmarkState.info.output).toBe('INFO article');
    });
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the JSON is regenerated', async () => {
    const info = vi.fn((options?: unknown) => `INFO ${(options as { bit: string }).bit}`);
    renderHook(() => useInfoRunner(), { wrapper: makeWrapper(info) });

    bitmarkState.setJson('wasm', bits('article'), undefined);
    await waitFor(() => expect(bitmarkState.info.output).toBe('INFO article'));

    bitmarkState.setJson('wasm', bits('cloze'), undefined);
    await waitFor(() => expect(bitmarkState.info.output).toBe('INFO cloze'));
  });

  it('reports a failing bit inline without discarding the others', async () => {
    const info = vi.fn((options?: unknown) => {
      const bit = (options as { bit: string }).bit;
      if (bit === 'unknown-bit') return 'error: unknown bit';
      return `INFO ${bit}`;
    });
    renderHook(() => useInfoRunner(), { wrapper: makeWrapper(info) });

    bitmarkState.setJson('wasm', bits('article', 'unknown-bit'), undefined);

    await waitFor(() => {
      expect(bitmarkState.info.output).toContain('INFO article');
    });
    expect(bitmarkState.info.output).toContain('[unknown-bit] info failed: unknown bit');
    expect(bitmarkState.info.outputError).toBeUndefined();
  });

  it('clears the output when the JSON contains no bits', async () => {
    const info = vi.fn(() => 'INFO');
    renderHook(() => useInfoRunner(), { wrapper: makeWrapper(info) });

    bitmarkState.setJson('wasm', bits('article'), undefined);
    await waitFor(() => expect(bitmarkState.info.output).toBe('INFO'));

    bitmarkState.setJson('wasm', [], undefined);
    await waitFor(() => expect(bitmarkState.info.output).toBe(''));
  });

  it('keeps the last good output when the parse failed', async () => {
    const info = vi.fn((options?: unknown) => `INFO ${(options as { bit: string }).bit}`);
    renderHook(() => useInfoRunner(), { wrapper: makeWrapper(info) });

    bitmarkState.setJson('wasm', bits('article'), undefined);
    await waitFor(() => expect(bitmarkState.info.output).toBe('INFO article'));

    bitmarkState.setJson('wasm', undefined, new Error('parse failed'));
    await new Promise((r) => setTimeout(r, 10));
    expect(bitmarkState.info.output).toBe('INFO article');
  });

  it('does not run when the parser is not loaded', async () => {
    const info = vi.fn(() => 'INFO');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BitmarkParserContext.Provider
        value={{ loadSuccess: false, loadError: false, info: undefined } as unknown as ContextValue}
      >
        {children}
      </BitmarkParserContext.Provider>
    );
    renderHook(() => useInfoRunner(), { wrapper });

    bitmarkState.setJson('wasm', bits('article'), undefined);
    await new Promise((r) => setTimeout(r, 10));
    expect(info).not.toHaveBeenCalled();
  });
});
