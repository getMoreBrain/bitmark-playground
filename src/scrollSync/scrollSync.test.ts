import type { splitBits as splitBitsFn } from '@gmb/bitmark-parser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../logging/log';
import { uiState } from '../state/uiState';
import { createFakeEditor, LINE_HEIGHT } from '../test/fakeEditor';
import {
  attachScrollSync,
  resetScrollSync,
  setSplitBitsSource,
  splitBitStarts,
} from './scrollSync';

/** `lines` one-character lines; line i starts at offset 2i. */
const textOf = (lines: number) => 'x\n'.repeat(lines - 1) + 'x';
/** A bit every `every` lines. */
const startsEvery = (every: number, lines: number) => {
  const starts: number[] = [];
  for (let line = 0; line < lines; line += every) starts.push(line * 2);
  return starts;
};

// bitmark: 100 lines, a bit every 10 lines (bit tops 0, 100, 200, …).
// output: 200 lines, a bit every 20 lines (bit tops 0, 200, 400, …).
const setup = () => {
  const bitmark = createFakeEditor(textOf(100));
  const output = createFakeEditor(textOf(200));
  let outputStarts = startsEvery(20, 200);
  const bitmarkSync = attachScrollSync(bitmark.editor, 'bitmark', () => startsEvery(10, 100));
  const outputSync = attachScrollSync(output.editor, 'output', () => outputStarts);
  return {
    bitmark,
    output,
    bitmarkSync,
    outputSync,
    setOutputStarts: (next: number[]) => {
      outputStarts = next;
    },
  };
};

describe('attachScrollSync', () => {
  beforeEach(() => {
    resetScrollSync();
    uiState.setLinkScroll(true);
  });
  afterEach(() => uiState.setLinkScroll(true));

  // @awa-test: PLAN-018-Step6 (the follower follows the leader, by bit)
  it('keeps the same bit at the top of the follower', () => {
    const { bitmark, output } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT); // bit 1's top
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    bitmark.userScroll(35 * LINE_HEIGHT); // half-way through bit 3
    expect(output.editor.getScrollTop()).toBe(70 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-018-Step6 (the echo does not bounce back)
  it('does not take its own scroll of the follower as the user', () => {
    const { bitmark, output } = setup();
    const setBitmarkTop = vi.spyOn(bitmark.editor, 'setScrollTop');
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    // Only the user's own call; the coordinator never scrolled the leader.
    expect(setBitmarkTop).toHaveBeenCalledTimes(1);
  });

  // @awa-test: PLAN-018-Step6 (a user scroll on the follower makes it lead)
  it('lets the follower lead when the user scrolls it', () => {
    const { bitmark, output } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    output.userScroll(40 * LINE_HEIGHT); // output bit 2's top
    expect(bitmark.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-018-Step6 (a follower content change re-syncs it)
  it('re-syncs the follower when its content changes', () => {
    const { bitmark, output, setOutputStarts } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    // The output is rebuilt: now a bit every 30 lines.
    setOutputStarts(startsEvery(30, 200));
    output.setValue(textOf(200) + '\n');
    expect(output.editor.getScrollTop()).toBe(30 * LINE_HEIGHT);
    expect(bitmark.editor.getScrollTop()).toBe(10 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-018-Step6 (the pane being typed in leads)
  it('keeps the pane being typed in as the leader', () => {
    const { bitmark, output } = setup();
    output.userScroll(40 * LINE_HEIGHT);
    bitmark.setFocus(true);
    bitmark.setValue(textOf(100));
    expect(bitmark.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    bitmark.userScroll(30 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(60 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-018-Step6 (a newly mounted pane lands on the matching bit)
  it('syncs a pane as it mounts (a tab switch)', () => {
    const bitmark = createFakeEditor(textOf(100));
    attachScrollSync(bitmark.editor, 'bitmark', () => startsEvery(10, 100));
    bitmark.userScroll(50 * LINE_HEIGHT);
    const output = createFakeEditor(textOf(200));
    attachScrollSync(output.editor, 'output', () => startsEvery(20, 200));
    expect(output.editor.getScrollTop()).toBe(100 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-018-Step6 (nothing happens with linking off)
  it('does nothing with linkScroll off', () => {
    const { bitmark, output } = setup();
    uiState.setLinkScroll(false);
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(0);
  });

  // @awa-test: PLAN-018-Step6 (turning linking on re-syncs)
  it('re-syncs when linkScroll is switched back on', async () => {
    const { bitmark, output } = setup();
    uiState.setLinkScroll(false);
    bitmark.userScroll(10 * LINE_HEIGHT);
    // Valtio batches notifications: let "off" land before "on", as clicks do.
    await new Promise((resolve) => setTimeout(resolve, 0));
    uiState.setLinkScroll(true);
    await vi.waitFor(() => expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT));
  });

  // @awa-test: PLAN-018-Step6 (dispose detaches)
  it('detaches on dispose', () => {
    const { bitmark, output, outputSync } = setup();
    outputSync.dispose();
    expect(output.listenerCount()).toBe(0);
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(0);
  });

  it('is proportional while a pane has no bit positions', () => {
    const bitmark = createFakeEditor(textOf(100)); // scrolls 0…950
    const output = createFakeEditor(textOf(200)); // scrolls 0…1950
    attachScrollSync(bitmark.editor, 'bitmark', () => []);
    attachScrollSync(output.editor, 'output', () => startsEvery(20, 200));
    bitmark.userScroll(475);
    expect(output.editor.getScrollTop()).toBe(975);
  });
});

describe('splitBitStarts', () => {
  beforeEach(() => resetScrollSync());

  const slice = (start: number | undefined) =>
    ({ index: 0, start, end: 0, byteStart: 0, byteEnd: 0, source: '' }) as ReturnType<
      typeof splitBitsFn
    >[number];

  it('has no starts until the parser is loaded', () => {
    expect(splitBitStarts(createFakeEditor('[.article]').editor)).toEqual([]);
  });

  // @awa-test: PLAN-018-Step1 (splitBits start, once per content version)
  it("takes each slice's start, once per content version", () => {
    const source = vi.fn(() => [slice(0), slice(12)]) as unknown as typeof splitBitsFn;
    setSplitBitsSource(source);
    const fake = createFakeEditor('[.article]\n\n[.article]');
    expect(splitBitStarts(fake.editor)).toEqual([0, 12]);
    expect(splitBitStarts(fake.editor)).toEqual([0, 12]);
    expect(source).toHaveBeenCalledTimes(1);
    fake.setValue('[.article]');
    splitBitStarts(fake.editor);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('ignores slices without a start (an engine older than parser PLAN-221)', () => {
    setSplitBitsSource((() => [slice(undefined), slice(undefined)]) as typeof splitBitsFn);
    expect(splitBitStarts(createFakeEditor('[.article]').editor)).toEqual([]);
  });

  it('warns once per engine when its slices have no start', () => {
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    setSplitBitsSource((() => [slice(undefined)]) as typeof splitBitsFn);
    splitBitStarts(createFakeEditor('[.article]').editor);
    splitBitStarts(createFakeEditor('[.chapter]').editor);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
