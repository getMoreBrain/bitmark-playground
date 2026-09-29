import type { convertWithDetails as convertWithDetailsFn } from '@gmb/bitmark-parser';
import { describe, expect, it, vi } from 'vitest';

import { convertWithBitStarts } from './convertWithBitStarts';

const OPTIONS = { inputFormat: 'bitmark', outputFormat: 'text' } as const;

describe('convertWithBitStarts', () => {
  // @awa-test: PLAN-018-Step3 (the starts are the parser's span starts)
  it("returns the output and each bit span's start", () => {
    const convert = vi.fn();
    const convertWithDetails = vi.fn(() => ({
      output: 'one\ntwo',
      bitSpans: {
        positionEncoding: 'utf-16',
        spans: [
          { index: 0, start: 0, end: 3 },
          { index: 1, start: 4, end: 7 },
        ],
      },
    })) as unknown as typeof convertWithDetailsFn;
    expect(convertWithBitStarts(convert, convertWithDetails, 'bitmark', OPTIONS)).toEqual({
      output: 'one\ntwo',
      bitStarts: [0, 4],
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

  // @awa-test: PLAN-018-Step3 (an engine without convertWithDetails still converts)
  it('converts without positions on an engine without convertWithDetails', () => {
    const convert = vi.fn(() => 'text');
    expect(convertWithBitStarts(convert, undefined, 'x', OPTIONS)).toEqual({
      output: 'text',
      bitStarts: undefined,
    });
  });
});
