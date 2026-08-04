// @awa-test: PLAN-012-Step2 (JsRoundTripRunner bpg round-trip behaviour)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { BitmarkParserGeneratorContext } from './BitmarkParserGenerator';
import { useJsRoundTripRunner } from './JsRoundTripRunner';

const SOURCE_JSON = '[{"bit":{"type":"article"}}]';
const ROUND_TRIP_MARKUP = '[.article] round-tripped';
const ROUND_TRIP_JSON = [{ bit: { type: 'article' } }];

/** bpg convert stub: first call is json -> markup, second is markup -> json. */
const makeConvert = () =>
  vi.fn(async (input: string) =>
    input === ROUND_TRIP_MARKUP ? ROUND_TRIP_JSON : ROUND_TRIP_MARKUP,
  );

const makeWrapper = (convert: (input: string) => Promise<unknown>) => {
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

describe('useJsRoundTripRunner', () => {
  beforeEach(() => {
    bitmarkState.setEditedJson('js', '');
    bitmarkState.setJsRoundTrip('', [], undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips js.jsonAsString through bpg (json -> bitmark -> json)', async () => {
    const convert = makeConvert();
    renderHook(() => useJsRoundTripRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('js', SOURCE_JSON);

    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.json).toEqual(ROUND_TRIP_JSON);
      expect(bitmarkState.jsRoundTrip.error).toBeUndefined();
    });

    // json -> markup, then markup -> json
    expect(convert.mock.calls[0]?.[0]).toBe(SOURCE_JSON);
    expect(convert.mock.calls[1]?.[0]).toBe(ROUND_TRIP_MARKUP);
  });

  it('records the source JSON the reference was computed from', async () => {
    const convert = makeConvert();
    renderHook(() => useJsRoundTripRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('js', SOURCE_JSON);

    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.sourceJsonAsString).toBe(SOURCE_JSON);
    });
  });

  it('stores the error when a conversion rejects', async () => {
    const convert = vi.fn().mockRejectedValue(new Error('boom'));
    renderHook(() => useJsRoundTripRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('js', SOURCE_JSON);

    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.error?.message).toBe('boom');
      expect(bitmarkState.jsRoundTrip.sourceJsonAsString).toBe(SOURCE_JSON);
    });
  });

  it('errors when bpg does not return markup for the json -> bitmark leg', async () => {
    const convert = vi.fn().mockResolvedValue([{ bit: {} }]);
    renderHook(() => useJsRoundTripRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('js', SOURCE_JSON);

    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.error?.message).toBe('Expected string');
    });
    expect(convert).toHaveBeenCalledTimes(1);
  });

  it('clears the reference when js.jsonAsString becomes empty', async () => {
    const convert = makeConvert();
    renderHook(() => useJsRoundTripRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('js', SOURCE_JSON);
    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.json).toEqual(ROUND_TRIP_JSON);
    });

    bitmarkState.setEditedJson('js', '');
    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.json).toEqual([]);
      expect(bitmarkState.jsRoundTrip.sourceJsonAsString).toBe('');
      expect(bitmarkState.jsRoundTrip.error).toBeUndefined();
    });
  });

  it('does not convert when bpg is not loaded', async () => {
    const convert = makeConvert();
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
    renderHook(() => useJsRoundTripRunner(), { wrapper });

    bitmarkState.setEditedJson('js', SOURCE_JSON);
    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });

  it('does not let a slower earlier round trip overwrite a later one', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    // json -> markup resolves immediately; markup -> json is held open per call.
    const convert = vi.fn(async (input: string) => {
      if (input !== ROUND_TRIP_MARKUP) return ROUND_TRIP_MARKUP;
      return new Promise((resolve) => resolvers.push(resolve));
    });
    renderHook(() => useJsRoundTripRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedJson('js', SOURCE_JSON);
    await waitFor(() => expect(resolvers).toHaveLength(1));

    bitmarkState.setEditedJson('js', `${SOURCE_JSON} `);
    await waitFor(() => expect(resolvers).toHaveLength(2));

    // Newer run lands first, then the older one completes.
    resolvers[1]([{ bit: { type: 'newer' } }]);
    await waitFor(() => {
      expect(bitmarkState.jsRoundTrip.json).toEqual([{ bit: { type: 'newer' } }]);
    });

    resolvers[0]([{ bit: { type: 'older' } }]);
    await new Promise((r) => setTimeout(r, 10));
    expect(bitmarkState.jsRoundTrip.json).toEqual([{ bit: { type: 'newer' } }]);
  });
});
