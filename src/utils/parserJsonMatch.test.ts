// @awa-test: PLAN-009-Step1 (parserJsonMatch normalization + comparison)
import { describe, expect, it } from 'vitest';

import { normalizeBitJson, parserJsonMatch } from './parserJsonMatch';

describe('normalizeBitJson', () => {
  it('drops natural-default-valued keys', () => {
    expect(normalizeBitJson({ a: 1, s: '', b: false, n: 0, arr: [], obj: {} })).toEqual({ a: 1 });
  });

  it('strips recursively and collapses nested empties (bottom-up)', () => {
    expect(normalizeBitJson({ a: { b: '' }, c: 1 })).toEqual({ c: 1 });
    expect(normalizeBitJson({ a: { b: { c: 0 } }, d: 2 })).toEqual({ d: 2 });
  });

  it('normalizes array elements but preserves length/order', () => {
    expect(normalizeBitJson({ arr: [{ x: 1, y: '' }, { z: 2 }] })).toEqual({
      arr: [{ x: 1 }, { z: 2 }],
    });
  });

  it('keeps null as-is (not a natural default)', () => {
    expect(normalizeBitJson({ a: null, b: 1 })).toEqual({ a: null, b: 1 });
  });

  it('drops `example: null` but keeps non-null example and other null keys', () => {
    expect(normalizeBitJson({ example: null, x: 1 })).toEqual({ x: 1 });
    expect(normalizeBitJson({ example: false, x: 1 })).toEqual({ x: 1 }); // false is still a default
    expect(normalizeBitJson({ example: 'hi', other: null })).toEqual({
      example: 'hi',
      other: null,
    });
  });
});

describe('parserJsonMatch', () => {
  it('ignores parser and bitmark, comparing bit only', () => {
    const original = [{ bit: { x: 1 }, bitmark: 'a', parser: { version: 'js' } }];
    const wasm = [{ bit: { x: 1 }, bitmark: 'TOTALLY DIFFERENT', parser: { version: 'wasm' } }];
    expect(parserJsonMatch(original, wasm)).toBe('match');
  });

  it('matches when only natural defaults differ', () => {
    const original = [{ bit: { x: 1, flag: false, note: '', items: [], meta: {} } }];
    const wasm = [{ bit: { x: 1 } }];
    expect(parserJsonMatch(original, wasm)).toBe('match');
  });

  it('matches when bpg has `example: null` that WASM omits', () => {
    const original = [{ bit: { x: 1, example: null } }];
    const wasm = [{ bit: { x: 1 } }];
    expect(parserJsonMatch(original, wasm)).toBe('match');
  });

  it('is object-key order independent', () => {
    expect(parserJsonMatch([{ bit: { a: 1, b: 2 } }], [{ bit: { b: 2, a: 1 } }])).toBe('match');
  });

  it('treats array element order as significant', () => {
    expect(parserJsonMatch([{ bit: { arr: [1, 2] } }], [{ bit: { arr: [2, 1] } }])).toBe(
      'mismatch',
    );
  });

  it('treats entry (bit) order as significant', () => {
    const a = [{ bit: { a: 1 } }, { bit: { b: 2 } }];
    const b = [{ bit: { b: 2 } }, { bit: { a: 1 } }];
    expect(parserJsonMatch(a, b)).toBe('mismatch');
  });

  it('mismatches on a genuine difference', () => {
    expect(parserJsonMatch([{ bit: { x: 1 } }], [{ bit: { x: 2 } }])).toBe('mismatch');
  });

  it('is neutral when either side is empty or not an array', () => {
    expect(parserJsonMatch([], [{ bit: { x: 1 } }])).toBe('neutral');
    expect(parserJsonMatch([{ bit: { x: 1 } }], [])).toBe('neutral');
    expect(parserJsonMatch(undefined, undefined)).toBe('neutral');
    expect(parserJsonMatch('x', [{ bit: {} }])).toBe('neutral');
  });
});
