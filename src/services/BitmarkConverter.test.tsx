// @awa-test: PLAN-008-Step2 (round-trip recalculation: forward + per-tab back-fill, keep-last-good)
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { bitmarkState, ParserType } from '../state/bitmarkState';
import { useBitmarkConverter } from './BitmarkConverter';
import { BitmarkParserContext } from './BitmarkParser';
import { BitmarkParserGeneratorContext } from './BitmarkParserGenerator';

// Fake JS parser (bpg): markup->json returns an array (detected by jsonOptions),
// json->markup returns a string (detected by bitmarkOptions). Throws on 'BAD'.
const fakeBpg = {
  convert: async (input: string, options?: { jsonOptions?: unknown; bitmarkOptions?: unknown }) => {
    if (input === 'BAD') throw new Error('bpg bad');
    if (options?.jsonOptions) return [{ bit: { kind: 'js', src: input } }];
    return `js<<${input}>>`;
  },
} as unknown as Parameters<
  typeof BitmarkParserGeneratorContext.Provider
>[0]['value']['bitmarkParserGenerator'];

const fakeWasm = {
  loadSuccess: true,
  loadError: false,
  version: 'test',
  lex: () => 'lexout',
  parse: (markup: string, opts?: { mode?: string }) => {
    if (markup === 'BAD') throw new Error('wasm parse bad');
    return JSON.stringify([{ kind: 'wasm', mode: opts?.mode, src: markup }]);
  },
  convert: (json: string, opts?: { mode?: string }) => {
    if (json === 'BAD') throw new Error('wasm convert bad');
    return `wasm<<${opts?.mode}:${json}>>`;
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BitmarkParserGeneratorContext.Provider
    value={{ loadSuccess: true, loadError: false, bitmarkParserGenerator: fakeBpg }}
  >
    <BitmarkParserContext.Provider value={fakeWasm}>{children}</BitmarkParserContext.Provider>
  </BitmarkParserGeneratorContext.Provider>
);

const reset = () => {
  for (const p of ['js', 'wasm', 'wasmFull'] as ParserType[]) {
    bitmarkState.setEditedMarkup(p, '');
    bitmarkState.setEditedJson(p, '');
  }
};

describe('useBitmarkConverter — round-trip recalculation', () => {
  beforeEach(reset);

  it('jsonToMarkup keeps the edited tab verbatim and recalculates (not copies) other JSON tabs', async () => {
    const { result } = renderHook(() => useBitmarkConverter(), { wrapper });

    await act(async () => {
      await result.current.jsonToMarkup('js', 'J');
    });

    // Edited tab: JSON kept verbatim, cross-side markup computed.
    expect(bitmarkState.js.jsonAsString).toBe('J');
    expect(bitmarkState.js.markup).toBe('js<<J>>');

    // Cross-side markup for the other tabs (forward, from source J).
    expect(bitmarkState.wasm.markup).toBe('wasm<<optimized:J>>');
    expect(bitmarkState.wasmFull.markup).toBe('wasm<<full:J>>');

    // Same-side JSON for the other tabs is BACK-CALCULATED (round-trip), not a copy of 'J'.
    expect(bitmarkState.wasm.jsonAsString).not.toBe('J');
    expect(bitmarkState.wasm.jsonAsString).toContain('wasm<<optimized:J>>');
    expect(bitmarkState.wasmFull.jsonAsString).toContain('wasm<<full:J>>');
  });

  it('markupToJson keeps the edited tab verbatim and recalculates (not copies) other bitmark tabs', async () => {
    const { result } = renderHook(() => useBitmarkConverter(), { wrapper });

    await act(async () => {
      await result.current.markupToJson('js', 'M');
    });

    // Edited tab: markup kept verbatim, cross-side json computed.
    expect(bitmarkState.js.markup).toBe('M');
    expect(bitmarkState.js.jsonAsString).toContain('"src": "M"');

    // Same-side markup for the other tabs is BACK-CALCULATED, not a copy of 'M'.
    expect(bitmarkState.wasm.markup).not.toBe('M');
    expect(bitmarkState.wasm.markup.startsWith('wasm<<optimized:')).toBe(true);
  });

  it('threads the edited tab: editing wasm leaves wasm verbatim, back-fills the others', async () => {
    const { result } = renderHook(() => useBitmarkConverter(), { wrapper });

    await act(async () => {
      await result.current.markupToJson('wasm', 'M');
    });

    expect(bitmarkState.wasm.markup).toBe('M'); // edited tab verbatim
    expect(bitmarkState.js.markup).not.toBe('M'); // back-filled
    expect(bitmarkState.js.markup.startsWith('js<<')).toBe(true);
  });

  it('keeps last good value on the same side when the edit fails to convert', async () => {
    const { result } = renderHook(() => useBitmarkConverter(), { wrapper });

    // Seed a good round-trip first.
    await act(async () => {
      await result.current.jsonToMarkup('js', 'GOOD');
    });
    const goodWasmJson = bitmarkState.wasm.jsonAsString;
    expect(goodWasmJson).toContain('wasm<<optimized:GOOD>>');

    // Now edit Original JSON with input that fails to convert.
    await act(async () => {
      await result.current.jsonToMarkup('js', 'BAD');
    });

    // Cross-side (bitmark) shows the error.
    expect(bitmarkState.js.markupError).toBeDefined();
    // Same-side non-edited JSON tab keeps its last good value (no copy, no clear).
    expect(bitmarkState.wasm.jsonAsString).toBe(goodWasmJson);
  });
});
