import { describe, expect, it, vi } from 'vitest';

import type { Monaco } from '../monaco/types';
import { createFakeEditor } from '../testing/fakeScrollEditor';
import { attachBitMarkers } from './bitMarkers';

const monaco = { editor: { TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 } } } as unknown as Monaco;

const TEXT = 'first\nsecond\nthird';

describe('attachBitMarkers', () => {
  // @awa-test: PLAN-018-Step4 (pinned when the texts are equal)
  it('pins the starts when the editor shows exactly that text', () => {
    const fake = createFakeEditor(TEXT);
    const onChange = vi.fn();
    const markers = attachBitMarkers(monaco, fake.editor, onChange);
    markers.pin(TEXT, [0, 6, 13]);
    expect(markers.bitStarts()).toEqual([0, 6, 13]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // @awa-test: PLAN-018-Step4 (untouched while the user edits)
  it('keeps the markers when the text differs and the editor has focus', () => {
    const fake = createFakeEditor(TEXT);
    const markers = attachBitMarkers(monaco, fake.editor, () => {});
    markers.pin(TEXT, [0, 6]);
    fake.setFocus(true);
    markers.pin('something else', [0]);
    expect(markers.bitStarts()).toEqual([0, 6]);
  });

  // @awa-test: PLAN-018-Step4 (typed text: no positions, nothing changes)
  it('keeps the markers for text the user typed (no starts)', () => {
    const fake = createFakeEditor(TEXT);
    const onChange = vi.fn();
    const markers = attachBitMarkers(monaco, fake.editor, onChange);
    markers.pin(TEXT, [0, 6]);
    markers.pin(TEXT, undefined);
    expect(markers.bitStarts()).toEqual([0, 6]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // @awa-test: PLAN-018-Step4 (cleared when the pane shows other text, e.g. an error)
  it('clears the markers when the editor shows other text without focus', () => {
    const fake = createFakeEditor(TEXT);
    const onChange = vi.fn();
    const markers = attachBitMarkers(monaco, fake.editor, onChange);
    markers.pin(TEXT, [0, 6]);
    fake.setValue('error: boom');
    markers.pin(TEXT, [0, 6]);
    expect(markers.bitStarts()).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('reads the markers back in order', () => {
    const fake = createFakeEditor(TEXT);
    const markers = attachBitMarkers(monaco, fake.editor, () => {});
    markers.pin(TEXT, [13, 0, 6]);
    expect(markers.bitStarts()).toEqual([0, 6, 13]);
  });

  it('clears on dispose', () => {
    const fake = createFakeEditor(TEXT);
    const markers = attachBitMarkers(monaco, fake.editor, () => {});
    markers.pin(TEXT, [0, 6]);
    markers.dispose();
    expect(fake.decorations()).toEqual([]);
  });
});
