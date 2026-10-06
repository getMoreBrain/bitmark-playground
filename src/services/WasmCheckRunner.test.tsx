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
    bitmarkState.setEditedJson('wasm', '');
    bitmarkState.setWasmCheck('', undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs convert when wasm.jsonAsString changes and stores the markup', async () => {
    const convert = vi.fn().mockResolvedValue(ROUND_TRIPPED_MARKUP);
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('wasm', '{"x":1}');

    await waitFor(() => {
      expect(convert).toHaveBeenCalledWith('{"x":1}', expect.any(Object));
      expect(bitmarkState.wasmCheck.markup).toBe(ROUND_TRIPPED_MARKUP);
      expect(bitmarkState.wasmCheck.markupError).toBeUndefined();
    });
  });

  it('converts once, on the last JSON, after a burst of changes', async () => {
    const convert = vi.fn().mockResolvedValue(ROUND_TRIPPED_MARKUP);
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    for (const json of ['{"x":1}', '{"x":2}', '{"x":3}']) {
      bitmarkState.setEditedJson('wasm', json);
      // Let valtio deliver each change on its own.
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(convert).not.toHaveBeenCalled();

    await waitFor(() => expect(bitmarkState.wasmCheck.markup).toBe(ROUND_TRIPPED_MARKUP));
    expect(convert).toHaveBeenCalledTimes(1);
    expect(convert).toHaveBeenCalledWith('{"x":3}', expect.any(Object));
  });

  it('stores error when JS parser convert rejects', async () => {
    const convert = vi.fn().mockRejectedValue(new Error('boom'));
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('wasm', 'garbage');

    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markupError).toBeDefined();
      expect(bitmarkState.wasmCheck.markupError?.message).toBe('boom');
      expect(bitmarkState.wasmCheck.markupErrorAsString).toContain('boom');
    });
  });

  it('clears wasmCheck when wasm.jsonAsString becomes empty', async () => {
    const convert = vi.fn().mockResolvedValue(ROUND_TRIPPED_MARKUP);
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('wasm', '{"x":1}');
    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markup).toBe(ROUND_TRIPPED_MARKUP);
    });

    bitmarkState.setEditedJson('wasm', '');
    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markup).toBe('');
      expect(bitmarkState.wasmCheck.markupError).toBeUndefined();
    });
  });

  it('does not let a slower earlier convert overwrite a later one', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    const convert = vi.fn(() => new Promise((resolve) => resolvers.push(resolve)));
    renderHook(() => useWasmCheckRunner(), { wrapper: makeWrapper(convert as never) });

    bitmarkState.setEditedJson('wasm', '{"x":1}');
    await waitFor(() => expect(resolvers).toHaveLength(1));

    bitmarkState.setEditedJson('wasm', '{"x":2}');
    await waitFor(() => expect(resolvers).toHaveLength(2));

    // Newer run lands first, then the older one completes.
    resolvers[1]('newer markup');
    await waitFor(() => {
      expect(bitmarkState.wasmCheck.markup).toBe('newer markup');
    });

    resolvers[0]('older markup');
    await new Promise((r) => setTimeout(r, 10));
    expect(bitmarkState.wasmCheck.markup).toBe('newer markup');
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

    bitmarkState.setEditedJson('wasm', '{"x":1}');
    // small wait to confirm no microtask runs convert
    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });
});
