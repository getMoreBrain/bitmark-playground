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

  // @awa-test: PLAN-020-Step2 (the typed JSON's positions, only for that text)
  it('stores the positions the typed JSON was read with, unless it has changed since', () => {
    bitmarkState.setEditedJson('wasm', '[{"bit": {}}]');
    bitmarkState.setEditedJsonBitStarts('wasm', '[{"bit": {}}]', [1]);
    expect(bitmarkState.wasm.jsonBitStarts).toEqual([1]);
    // A later edit: positions of the earlier text are ignored.
    bitmarkState.setEditedJson('wasm', '[ {"bit": {}}]');
    bitmarkState.setEditedJsonBitStarts('wasm', '[{"bit": {}}]', [1]);
    expect(bitmarkState.wasm.jsonBitStarts).toBeUndefined();
  });

  // @awa-test: PLAN-020-Step3 (typed XML keeps the positions its conversion read)
  it('stores the positions typed XML was read with', () => {
    bitmarkState.setEditedXml('xmlNiso', '<bit/>\n<bit/>', undefined, [0, 7]);
    expect(bitmarkState.xmlNiso.xmlBitStarts).toEqual([0, 7]);
  });

  it('stores the HTML positions with the HTML, and forgets them for typed HTML', () => {
    bitmarkState.setTableHtml('<a/>\n<b/>', undefined, 0, [0, 5]);
    expect(bitmarkState.tableHtml.htmlBitStarts).toEqual([0, 5]);
    // A failed conversion keeps the last good HTML, and its positions.
    bitmarkState.setTableHtml(undefined, new Error('boom'), 0, undefined);
    expect(bitmarkState.tableHtml.htmlBitStarts).toEqual([0, 5]);
    // Flow A: the user's HTML is stored without positions.
    bitmarkState.setTableHtml('<a/>', undefined, undefined);
    expect(bitmarkState.tableHtml.htmlBitStarts).toBeUndefined();
  });

  it('stores the XML positions with the XML, and forgets them for typed XML', () => {
    bitmarkState.setXml('xmlNiso', '<bit/><bit/>', undefined, 0, [0, 6]);
    expect(bitmarkState.xmlNiso.xmlBitStarts).toEqual([0, 6]);
    bitmarkState.setEditedXml('xmlNiso', '<bit/>', undefined);
    expect(bitmarkState.xmlNiso.xmlBitStarts).toBeUndefined();
  });

  it('stores the text positions with the text', () => {
    bitmarkState.setText('one\ntwo', undefined, 0, [0, 4]);
    expect(bitmarkState.text.textBitStarts).toEqual([0, 4]);
  });
});
