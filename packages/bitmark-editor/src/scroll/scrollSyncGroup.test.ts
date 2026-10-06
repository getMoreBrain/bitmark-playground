import { describe, expect, it, vi } from 'vitest';

import { createFakeEditor, LINE_HEIGHT } from '../testing/fakeScrollEditor';
import { createScrollSyncGroup } from './scrollSyncGroup';

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
  const group = createScrollSyncGroup();
  const bitmark = createFakeEditor(textOf(100));
  const output = createFakeEditor(textOf(200));
  let outputStarts = startsEvery(20, 200);
  const bitmarkMember = group.join(bitmark.editor, () => startsEvery(10, 100));
  const outputMember = group.join(output.editor, () => outputStarts);
  return {
    group,
    bitmark,
    output,
    bitmarkMember,
    outputMember,
    setOutputStarts: (next: number[]) => {
      outputStarts = next;
    },
  };
};

describe('createScrollSyncGroup (PLAN-018 rules, two members)', () => {
  // @awa-test: PLAN-023-Step5 (the follower follows the leader, by bit)
  it('keeps the same bit at the top of the follower', () => {
    const { bitmark, output } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    bitmark.userScroll(35 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(70 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (the echo does not bounce back)
  it('does not take its own scroll of a follower as the user', () => {
    const { bitmark, output } = setup();
    const setBitmarkTop = vi.spyOn(bitmark.editor, 'setScrollTop');
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    expect(setBitmarkTop).toHaveBeenCalledTimes(1);
  });

  // @awa-test: PLAN-023-Step5 (a user scroll on a follower makes it lead)
  it('lets the follower lead when the user scrolls it', () => {
    const { bitmark, output } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    output.userScroll(40 * LINE_HEIGHT);
    expect(bitmark.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (a follower content change re-syncs it)
  it('re-syncs the follower when its content changes', () => {
    const { bitmark, output, setOutputStarts } = setup();
    bitmark.userScroll(10 * LINE_HEIGHT);
    setOutputStarts(startsEvery(30, 200));
    output.setValue(textOf(200) + '\n');
    expect(output.editor.getScrollTop()).toBe(30 * LINE_HEIGHT);
    expect(bitmark.editor.getScrollTop()).toBe(10 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (the pane being typed in leads)
  it('keeps the pane being typed in as the leader', () => {
    const { bitmark, output } = setup();
    output.userScroll(40 * LINE_HEIGHT);
    bitmark.setFocus(true);
    bitmark.setValue(textOf(100));
    expect(bitmark.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    bitmark.userScroll(30 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(60 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (a joining member lands on the matching bit)
  it('syncs a member as it joins (a tab switch)', () => {
    const group = createScrollSyncGroup();
    const bitmark = createFakeEditor(textOf(100));
    group.join(bitmark.editor, () => startsEvery(10, 100));
    bitmark.userScroll(50 * LINE_HEIGHT);
    const output = createFakeEditor(textOf(200));
    group.join(output.editor, () => startsEvery(20, 200));
    expect(output.editor.getScrollTop()).toBe(100 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (dispose detaches)
  it('detaches on dispose', () => {
    const { group, bitmark, output, outputMember } = setup();
    outputMember.dispose();
    expect(output.listenerCount()).toBe(0);
    expect(group.members()).toHaveLength(1);
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(0);
  });

  it('is proportional while a member has no bit positions', () => {
    const group = createScrollSyncGroup();
    const bitmark = createFakeEditor(textOf(100));
    const output = createFakeEditor(textOf(200));
    group.join(bitmark.editor, () => []);
    group.join(output.editor, () => startsEvery(20, 200));
    bitmark.userScroll(475);
    expect(output.editor.getScrollTop()).toBe(975);
  });
});

describe('createScrollSyncGroup (N members, per-member linking, PLAN-022 D9)', () => {
  // @awa-test: PLAN-023-Step5 (three or more: the scrolled one leads, all others follow)
  it('makes every linked member follow the one the user scrolls', () => {
    const { group, bitmark, output } = setup();
    const third = createFakeEditor(textOf(400));
    group.join(third.editor, () => startsEvery(40, 400));
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    expect(third.editor.getScrollTop()).toBe(40 * LINE_HEIGHT);
    third.userScroll(80 * LINE_HEIGHT);
    expect(bitmark.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(40 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (a member out of the linking scrolls alone, both ways)
  it('leaves an unlinked member alone, and it does not lead', () => {
    const { bitmark, output, outputMember } = setup();
    outputMember.setLinked(false);
    bitmark.userScroll(10 * LINE_HEIGHT);
    expect(output.editor.getScrollTop()).toBe(0);
    output.userScroll(40 * LINE_HEIGHT);
    expect(bitmark.editor.getScrollTop()).toBe(10 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (re-linking follows the leader)
  it('re-syncs a member as it is linked again', () => {
    const { bitmark, output, outputMember } = setup();
    outputMember.setLinked(false);
    bitmark.userScroll(10 * LINE_HEIGHT);
    outputMember.setLinked(true);
    expect(output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (a member can join unlinked)
  it('lets a member join unlinked', () => {
    const group = createScrollSyncGroup();
    const a = createFakeEditor(textOf(100));
    const b = createFakeEditor(textOf(200));
    group.join(a.editor, () => startsEvery(10, 100));
    a.userScroll(10 * LINE_HEIGHT);
    const member = group.join(b.editor, () => startsEvery(20, 200), { linked: false });
    expect(member.linked).toBe(false);
    expect(b.editor.getScrollTop()).toBe(0);
  });

  // @awa-test: PLAN-023-Step5 (no members linked: nothing happens)
  it('does nothing when every member is unlinked', () => {
    const { bitmark, output, bitmarkMember, outputMember } = setup();
    bitmarkMember.setLinked(false);
    outputMember.setLinked(false);
    bitmark.userScroll(10 * LINE_HEIGHT);
    output.userScroll(30 * LINE_HEIGHT);
    expect(bitmark.editor.getScrollTop()).toBe(10 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (the leader leaving hands over)
  it('hands the lead on when the leader leaves', () => {
    const { group, bitmark, output, bitmarkMember } = setup();
    const third = createFakeEditor(textOf(400));
    group.join(third.editor, () => startsEvery(40, 400));
    bitmark.userScroll(10 * LINE_HEIGHT);
    bitmarkMember.dispose();
    output.userScroll(40 * LINE_HEIGHT);
    expect(third.editor.getScrollTop()).toBe(80 * LINE_HEIGHT);
  });

  // @awa-test: PLAN-023-Step5 (two groups are independent)
  it('keeps two groups independent', () => {
    const one = setup();
    const two = setup();
    one.bitmark.userScroll(10 * LINE_HEIGHT);
    expect(one.output.editor.getScrollTop()).toBe(20 * LINE_HEIGHT);
    expect(two.output.editor.getScrollTop()).toBe(0);
  });
});
