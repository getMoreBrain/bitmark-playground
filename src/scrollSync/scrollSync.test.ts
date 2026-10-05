// The playground's adapter over the lib scroll group (PLAN-021 Step 5). The
// group's own rules are tested in src/lib/scroll.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uiState } from '../state/uiState';
import { createFakeEditor, LINE_HEIGHT } from '../test/fakeEditor';
import { joinScrollSync, resetScrollSync } from './scrollSync';

const textOf = (lines: number) => 'x\n'.repeat(lines - 1) + 'x';
const startsEvery = (every: number, lines: number) => {
  const starts: number[] = [];
  for (let line = 0; line < lines; line += every) starts.push(line * 2);
  return starts;
};

const setup = () => {
  const bitmark = createFakeEditor(textOf(100));
  const output = createFakeEditor(textOf(200));
  joinScrollSync(bitmark.editor, () => startsEvery(10, 100));
  joinScrollSync(output.editor, () => startsEvery(20, 200));
  return { bitmark, output };
};

describe('joinScrollSync (the playground group)', () => {
  beforeEach(() => {
    resetScrollSync();
    uiState.setLinkScroll(true);
  });
  afterEach(() => uiState.setLinkScroll(true));

  // @awa-test: PLAN-018-Step6 (the follower follows the leader, by bit)
  it('links the bitmark editor and the output pane by bit', () => {
    const { bitmark, output } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-018-Step6 (nothing happens with linking off)
  it('joins unlinked while "Link scrolling" is off', () => {
    uiState.setLinkScroll(false);
    const { bitmark, output } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(0);
  });

  // @awa-test: PLAN-018-Step6 (turning linking off unlinks; on re-syncs)
  it('unlinks every member when switched off, and re-syncs when switched on', async () => {
    const { bitmark, output } = setup();
    uiState.setLinkScroll(false);
    // Valtio batches notifications: let "off" land before scrolling, as clicks do.
    await new Promise((resolve) => setTimeout(resolve, 0));
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(0);
    uiState.setLinkScroll(true);
    await vi.waitFor(() => expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT));
  });
});
