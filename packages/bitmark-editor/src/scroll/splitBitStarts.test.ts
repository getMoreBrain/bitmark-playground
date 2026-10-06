import { describe, expect, it, vi } from 'vitest';

import type { BitmarkEngine } from '../engine/types';
import { createFakeEditor } from '../testing/fakeScrollEditor';
import { createSplitBitStarts } from './splitBitStarts';

const slice = (start: number | undefined) => ({
  index: 0,
  start,
  end: 0,
  byteStart: 0,
  byteEnd: 0,
  source: '',
});
const engineWith = (splitBits: (text: string) => Promise<unknown>) =>
  ({ splitBits: vi.fn(splitBits) }) as unknown as BitmarkEngine;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('createSplitBitStarts (PLAN-022 D14)', () => {
  // @awa-test: PLAN-023-Step5 (no starts until an engine is there)
  it('has no starts without an engine', async () => {
    const split = createSplitBitStarts(
      createFakeEditor('[.article]').editor,
      () => undefined,
      vi.fn(),
    );
    await flush();
    expect(split.bitStarts()).toEqual([]);
  });

  // @awa-test: PLAN-023-Step5 (each slice's start, after each change; onChange fires)
  it("takes each slice's start, re-splits after a change and reports it", async () => {
    const engine = engineWith(async (text) =>
      text.includes('\n') ? [slice(0), slice(12)] : [slice(0)],
    );
    const onChange = vi.fn();
    const fake = createFakeEditor('[.article]');
    const split = createSplitBitStarts(fake.editor, () => engine, onChange);
    await flush();
    expect(split.bitStarts()).toEqual([0]);
    fake.setValue('[.article]\n\n[.article]');
    await flush();
    expect(split.bitStarts()).toEqual([0, 12]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  // @awa-test: PLAN-023-Step5 (a split for an older text is dropped)
  it('drops a split that lands after the text changed', async () => {
    let release!: (v: unknown) => void;
    const engine = engineWith(() => new Promise((r) => (release = r)));
    const fake = createFakeEditor('[.a]');
    const split = createSplitBitStarts(fake.editor, () => engine, vi.fn());
    fake.setValue('[.b]');
    release([slice(99)]);
    await flush();
    expect(split.bitStarts()).not.toContain(99);
  });

  it('ignores slices without a start, and warns once per engine', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = engineWith(async () => [slice(undefined)]);
    const a = createSplitBitStarts(createFakeEditor('[.a]').editor, () => engine, vi.fn());
    createSplitBitStarts(createFakeEditor('[.b]').editor, () => engine, vi.fn());
    await flush();
    expect(a.bitStarts()).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('detaches on dispose', () => {
    const fake = createFakeEditor('[.a]');
    createSplitBitStarts(fake.editor, () => undefined, vi.fn()).dispose();
    expect(fake.listenerCount()).toBe(0);
  });
});
