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
    loadError: false,
    lex: undefined,
    parse: undefined,
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
            lex: undefined,
            parse: undefined,
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
