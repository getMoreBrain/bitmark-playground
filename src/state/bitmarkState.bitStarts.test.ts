// @awa-test: PLAN-018-Step2 (positions travel with their text)
import { describe, expect, it } from 'vitest';

import { bitmarkState } from './bitmarkState';

describe('bitmarkState bit starts', () => {
  it('records where each bit starts in the JSON text it writes', () => {
    const json = [{ bit: { type: 'article' } }, { bit: { type: 'cloze' } }];
    bitmarkState.setJson('wasm', json as never, undefined);
    const { jsonAsString, jsonBitStarts } = bitmarkState.wasm;
    expect(jsonAsString).toBe(JSON.stringify(json, undefined, 2));
    expect(jsonBitStarts?.map((start) => jsonAsString[start])).toEqual(['{', '{']);
  });

  it('forgets the JSON positions when the user types the JSON', () => {
    bitmarkState.setJson('wasm', [{ bit: {} }] as never, undefined);
    bitmarkState.setEditedJson('wasm', '[{"bit": {}}]');
    expect(bitmarkState.wasm.jsonBitStarts).toBeUndefined();
  });
});
