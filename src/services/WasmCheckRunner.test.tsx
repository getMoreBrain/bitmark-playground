// @awa-test: PLAN-006-Step2 (WasmCheckRunner round-trip behaviour)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { BitmarkParserGeneratorContext } from './BitmarkParserGenerator';
import { useWasmCheckRunner } from './WasmCheckRunner';

const ROUND_TRIPPED_MARKUP = '[.article] round-tripped';

const makeWrapper = (convert: (json: string) => Promise<string>) => {
  const fakeParser = { convert } as unknown as Parameters<
    typeof BitmarkParserGeneratorContext.Provider
  >[0]['value']['bitmarkParserGenerator'];

  return ({ children }: { children: React.ReactNode }) => (
    <BitmarkParserGeneratorContext.Provider
      value={{
        loadSuccess: true,
        loadError: false,
        bitmarkParserGenerator: fakeParser,
      }}
    >
      {children}
    </BitmarkParserGeneratorContext.Provider>
  );
};

describe('useWasmCheckRunner', () => {
  beforeEach(() => {
    // Reset wasm and wasmCheck slices to clean state
    bitmarkState.syncJsonInput('');
    bitmarkState.setWasmCheck('', undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs convert when wasm.jsonAsString changes and stores the markup', async () => {
    const convert = vi.fn().mockResolvedValue(ROUND_TRIPPED_MARKUP);
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.syncJsonInput('{"x":1}');

    await waitFor(() => {
      expect(convert).toHaveBeenCalledWith('{"x":1}', expect.any(Object));
      expect(bitmarkState.wasmCheck.markup).toBe(ROUND_TRIPPED_MARKUP);
      expect(bitmarkState.wasmCheck.markupError).toBeUndefined();
    });
  });

  it('stores error when JS parser convert rejects', async () => {
    const convert = vi.fn().mockRejectedValue(new Error('boom'));
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.syncJsonInput('garbage');

    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markupError).toBeDefined();
      expect(bitmarkState.wasmCheck.markupError?.message).toBe('boom');
      expect(bitmarkState.wasmCheck.markupErrorAsString).toContain('boom');
    });
  });

  it('clears wasmCheck when wasm.jsonAsString becomes empty', async () => {
    const convert = vi.fn().mockResolvedValue(ROUND_TRIPPED_MARKUP);
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.syncJsonInput('{"x":1}');
    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markup).toBe(ROUND_TRIPPED_MARKUP);
    });

    bitmarkState.syncJsonInput('');
    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markup).toBe('');
      expect(bitmarkState.wasmCheck.markupError).toBeUndefined();
    });
  });

  it('does not call convert when parser is not loaded', async () => {
    const convert = vi.fn().mockResolvedValue(ROUND_TRIPPED_MARKUP);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BitmarkParserGeneratorContext.Provider
        value={{
          loadSuccess: false,
          loadError: false,
          bitmarkParserGenerator: undefined,
        }}
      >
        {children}
      </BitmarkParserGeneratorContext.Provider>
    );
    renderHook(() => useWasmCheckRunner(), { wrapper });

    bitmarkState.syncJsonInput('{"x":1}');
    // small wait to confirm no microtask runs convert
    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });
});
