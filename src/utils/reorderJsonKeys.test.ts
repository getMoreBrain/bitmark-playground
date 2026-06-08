// @awa-test: PLAN-010 (reorder WASM JSON keys to match Original before diff)
import { describe, expect, it } from 'vitest';

import { reorderJsonStringToReference, reorderKeysToReference } from './reorderJsonKeys';

describe('reorderKeysToReference', () => {
  it('orders target keys to match reference, recursively', () => {
    const reference = { a: 1, b: { x: 1, y: 2 }, c: 3 };
    const target = { c: 3, b: { y: 2, x: 1 }, a: 1 };
    expect(Object.keys(reorderKeysToReference(reference, target) as object)).toEqual([
      'a',
      'b',
      'c',
    ]);
    const nested = (reorderKeysToReference(reference, target) as { b: object }).b;
    expect(Object.keys(nested)).toEqual(['x', 'y']);
  });

  it('keeps target-only keys, appended after reference-ordered keys', () => {
    const out = reorderKeysToReference({ a: 1 }, { extra: 9, a: 1 }) as object;
    expect(Object.keys(out)).toEqual(['a', 'extra']);
  });

  it('reorders object keys within array elements but preserves array order', () => {
    const reference = [{ a: 1, b: 2 }];
    const target = [
      { b: 2, a: 1 },
      { b: 5, a: 4 },
    ];
    const out = reorderKeysToReference(reference, target) as Array<object>;
    expect(out.map((o) => Object.keys(o))).toEqual([
      ['a', 'b'],
      ['b', 'a'], // index 1 has no reference element -> keeps target order
    ]);
  });

  it('returns primitives and type mismatches unchanged', () => {
    expect(reorderKeysToReference({ a: 1 }, 5)).toBe(5);
    expect(reorderKeysToReference([1], { a: 1 })).toEqual({ a: 1 });
  });
});

describe('reorderJsonStringToReference', () => {
  it('produces a 2-space JSON string with keys in reference order', () => {
    const reference = JSON.stringify({ a: 1, b: 2 });
    const target = JSON.stringify({ b: 2, a: 1 });
    expect(reorderJsonStringToReference(reference, target)).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('makes key-order-only differences identical to the reference string', () => {
    const reference = JSON.stringify([{ bit: { a: 1, b: 2 } }], undefined, 2);
    const target = JSON.stringify([{ bit: { b: 2, a: 1 } }]);
    expect(reorderJsonStringToReference(reference, target)).toBe(reference);
  });

  it('falls back to the target string when input is not valid JSON', () => {
    expect(reorderJsonStringToReference('not json', '{"b":2,"a":1}')).toBe('{"b":2,"a":1}');
    expect(reorderJsonStringToReference('{"a":1}', 'also not json')).toBe('also not json');
  });
});
