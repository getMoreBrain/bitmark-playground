import type { convertWithDetails as convertWithDetailsFn } from '@gmb/bitmark-parser';
import { describe, expect, it, vi } from 'vitest';

import { convertWithBitStarts } from './convertWithBitStarts';

const OPTIONS = { inputFormat: 'bitmark', outputFormat: 'text' } as const;

describe('convertWithBitStarts', () => {
  it("returns the output and each bit span's output and input start", () => {
    const convert = vi.fn();
    const convertWithDetails = vi.fn(() => ({
      output: 'one\ntwo',
      bitSpans: {
        positionEncoding: 'utf-16',
        spans: [
          { index: 0, inputStart: 1, inputEnd: 5, outputStart: 0, outputEnd: 3 },
          { index: 1, inputStart: 7, inputEnd: 9, outputStart: 4, outputEnd: 7 },
        ],
      },
    })) as unknown as typeof convertWithDetailsFn;
    expect(convertWithBitStarts(convert, convertWithDetails, 'bitmark', OPTIONS)).toEqual({
      output: 'one\ntwo',
      bitStarts: [0, 4],
      inputStarts: [1, 7],
    });
    expect(convertWithDetails).toHaveBeenCalledWith('bitmark', { ...OPTIONS, bitSpans: true });
    expect(convert).not.toHaveBeenCalled();
  });

  it('throws on a parser error string', () => {
    const convertWithDetails = vi.fn(() => ({
      output: 'error: boom',
    })) as unknown as typeof convertWithDetailsFn;
    expect(() => convertWithBitStarts(vi.fn(), convertWithDetails, 'x', OPTIONS)).toThrow('boom');
  });

  it('converts without positions on an engine without convertWithDetails', () => {
    const convert = vi.fn(() => 'text');
    expect(convertWithBitStarts(convert, undefined, 'x', OPTIONS)).toEqual({
      output: 'text',
      bitStarts: undefined,
      inputStarts: undefined,
    });
  });

  it('gives no positions for spans without input / output starts', () => {
    const convertWithDetails = vi.fn(() => ({
      output: 'one',
      bitSpans: { positionEncoding: 'utf-16', spans: [{ index: 0, start: 0, end: 3 }] },
    })) as unknown as typeof convertWithDetailsFn;
    expect(convertWithBitStarts(vi.fn(), convertWithDetails, 'x', OPTIONS)).toEqual({
      output: 'one',
      bitStarts: undefined,
      inputStarts: undefined,
    });
  });
});
