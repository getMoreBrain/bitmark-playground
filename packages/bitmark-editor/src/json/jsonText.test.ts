import { describe, expect, it } from 'vitest';

import { jsonWithBitStarts } from './jsonText';

const CASES: Record<string, unknown[]> = {
  empty: [],
  'one bit': [{ bit: { type: 'article', body: 'Hello' } }],
  'many bits': [
    { bit: { type: 'article', body: 'a' } },
    { bit: { type: 'cloze', body: [{ type: 'gap', solutions: ['x', 'y'] }] } },
    { bit: { type: '_error' }, errors: [] },
  ],
  'non-ASCII and escapes': [
    { bit: { body: 'Grüße 🎉 "quoted" \\ back\nnewline {[' } },
    { bit: { body: '日本語' } },
  ],
  'empty containers and non-JSON values': [{}, [], null, 1, 'x', undefined],
};

describe('jsonWithBitStarts', () => {
  it.each(Object.entries(CASES))('writes what JSON.stringify writes: %s', (_name, bits) => {
    expect(jsonWithBitStarts(bits).text).toBe(JSON.stringify(bits, undefined, 2));
  });

  it.each(Object.entries(CASES))('records where each bit starts: %s', (_name, bits) => {
    const { text, bitStarts } = jsonWithBitStarts(bits);
    expect(bitStarts).toHaveLength(bits.length);
    bitStarts.forEach((start, i) => {
      const element = JSON.stringify(bits[i], undefined, 2) ?? 'null';
      const firstLine = element.split('\n')[0]!;
      expect(text.slice(start, start + firstLine.length)).toBe(firstLine);
    });
  });
});
