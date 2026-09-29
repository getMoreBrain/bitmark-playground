// @awa-test: PLAN-011-Step2 (TextRunner WASM-opt-bitmark -> text behaviour)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { BitmarkParserContext } from './BitmarkParser';
import { useTextRunner } from './TextRunner';

type ContextValue = Parameters<typeof BitmarkParserContext.Provider>[0]['value'];

const makeWrapper = (convert: (input: string, options?: unknown) => string) => {
  const value = {
    loadSuccess: true,
    markupReady: true,
    loadError: false,
    bitmarkToObjects: undefined,
    convert,
    version: 'test',
  } as unknown as ContextValue;

  return ({ children }: { children: React.ReactNode }) => (
    <BitmarkParserContext.Provider value={value}>{children}</BitmarkParserContext.Provider>
  );
};

describe('useTextRunner', () => {
  beforeEach(() => {
    bitmarkState.setEditedMarkup('wasm', '');
    bitmarkState.setText('', undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts WASM markup to text when wasm.markup changes', async () => {
    const convert = vi.fn().mockReturnValue('plain text');
    renderHook(() => useTextRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', '[.article] hi');

    await waitFor(() => {
      expect(convert).toHaveBeenCalledWith(
        '[.article] hi',
        expect.objectContaining({ inputFormat: 'bitmark', outputFormat: 'text' }),
      );
      expect(bitmarkState.text.text).toBe('plain text');
      expect(bitmarkState.text.textError).toBeUndefined();
    });
  });

  // @awa-test: PLAN-018-Step3 (the text is stored with its bit starts)
  it('stores the bit starts from convertWithDetails with the text', async () => {
    const convertWithDetails = vi.fn().mockReturnValue({
      output: 'one\ntwo',
      bitSpans: {
        positionEncoding: 'utf-16',
        spans: [
          { index: 0, inputStart: 0, inputEnd: 3, outputStart: 0, outputEnd: 3 },
          { index: 1, inputStart: 5, inputEnd: 8, outputStart: 4, outputEnd: 7 },
        ],
      },
    });
    const value = {
      loadSuccess: true,
      markupReady: true,
      loadError: false,
      convert: vi.fn(),
      convertWithDetails,
      version: 'test',
    } as unknown as ContextValue;
    renderHook(() => useTextRunner(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <BitmarkParserContext.Provider value={value}>{children}</BitmarkParserContext.Provider>
      ),
    });

    bitmarkState.setEditedMarkup('wasm', '[.article] one\n\n[.article] two');

    await waitFor(() => {
      expect(bitmarkState.text.text).toBe('one\ntwo');
      expect(bitmarkState.text.textBitStarts).toEqual([0, 4]);
    });
  });

  it('stores error when the conversion throws', async () => {
    const convert = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    renderHook(() => useTextRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', 'bad');

    await waitFor(() => {
      expect(bitmarkState.text.textError?.message).toBe('boom');
      expect(bitmarkState.text.textErrorAsString).toContain('boom');
    });
  });

  it('stores an error when the conversion returns an `error:` string', async () => {
    const convert = vi
      .fn()
      .mockReturnValue('error: InvalidJson at offset 0: unexpected end of input');
    renderHook(() => useTextRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', 'bad');

    await waitFor(() => {
      expect(bitmarkState.text.textError?.message).toContain('InvalidJson');
    });
    // The error message must never be shown as the converted text.
    expect(bitmarkState.text.text).not.toContain('InvalidJson');
  });

  it('clears text when wasm.markup becomes empty', async () => {
    const convert = vi.fn().mockReturnValue('t');
    renderHook(() => useTextRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', '[.article] hi');
    await waitFor(() => expect(bitmarkState.text.text).toBe('t'));

    bitmarkState.setEditedMarkup('wasm', '');
    await waitFor(() => {
      expect(bitmarkState.text.text).toBe('');
      expect(bitmarkState.text.textError).toBeUndefined();
    });
  });

  it('does not convert when the parser is not loaded', async () => {
    const convert = vi.fn().mockReturnValue('t');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BitmarkParserContext.Provider
        value={
          {
            loadSuccess: false,
            loadError: false,
            bitmarkToObjects: undefined,
            convert: undefined,
            version: '',
          } as unknown as ContextValue
        }
      >
        {children}
      </BitmarkParserContext.Provider>
    );
    renderHook(() => useTextRunner(), { wrapper });

    bitmarkState.setEditedMarkup('wasm', '[.article] hi');
    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });
});
